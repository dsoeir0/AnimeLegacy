import styles from './StatusBadge.module.css';

export const STATUS_META = {
  watching: { label: 'Watching', color: 'var(--al-status-watching)', bg: 'rgba(132,217,255,0.12)' },
  completed: { label: 'Completed', color: 'var(--al-status-completed)', bg: 'rgba(61,214,140,0.12)' },
  plan: { label: 'Plan to watch', color: 'var(--al-status-plan)', bg: 'rgba(165,169,189,0.12)' },
  dropped: { label: 'Dropped', color: 'var(--al-status-dropped)', bg: 'rgba(255,106,91,0.12)' },
  paused: { label: 'On hold', color: 'var(--al-status-paused)', bg: 'rgba(255,182,72,0.12)' },
  on_hold: { label: 'On hold', color: 'var(--al-status-paused)', bg: 'rgba(255,182,72,0.12)' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <span
      className={`${styles.badge} ${styles[`size_${size}`]}`}
      style={{
        color: meta.color,
        background: meta.bg,
        borderColor: `${meta.color}30`,
      }}
    >
      <span className={styles.dot} style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}
