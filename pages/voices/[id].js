import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
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

export default function VoiceActorDetailPage({ person, animeEntries, voiceEntries }) {
  const [showAllAnime, setShowAllAnime] = useState(false);
  const [showAllRoles, setShowAllRoles] = useState(false);
  if (!person) {
    return (
      <Layout title="AnimeLegacy · Voice actor">
        <div className={styles.page}>
          <div className={styles.empty}>
            <h1>Not found</h1>
            <p>This voice actor could not be loaded.</p>
            <Link href="/voices">
              <Button variant="primary" size="md">Back to voices</Button>
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
      description={`${person.name || 'Voice actor'} profile, voice roles, and filmography.`}
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
            <div className={styles.eyebrow}>VOICE ACTOR</div>
            <h1 className={styles.title}>{person.name || 'Unknown'}</h1>
            {person.family_name || person.given_name ? (
              <div className={styles.subTitle}>
                {[person.family_name, person.given_name].filter(Boolean).join(' ')}
              </div>
            ) : null}

            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.statLabel}>FAVORITES</div>
                <div className={styles.statValue}>
                  {typeof person.favorites === 'number' ? person.favorites.toLocaleString() : '—'}
                </div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>BORN</div>
                <div className={styles.statValueSmall}>
                  {person.birthday ? new Date(person.birthday).toLocaleDateString() : '—'}
                </div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>ROLES</div>
                <div className={styles.statValue}>{voiceEntries.length}</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>APPEARANCES</div>
                <div className={styles.statValue}>{animeEntries.length}</div>
              </div>
            </div>

            <div className={styles.bioCard}>
              <div className={styles.sectionEyebrow}>BIOGRAPHY</div>
              {aboutLines.length ? (
                aboutLines.map((line, i) => (
                  <p key={`${line}-${i}`} className={styles.bioText}>{line}</p>
                ))
              ) : (
                <p className={styles.bioText}>Biography unavailable.</p>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.sectionEyebrow}>ROLES</div>
              <h2 className={styles.sectionTitle}>Voiced characters</h2>
            </div>
            {voiceEntries.length > 12 ? (
              <Button
                variant="plain"
                size="sm"
                iconRight={ArrowRight}
                onClick={() => setShowAllRoles((p) => !p)}
              >
                {showAllRoles ? 'Show less' : 'View all'}
              </Button>
            ) : null}
          </div>
          {visibleRoles.length === 0 ? (
            <p className={styles.sectionEmpty}>No voice roles available.</p>
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
                      {entry?.character?.name || 'Unknown'}
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
              <div className={styles.sectionEyebrow}>FILMOGRAPHY</div>
              <h2 className={styles.sectionTitle}>Anime appearances</h2>
            </div>
            {animeEntries.length > 8 ? (
              <Button
                variant="plain"
                size="sm"
                iconRight={ArrowRight}
                onClick={() => setShowAllAnime((p) => !p)}
              >
                {showAllAnime ? 'Show less' : 'View all'}
              </Button>
            ) : null}
          </div>
          {visibleAnime.length === 0 ? (
            <p className={styles.sectionEmpty}>No filmography available.</p>
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
