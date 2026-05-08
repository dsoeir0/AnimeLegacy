import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import styles from './MultiDropdown.module.css';

export default function MultiDropdown({
  label,
  values,
  options,
  onChange,
  placeholder = 'Any',
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const valueSet = useMemo(
    () => new Set((Array.isArray(values) ? values : []).map(String)),
    [values],
  );

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const selectedLabels = useMemo(() => {
    const labels = options
      .filter((o) => valueSet.has(String(o.value)))
      .map((o) => o.label);
    return labels;
  }, [options, valueSet]);

  const display = (() => {
    if (selectedLabels.length === 0) return placeholder;
    if (selectedLabels.length === 1) return selectedLabels[0];
    if (selectedLabels.length === 2) return selectedLabels.join(' + ');
    return `${selectedLabels[0]} + ${selectedLabels.length - 1}`;
  })();

  const toggle = (value) => {
    const key = String(value);
    const next = new Set(valueSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  };

  return (
    <div className={styles.root} ref={rootRef}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <button
        type="button"
        className={styles.button}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        <span className={styles.value}>{display}</span>
        <ChevronDown size={14} className={styles.caret} aria-hidden="true" />
      </button>
      {open ? (
        <div role="listbox" aria-multiselectable="true" className={styles.menu}>
          {options.map((opt) => {
            const active = valueSet.has(String(opt.value));
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={active}
                className={`${styles.option} ${active ? styles.optionActive : ''}`}
                onClick={() => toggle(opt.value)}
              >
                <span className={styles.checkbox}>
                  {active ? <Check size={11} strokeWidth={3} /> : null}
                </span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
