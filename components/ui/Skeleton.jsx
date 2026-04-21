import styles from './Skeleton.module.css';

// Leverages the shimmering `.al-skeleton` utility defined in tokens.css.
// Use `variant="poster"` for the common 2:3 anime poster aspect ratio,
// or provide explicit `width` / `height` for custom sizes.
export default function Skeleton({
  variant = 'block',
  width,
  height,
  className = '',
  style = {},
  rounded,
}) {
  const variantClass = styles[`variant_${variant}`] || '';
  const combined = [styles.base, 'al-skeleton', variantClass, className].filter(Boolean).join(' ');
  const finalStyle = {
    ...(width ? { width } : null),
    ...(height ? { height } : null),
    ...(rounded ? { borderRadius: rounded } : null),
    ...style,
  };
  return <div className={combined} style={finalStyle} aria-hidden="true" />;
}

export function SkeletonText({ lines = 1, width, style = {}, className = '' }) {
  return (
    <div className={`${styles.textStack} ${className}`} style={style} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`al-skeleton ${styles.textLine}`}
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : width || '100%' }}
        />
      ))}
    </div>
  );
}
