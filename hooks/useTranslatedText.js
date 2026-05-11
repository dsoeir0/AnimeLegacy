import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '../lib/firebase/client';
import { SUPPORTED_TARGETS } from '../lib/services/mymemory';

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
        } catch {}
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
        } catch {}
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
      } catch {} finally {
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
