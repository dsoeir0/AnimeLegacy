import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import styles from './Modal.module.css';

// Portals to body — `<main>` has a lingering `al-rise` transform that would otherwise
// capture position:fixed.
function Modal({
  open,
  onClose,
  labelledBy,
  describedBy,
  backdropImage,
  closeLabel = 'Close',
  children,
  footer,
  size = 'md',
}) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  if (!open || !mounted) return null;

  const sizeClass = size === 'lg' ? styles.modalLg : styles.modalMd;

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={modalRef}
        className={`${styles.modal} ${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
      >
        {backdropImage ? (
          <div className={styles.hero} aria-hidden="true">
            <Image
              src={backdropImage}
              alt=""
              fill
              sizes="(max-width: 600px) 100vw, 600px"
              className={styles.heroImage}
            />
            <div className={styles.heroOverlay} />
          </div>
        ) : null}
        <button
          ref={closeRef}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X size={16} aria-hidden="true" />
        </button>
        <div className={styles.content}>{children}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
