import Link from 'next/link';
import {
  Bell,
  BellRing,
  CheckCheck,
  ChevronRight,
  PlayCircle,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from './NotificationsPanel.module.css';

const KIND_META = {
  airingToday: {
    icon: BellRing,
    accentClass: styles.iconAccentLive,
    labelKey: 'notifications.kind.airingToday',
  },
  airingTomorrow: {
    icon: Bell,
    accentClass: styles.iconAccent,
    labelKey: 'notifications.kind.airingTomorrow',
  },
  newEpisode: {
    icon: PlayCircle,
    accentClass: styles.iconAccentSuccess,
    labelKey: 'notifications.kind.newEpisode',
  },
  sequel: {
    icon: Sparkles,
    accentClass: styles.iconAccentWarm,
    labelKey: 'notifications.kind.sequel',
  },
  finished: {
    icon: ChevronRight,
    accentClass: styles.iconAccentMuted,
    labelKey: 'notifications.kind.finished',
  },
};

function NotificationsPanel({
  notifications,
  unreadCount,
  loading,
  onClose,
  onMarkAllRead,
  onClearAll,
  onDismiss,
  t,
}) {
  const isEmpty = !loading && notifications.length === 0;

  return (
    <div className={styles.panel} role="menu">
      <div className={styles.head}>
        <div className={styles.headTitleRow}>
          <span className={styles.headTitle}>{t('notifications.title')}</span>
          {unreadCount > 0 ? (
            <span className={styles.headBadge}>{unreadCount}</span>
          ) : null}
        </div>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.headAction}
            disabled={notifications.every((n) => n.read) || notifications.length === 0}
            onClick={onMarkAllRead}
          >
            <CheckCheck size={12} strokeWidth={2.25} />
            {t('notifications.markAllRead')}
          </button>
          <button
            type="button"
            className={styles.headAction}
            disabled={notifications.length === 0}
            onClick={onClearAll}
          >
            <Trash2 size={12} strokeWidth={2.25} />
            {t('notifications.clearAll')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.status}>{t('notifications.loading')}</div>
      ) : isEmpty ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Bell size={20} strokeWidth={1.5} />
          </span>
          <span className={styles.emptyTitle}>{t('notifications.emptyTitle')}</span>
          <span className={styles.emptyBody}>{t('notifications.emptyBody')}</span>
        </div>
      ) : (
        <ul className={styles.list}>
          {notifications.map((n) => {
            const meta = KIND_META[n.kind] || KIND_META.finished;
            const Icon = meta.icon;
            const subtitle = (() => {
              if (n.kind === 'airingToday') return t('notifications.body.airingToday');
              if (n.kind === 'airingTomorrow') return t('notifications.body.airingTomorrow');
              if (n.kind === 'newEpisode') {
                return t('notifications.body.newEpisode', {
                  n: n.extra?.episodes ?? '',
                });
              }
              if (n.kind === 'sequel') {
                return n.extra?.parentTitle
                  ? t('notifications.body.sequelOf', { title: n.extra.parentTitle })
                  : t('notifications.body.sequelGeneric');
              }
              if (n.kind === 'finished') {
                return t('notifications.body.finished', {
                  n: n.extra?.remaining ?? '',
                });
              }
              return '';
            })();
            return (
              <li key={n.id} className={`${styles.item} ${!n.read ? styles.itemUnread : ''}`}>
                <Link href={n.href} className={styles.itemLink} onClick={onClose}>
                  <span className={`${styles.itemIcon} ${meta.accentClass}`}>
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className={styles.itemBody}>
                    <span className={styles.itemKind}>{t(meta.labelKey)}</span>
                    <span className={styles.itemTitle}>{n.title}</span>
                    {subtitle ? (
                      <span className={styles.itemSubtitle}>{subtitle}</span>
                    ) : null}
                  </span>
                  {!n.read ? <span className={styles.itemDot} aria-hidden="true" /> : null}
                </Link>
                {onDismiss ? (
                  <button
                    type="button"
                    className={styles.itemDismiss}
                    aria-label={t('notifications.dismiss')}
                    title={t('notifications.dismiss')}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDismiss(n.id);
                    }}
                  >
                    <X size={12} strokeWidth={2.25} />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default translate(NotificationsPanel);
