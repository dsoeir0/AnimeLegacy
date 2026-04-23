import Link from 'next/link';
import { translate, getLanguage } from 'react-switch-lang';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import PosterCard from '../../components/cards/PosterCard';
import useTranslatedText from '../../hooks/useTranslatedText';
import { getProducerById, getAnimeByProducer } from '../../lib/services/jikan';
import { dedupeByMalId, filterOutHentai } from '../../lib/utils/anime';
import { pickStudioName, studioInitials } from '../../lib/utils/studio';
import styles from './[id].module.css';

function StudioDetailPage({ producer, works, t }) {
  // Translate the raw `about` string via MyMemory, cached under the
  // `studios/{mal_id}.aboutByLang.{lang}` Firestore document. Matches the
  // pattern used by the anime synopsis and character biography flows.
  const currentLang =
    typeof getLanguage === 'function' ? getLanguage() : 'en';
  const { text: translatedAbout } = useTranslatedText({
    docId: producer?.mal_id,
    sourceText: producer?.about || '',
    lang: currentLang,
    cacheField: 'aboutByLang',
    cacheCollection: 'studios',
  });

  if (!producer) {
    return (
      <Layout title="AnimeLegacy · Studio">
        <div className={styles.page}>
          <div className={styles.empty}>
            <h1>{t('errors.notFound')}</h1>
            <p>{t('studio.notFoundBody')}</p>
            <Link href="/studios">
              <Button variant="primary" size="md">{t('actions.backToStudios')}</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }
  const name = pickStudioName(producer);
  const aboutSource = translatedAbout || producer.about || '';
  const aboutLines = aboutSource
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const established = producer.established
    ? new Date(producer.established).getFullYear()
    : null;

  return (
    <Layout
      title={`${name} · AnimeLegacy`}
      description={t('studio.metaDescFallback', { name })}
    >
      <div className={styles.page}>
        <header className={styles.head}>
          <div className={styles.headLeft}>
            <div className={styles.mono}>{studioInitials(name)}</div>
            <div>
              <div className={styles.eyebrow}>{t('studio.eyebrow')}</div>
              <h1 className={styles.title}>{name}</h1>
              <div className={styles.meta}>
                <span>{t('studio.titlesCataloged', { n: producer.count || 0 })}</span>
                {typeof producer.favorites === 'number' ? (
                  <>
                    <span className={styles.dot} />
                    <span>{t('studio.fans', { n: producer.favorites.toLocaleString() })}</span>
                  </>
                ) : null}
                {established ? (
                  <>
                    <span className={styles.dot} />
                    <span>{t('studio.established', { year: established })}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {aboutLines.length ? (
          <section className={styles.aboutSection}>
            <div className={styles.sectionEyebrow}>{t('studio.aboutEyebrow')}</div>
            <div className={styles.aboutCard}>
              {aboutLines.slice(0, 6).map((line, i) => (
                <p key={`${line}-${i}`} className={styles.aboutText}>{line}</p>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.workSection}>
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.sectionEyebrow}>{t('studio.catalogueEyebrow')}</div>
              <h2 className={styles.sectionTitle}>{t('studio.worksBy', { name })}</h2>
            </div>
          </div>
          {works.length === 0 ? (
            <p className={styles.sectionEmpty}>{t('studio.noWorks')}</p>
          ) : (
            <div className={styles.grid}>
              {works.map((anime) => (
                <PosterCard
                  key={anime.mal_id}
                  anime={anime}
                  href={`/anime/${anime.mal_id}`}
                  width="100%"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

export default translate(StudioDetailPage);

export async function getServerSideProps(context) {
  const { id } = context.query;
  const [producerRes, worksRes] = await Promise.all([
    getProducerById(id),
    getAnimeByProducer(id),
  ]);
  const works = Array.isArray(worksRes?.data)
    ? dedupeByMalId(filterOutHentai(worksRes.data))
    : [];
  return {
    props: {
      producer: producerRes?.data || null,
      works,
    },
  };
}
