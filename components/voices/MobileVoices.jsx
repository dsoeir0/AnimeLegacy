import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { nameInitials } from '../../lib/utils/userDisplay';
import styles from './MobileVoices.module.css';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const AVATAR_TONES = [
  styles.toneBlue,
  styles.toneAmber,
  styles.toneViolet,
  styles.toneGold,
  styles.toneTeal,
  styles.tonePink,
];

const toneFor = (id) => {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return AVATAR_TONES[0];
  return AVATAR_TONES[n % AVATAR_TONES.length];
};

const initialsForPerson = (person) =>
  nameInitials(person?.name || person?.family_name || '');

const firstLetterFor = (person) => {
  const source = person?.family_name || person?.name || '';
  const letter = String(source).trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : null;
};

function MobileVoices({ items, totalIndexed, t }) {
  const [letter, setLetter] = useState(null);

  const availableLetters = useMemo(() => {
    const set = new Set();
    for (const p of items) {
      const l = firstLetterFor(p);
      if (l) set.add(l);
    }
    return set;
  }, [items]);

  const visible = useMemo(() => {
    if (!letter) return items;
    return items.filter((p) => firstLetterFor(p) === letter);
  }, [items, letter]);

  return (
    <div className={styles.mobileVoices}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{t('voices.mobileEyebrow')}</span>
        <h1 className={styles.title}>{t('voices.mobileTitle')}</h1>
        <div className={styles.stats}>
          <span>{t('voices.mobileStatsIndexed', { n: totalIndexed.toLocaleString() })}</span>
          <span className={styles.statsDot} />
          <span>{t('voices.mobileStatsShown', { n: visible.length })}</span>
        </div>
      </header>

      <div className={styles.letterStrip} role="tablist">
        {LETTERS.map((l) => {
          const has = availableLetters.has(l);
          const on = l === letter;
          return (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={!has}
              className={`${styles.letter} ${on ? styles.letterActive : ''} ${!has ? styles.letterDisabled : ''}`}
              onClick={() => setLetter(on ? null : l)}
            >
              {l}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>{t('voices.mobileEmpty')}</div>
      ) : (
        <ul className={styles.list}>
          {visible.map((p) => {
            const fans = Number.isFinite(p?.favorites) ? p.favorites : 0;
            const birth = p?.birthday ? new Date(p.birthday).getFullYear() : null;
            const fansLabel = fans
              ? t('voices.mobileFansCount', { n: fans.toLocaleString() })
              : null;
            return (
              <li key={p.mal_id}>
                <Link href={`/voices/${p.mal_id}`} className={styles.row}>
                  <span className={`${styles.avatar} ${toneFor(p.mal_id)}`}>
                    {initialsForPerson(p)}
                  </span>
                  <span className={styles.body}>
                    <span className={styles.name}>{p.name || t('status.unknown')}</span>
                    {p.given_name || p.family_name ? (
                      <span className={styles.altName}>
                        {[p.given_name, p.family_name].filter(Boolean).join(' ')}
                      </span>
                    ) : null}
                    <span className={styles.meta}>
                      {fansLabel}
                      {fansLabel && birth ? <span className={styles.metaDot} /> : null}
                      {birth ? t('voices.mobileBornIn', { y: birth }) : null}
                    </span>
                  </span>
                  <span className={styles.chev}>
                    <ChevronRight size={14} strokeWidth={2} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default translate(MobileVoices);
