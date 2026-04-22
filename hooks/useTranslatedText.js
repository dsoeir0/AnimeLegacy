import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '../lib/firebase/client';
import { SUPPORTED_TARGETS } from '../lib/services/mymemory';

// Generic text-translation hook. Used for anime synopses, character
// biographies, and voice-actor biographies — anywhere a chunk of English
// text needs to be shown translated when the user's language isn't English.
//
// Three-layer cache:
//   1. sessionCache — module-level Map. Survives strict-mode double-effect,
//      HMR re-renders, and intra-tab navigation. Anonymous users benefit
//      most here since they can't write to Firestore.
//   2. inflight — module-level Map<key, Promise>. Dedupes concurrent fetches
//      for the same key (two mounts at once share one POST).
//   3. Firestore at `{cacheCollection}/{docId}.{cacheField}.{lang}`. Shared
//      across sessions and users. Requires auth to write; reads are public.
//      Rules for each allowed collection must mirror the `anime/{id}` rule.

const sessionCache = new Map();
const inflight = new Map();

const cacheKey = (collection, docId, cacheField, lang) =>
  `${collection}:${docId}:${cacheField}:${lang}`;

export default function useTranslatedText({
  docId,
  sourceText,
  lang,
  cacheField,
  cacheCollection,
}) {
  const [text, setText] = useState(sourceText || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sourceText) {
      setText('');
      return undefined;
    }
    if (!lang || lang === 'en' || !SUPPORTED_TARGETS.has(lang) || !docId) {
      setText(sourceText);
      return undefined;
    }
    if (!cacheField || !cacheCollection) {
      setText(sourceText);
      return undefined;
    }

    const key = cacheKey(cacheCollection, docId, cacheField, lang);

    if (sessionCache.has(key)) {
      setText(sessionCache.get(key));
      return undefined;
    }

    let cancelled = false;
    const { db } = getFirebaseClient();
    const docRef = db ? doc(db, cacheCollection, String(docId)) : null;

    const fetchAndCache = async () => {
      if (docRef) {
        try {
          const snapshot = await getDoc(docRef);
          const cached = snapshot.exists()
            ? snapshot.data()?.[cacheField]?.[lang]
            : null;
          if (cached && typeof cached === 'string' && cached.trim()) {
            return cached;
          }
        } catch {
          // Fall through to live translation on any read failure.
        }
      }

      const response = await fetch('/api/translate-synopsis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, lang }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const translated = payload?.translated;
      if (typeof translated !== 'string' || !translated.trim()) {
        throw new Error('Empty translation');
      }

      if (docRef) {
        try {
          await setDoc(
            docRef,
            { [cacheField]: { [lang]: translated } },
            { merge: true },
          );
        } catch {
          // Anonymous user or rules rejected the write — sessionCache still covers us.
        }
      }

      return translated;
    };

    const run = async () => {
      setLoading(true);
      setText(sourceText);

      try {
        let promise = inflight.get(key);
        if (!promise) {
          promise = fetchAndCache();
          inflight.set(key, promise);
          promise.finally(() => inflight.delete(key));
        }
        const translated = await promise;
        if (cancelled) return;
        sessionCache.set(key, translated);
        setText(translated);
      } catch {
        // Keep English fallback.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [cacheCollection, docId, sourceText, lang, cacheField]);

  return { text, loading };
}
