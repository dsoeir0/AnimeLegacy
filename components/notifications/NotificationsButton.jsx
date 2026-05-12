import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { translate } from 'react-switch-lang';
import useAuth from '../../hooks/useAuth';
import useNotifications from '../../hooks/useNotifications';
import NotificationsPanel from './NotificationsPanel';
import styles from './NotificationsButton.module.css';

function NotificationsButton({ variant = 'desktop', t }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const {
    notifications,
    unreadCount,
    loading,
    ensureData,
    markAllRead,
    clearAll,
  } = useNotifications(user?.uid);

  useEffect(() => {
    if (!open) return undefined;
    ensureData();
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, ensureData]);

  const btnClass = variant === 'mobile' ? styles.btnMobile : styles.btnDesktop;

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={btnClass}
        aria-label={t('header.notifications')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={16} strokeWidth={2} />
        {unreadCount > 0 ? (
          <span className={styles.badge} aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className={styles.dropdown}>
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            loading={loading}
            onClose={() => setOpen(false)}
            onMarkAllRead={markAllRead}
            onClearAll={clearAll}
          />
        </div>
      ) : null}
    </div>
  );
}

export default translate(NotificationsButton);
