import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Search } from 'lucide-react';
import { translate } from 'react-switch-lang';
import { filterOutHentai } from '../../lib/utils/anime';
import {
  searchAnime,
  searchCharacters,
  searchPeople,
  searchProducers,
} from '../../lib/services/jikan';
import styles from './Header.module.css';

const EMPTY_RESULTS = { anime: [], characters: [], people: [], studios: [] };

function HeaderSearch({ t }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const rootRef = useRef(null);
  const listboxId = 'global-search-results';

  useEffect(() => {
    let isActive = true;
    if (trimmedQuery.length < 2) {
      setResults(EMPTY_RESULTS);
      setIsOpen(false);
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      const [animeRes, charRes, peopleRes, prodRes] = await Promise.all([
        searchAnime(trimmedQuery, 1, 4),
        searchCharacters(trimmedQuery, 1, 4),
        searchPeople(trimmedQuery, 1, 4),
        searchProducers(trimmedQuery, 1, 4),
      ]);
      if (!isActive) return;
      const safeArray = (res) =>
        !res?.error && Array.isArray(res?.data) ? res.data : [];
      setResults({
        anime: filterOutHentai(safeArray(animeRes)),
        characters: safeArray(charRes),
        people: safeArray(peopleRes),
        studios: safeArray(prodRes),
      });
      setIsOpen(true);
      setIsLoading(false);
    }, 350);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  const totalResults =
    results.anime.length +
    results.characters.length +
    results.people.length +
    results.studios.length;

  const close = () => setIsOpen(false);

  return (
    <div className={styles.searchWrap} ref={rootRef}>
      <Search size={16} className={styles.searchIcon} />
      <input
        className={styles.searchInput}
        type="search"
        placeholder={t('header.searchPlaceholder')}
        aria-label={t('header.searchPlaceholder')}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (trimmedQuery.length >= 2) setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsOpen(false);
            e.currentTarget.blur();
            return;
          }
          if (e.key === 'Enter' && trimmedQuery.length >= 2) {
            e.preventDefault();
            setIsOpen(false);
            router.push(`/search?q=${encodeURIComponent(trimmedQuery)}&page=1`);
          }
        }}
      />
      <kbd className={styles.kbd}>⌘K</kbd>
      {isOpen ? (
        <div className={styles.searchResults} role="listbox" id={listboxId}>
          {isLoading ? (
            <div className={styles.searchEmpty}>{t('header.searching')}</div>
          ) : totalResults === 0 ? (
            <div className={styles.searchEmpty}>{t('header.noResults')}</div>
          ) : (
            <>
              {results.anime.length > 0 ? (
                <div className={styles.searchSection}>
                  <div className={styles.searchSectionHead}>
                    {t('header.searchSections.anime')}
                  </div>
                  {results.anime.map((item) => (
                    <Link
                      key={`a-${item.mal_id}`}
                      href={`/anime/${item.mal_id}`}
                      className={styles.searchItem}
                      onClick={close}
                    >
                      <div className={styles.searchThumb}>
                        <Image
                          src={item?.images?.webp?.image_url || item?.images?.jpg?.image_url || '/logo_no_text.png'}
                          alt={item.title}
                          width={40}
                          height={52}
                          sizes="40px"
                          quality={85}
                        />
                      </div>
                      <div className={styles.searchMeta}>
                        <div className={styles.searchTitle}>{item.title}</div>
                        <div className={styles.searchSub}>
                          <span>{item.type || t('header.breadcrumb.anime')}</span>
                          <span>·</span>
                          <span>{item.year || item?.aired?.prop?.from?.year || '—'}</span>
                          <span>·</span>
                          <span>{item.score ? `★ ${item.score}` : t('movies.noRating')}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
              {results.characters.length > 0 ? (
                <div className={styles.searchSection}>
                  <div className={styles.searchSectionHead}>
                    {t('header.searchSections.characters')}
                  </div>
                  {results.characters.map((item) => (
                    <Link
                      key={`c-${item.mal_id}`}
                      href={`/characters/${item.mal_id}`}
                      className={styles.searchItem}
                      onClick={close}
                    >
                      <div className={styles.searchThumb}>
                        <Image
                          src={item?.images?.webp?.image_url || item?.images?.jpg?.image_url || '/logo_no_text.png'}
                          alt={item.name || ''}
                          width={40}
                          height={52}
                          sizes="40px"
                          quality={85}
                        />
                      </div>
                      <div className={styles.searchMeta}>
                        <div className={styles.searchTitle}>{item.name}</div>
                        <div className={styles.searchSub}>
                          <span>{t('header.breadcrumb.character')}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
              {results.people.length > 0 ? (
                <div className={styles.searchSection}>
                  <div className={styles.searchSectionHead}>
                    {t('header.searchSections.voiceActors')}
                  </div>
                  {results.people.map((item) => (
                    <Link
                      key={`p-${item.mal_id}`}
                      href={`/voices/${item.mal_id}`}
                      className={styles.searchItem}
                      onClick={close}
                    >
                      <div className={styles.searchThumb}>
                        <Image
                          src={item?.images?.jpg?.image_url || item?.images?.webp?.image_url || '/logo_no_text.png'}
                          alt={item.name || ''}
                          width={40}
                          height={52}
                          sizes="40px"
                          quality={85}
                        />
                      </div>
                      <div className={styles.searchMeta}>
                        <div className={styles.searchTitle}>{item.name}</div>
                        <div className={styles.searchSub}>
                          <span>{t('header.breadcrumb.voiceActor')}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
              {results.studios.length > 0 ? (
                <div className={styles.searchSection}>
                  <div className={styles.searchSectionHead}>
                    {t('header.searchSections.studios')}
                  </div>
                  {results.studios.map((item) => {
                    const studioName =
                      Array.isArray(item.titles) && item.titles[0]?.title
                        ? item.titles[0].title
                        : item.name || t('status.unknown');
                    return (
                      <Link
                        key={`s-${item.mal_id}`}
                        href={`/studios/${item.mal_id}`}
                        className={styles.searchItem}
                        onClick={close}
                      >
                        <div className={`${styles.searchThumb} ${styles.searchThumbStudio}`}>
                          {studioName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className={styles.searchMeta}>
                          <div className={styles.searchTitle}>{studioName}</div>
                          <div className={styles.searchSub}>
                            <span>{t('header.breadcrumb.studio')}</span>
                            {Number.isFinite(item.count) ? (
                              <>
                                <span>·</span>
                                <span>{item.count} works</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default translate(HeaderSearch);
