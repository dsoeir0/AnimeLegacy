import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { getPersonById, getPersonAnime, getPersonVoices } from '../../lib/services/jikan';
import styles from './[id].module.css';

const personImage = (person) =>
  person?.images?.jpg?.image_url ||
  person?.images?.webp?.image_url ||
  '/logo_no_text.png';

const animeImage = (anime) =>
  anime?.images?.webp?.image_url ||
  anime?.images?.jpg?.image_url ||
  '/logo_no_text.png';

const characterImage = (character) =>
  character?.images?.webp?.image_url ||
  character?.images?.jpg?.image_url ||
  '/logo_no_text.png';

function VoiceActorDetailPage({ person, animeEntries, voiceEntries, t }) {
  const [showAllAnime, setShowAllAnime] = useState(false);
  const [showAllRoles, setShowAllRoles] = useState(false);
  if (!person) {
    return (
      <Layout title="AnimeLegacy · Voice actor">
        <div className={styles.page}>
          <div className={styles.empty}>
            <h1>{t('errors.notFound')}</h1>
            <p>{t('voice.notFoundBody')}</p>
            <Link href="/voices">
              <Button variant="primary" size="md">{t('actions.backToVoices')}</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const imageUrl = personImage(person);
  const aboutLines = (person.about || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const visibleAnime = showAllAnime ? animeEntries : animeEntries.slice(0, 8);
  const visibleRoles = showAllRoles ? voiceEntries : voiceEntries.slice(0, 12);

  return (
    <Layout
      title={`${person.name || 'Voice actor'} · AnimeLegacy`}
      description={t('voice.metaDesc', { name: person.name || 'Voice actor' })}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroImage}>
            <Image
              src={imageUrl}
              alt={person.name || 'Voice actor'}
              fill
              sizes="(max-width: 900px) 100vw, 300px"
              className={styles.heroImg}
              priority
            />
          </div>
          <div className={styles.heroBody}>
            <div className={styles.eyebrow}>{t('voice.eyebrow')}</div>
            <h1 className={styles.title}>{person.name || t('status.unknown')}</h1>
            {person.family_name || person.given_name ? (
              <div className={styles.subTitle}>
                {[person.family_name, person.given_name].filter(Boolean).join(' ')}
              </div>
            ) : null}

            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.statLabel}>{t('voice.stats.favorites')}</div>
                <div className={styles.statValue}>
                  {typeof person.favorites === 'number' ? person.favorites.toLocaleString() : '—'}
                </div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>{t('voice.stats.born')}</div>
                <div className={styles.statValueSmall}>
                  {person.birthday ? new Date(person.birthday).toLocaleDateString() : '—'}
                </div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>{t('voice.stats.roles')}</div>
                <div className={styles.statValue}>{voiceEntries.length}</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>{t('voice.stats.appearances')}</div>
                <div className={styles.statValue}>{animeEntries.length}</div>
              </div>
            </div>

            <div className={styles.bioCard}>
              <div className={styles.sectionEyebrow}>{t('voice.biographyEyebrow')}</div>
              {aboutLines.length ? (
                aboutLines.map((line, i) => (
                  <p key={`${line}-${i}`} className={styles.bioText}>{line}</p>
                ))
              ) : (
                <p className={styles.bioText}>{t('voice.biographyMissing')}</p>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.sectionEyebrow}>{t('voice.rolesEyebrow')}</div>
              <h2 className={styles.sectionTitle}>{t('voice.rolesTitle')}</h2>
            </div>
            {voiceEntries.length > 12 ? (
              <Button
                variant="plain"
                size="sm"
                iconRight={ArrowRight}
                onClick={() => setShowAllRoles((p) => !p)}
              >
                {showAllRoles ? t('actions.showLess') : t('actions.viewAll')}
              </Button>
            ) : null}
          </div>
          {visibleRoles.length === 0 ? (
            <p className={styles.sectionEmpty}>{t('voice.noRoles')}</p>
          ) : (
            <div className={styles.rolesGrid}>
              {visibleRoles.map((entry, i) => (
                <Link
                  key={`${entry?.character?.mal_id || i}-${entry?.anime?.mal_id || i}`}
                  href={
                    entry?.character?.mal_id
                      ? `/characters/${entry.character.mal_id}`
                      : entry?.anime?.mal_id
                        ? `/anime/${entry.anime.mal_id}`
                        : '#'
                  }
                  className={styles.roleCard}
                >
                  <Image
                    src={characterImage(entry?.character)}
                    alt={entry?.character?.name || 'Character'}
                    width={60}
                    height={60}
                    className={styles.roleAvatar}
                  />
                  <div className={styles.roleMeta}>
                    <div className={styles.roleName}>
                      {entry?.character?.name || t('status.unknown')}
                    </div>
                    <div className={styles.roleAnime}>
                      {entry?.anime?.title || '—'}
                    </div>
                    {entry?.role ? (
                      <div className={styles.roleTag}>{entry.role}</div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.sectionEyebrow}>{t('voice.filmographyEyebrow')}</div>
              <h2 className={styles.sectionTitle}>{t('voice.filmographyTitle')}</h2>
            </div>
            {animeEntries.length > 8 ? (
              <Button
                variant="plain"
                size="sm"
                iconRight={ArrowRight}
                onClick={() => setShowAllAnime((p) => !p)}
              >
                {showAllAnime ? t('actions.showLess') : t('actions.viewAll')}
              </Button>
            ) : null}
          </div>
          {visibleAnime.length === 0 ? (
            <p className={styles.sectionEmpty}>{t('voice.noFilmography')}</p>
          ) : (
            <div className={styles.animeGrid}>
              {visibleAnime.map((entry, i) => (
                <Link
                  key={`${entry?.anime?.mal_id || i}`}
                  href={entry?.anime?.mal_id ? `/anime/${entry.anime.mal_id}` : '#'}
                  className={styles.animeCard}
                >
                  <div className={styles.animePoster}>
                    <Image
                      src={animeImage(entry?.anime)}
                      alt={entry?.anime?.title || 'Anime'}
                      fill
                      sizes="(max-width: 768px) 45vw, 200px"
                      className={styles.animeImg}
                    />
                    <div className={styles.animeGradient} />
                    {entry?.position ? (
                      <span className={styles.animeRole}>{entry.position}</span>
                    ) : null}
                  </div>
                  <div className={styles.animeTitle}>
                    {entry?.anime?.title || '—'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

export default translate(VoiceActorDetailPage);

export async function getServerSideProps(context) {
  const { id } = context.query;
  const [personRes, animeRes, voicesRes] = await Promise.all([
    getPersonById(id),
    getPersonAnime(id),
    getPersonVoices(id),
  ]);
  return {
    props: {
      person: personRes?.data || null,
      animeEntries: Array.isArray(animeRes?.data) ? animeRes.data : [],
      voiceEntries: Array.isArray(voicesRes?.data) ? voicesRes.data : [],
    },
  };
}
