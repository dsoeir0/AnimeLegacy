import { useEffect } from 'react';

// Locks page scroll while `active` is true. Reserves room for the missing
// scrollbar so the page doesn't reflow when the lock engages/disengages.
// Multiple concurrent consumers are refcounted via a module-level counter,
// so the last modal to unmount is the one that restores the body style.
let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

const engage = () => {
  if (typeof document === 'undefined') return;
  lockCount += 1;
  if (lockCount > 1) return;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  savedOverflow = document.body.style.overflow;
  savedPaddingRight = document.body.style.paddingRight;
  if (scrollbarWidth > 0) {
    const current = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.paddingRight = `${current + scrollbarWidth}px`;
  }
  document.body.style.overflow = 'hidden';
};

const release = () => {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
};

export const useBodyScrollLock = (active) => {
  useEffect(() => {
    if (!active) return undefined;
    engage();
    return release;
  }, [active]);
};

export default useBodyScrollLock;
