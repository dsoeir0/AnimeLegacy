import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import Layout from '../layout/Layout';
import Button from './Button';
import styles from './ComingSoon.module.css';

export default function ComingSoon({
  eyebrow = 'ROADMAP',
  title,
  description,
  bullets = [],
  primaryHref = '/',
  primaryLabel = 'Back to home',
  metaDescription,
}) {
  return (
    <Layout title={`${title} · AnimeLegacy`} description={metaDescription || description}>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <Sparkles size={28} strokeWidth={1.75} />
          </div>
          <div className={styles.eyebrow}>{eyebrow}</div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.body}>{description}</p>
          {bullets.length ? (
            <ul className={styles.bullets}>
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          <div className={styles.actions}>
            <Link href={primaryHref}>
              <Button variant="primary" size="md">
                {primaryLabel}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
