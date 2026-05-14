import { useEffect } from 'react';

// Refcounted; reserves the scrollbar gap to prevent reflow on lock/unlock.
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

const useBodyScrollLock = (active) => {
  useEffect(() => {
    if (!active) return undefined;
    engage();
    return release;
  }, [active]);
};

export default useBodyScrollLock;
