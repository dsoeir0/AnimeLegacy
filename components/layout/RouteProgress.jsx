import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import styles from './RouteProgress.module.css';

export default function RouteProgress() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  useEffect(() => {
    const clearIntervalRef = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    const clearHideTimeout = () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const start = () => {
      clearIntervalRef();
      clearHideTimeout();
      setVisible(true);
      setProgress(15);
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 85) return p;
          const remaining = 85 - p;
          return p + Math.max(1, remaining * 0.08);
        });
      }, 200);
    };

    const finish = () => {
      clearIntervalRef();
      setProgress(100);
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 280);
    };

    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', finish);
    router.events.on('routeChangeError', finish);

    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', finish);
      router.events.off('routeChangeError', finish);
      clearIntervalRef();
      clearHideTimeout();
    };
  }, [router.events]);

  return (
    <div
      className={`${styles.track} ${visible ? styles.trackVisible : ''}`}
      aria-hidden="true"
    >
      <div
        className={styles.bar}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
