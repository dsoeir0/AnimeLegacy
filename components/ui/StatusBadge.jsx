import { translate } from 'react-switch-lang';
import styles from './StatusBadge.module.css';

// Note: labels are keys into the translation dictionary; the `label` property
// stays on STATUS_META for backwards compatibility where other code reads it
// directly (e.g. inline meta strings), but the rendered component uses t().
export const STATUS_META = {
  watching: { labelKey: 'status.watching', label: 'Watching', color: 'var(--al-status-watching)', bg: 'rgba(132,217,255,0.12)' },
  completed: { labelKey: 'status.completed', label: 'Completed', color: 'var(--al-status-completed)', bg: 'rgba(61,214,140,0.12)' },
  plan: { labelKey: 'status.plan', label: 'Plan to watch', color: 'var(--al-status-plan)', bg: 'rgba(165,169,189,0.12)' },
  dropped: { labelKey: 'status.dropped', label: 'Dropped', color: 'var(--al-status-dropped)', bg: 'rgba(255,106,91,0.12)' },
  paused: { labelKey: 'status.paused', label: 'On hold', color: 'var(--al-status-paused)', bg: 'rgba(255,182,72,0.12)' },
  on_hold: { labelKey: 'status.onHold', label: 'On hold', color: 'var(--al-status-paused)', bg: 'rgba(255,182,72,0.12)' },
};

function StatusBadge({ status, size = 'sm', t }) {
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
      {t(meta.labelKey)}
    </span>
  );
}

export default translate(StatusBadge);
