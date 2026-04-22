import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '../lib/firebase/client';
import { SUPPORTED_TARGETS } from '../lib/services/mymemory';

export default function useTranslatedSynopsis({
  animeId,
  sourceText,
  lang,
  cacheField = 'synopsisByLang',
}) {
  const [text, setText] = useState(sourceText || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sourceText) {
      setText('');
      return undefined;
    }
    if (!lang || lang === 'en' || !SUPPORTED_TARGETS.has(lang) || !animeId) {
      setText(sourceText);
      return undefined;
    }

    let cancelled = false;
    const { db } = getFirebaseClient();
    const animeRef = db ? doc(db, 'anime', String(animeId)) : null;

    const run = async () => {
      setLoading(true);
      setText(sourceText);

      if (animeRef) {
        try {
          const snapshot = await getDoc(animeRef);
          const cached = snapshot.exists()
            ? snapshot.data()?.[cacheField]?.[lang]
            : null;
          if (!cancelled && cached && typeof cached === 'string' && cached.trim()) {
            setText(cached);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to live translation on any read failure.
        }
      }

      try {
        const response = await fetch('/api/translate-synopsis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sourceText, lang }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const translated = payload?.translated;
        if (cancelled || typeof translated !== 'string' || !translated.trim()) return;
        setText(translated);

        if (animeRef) {
          try {
            await setDoc(
              animeRef,
              { [cacheField]: { [lang]: translated } },
              { merge: true },
            );
          } catch {
            // Writing the cache is best-effort (requires auth; anonymous users skip silently).
          }
        }
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
  }, [animeId, sourceText, lang, cacheField]);

  return { text, loading };
}
