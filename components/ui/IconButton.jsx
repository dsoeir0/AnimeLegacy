import styles from './IconButton.module.css';

export default function IconButton({
  icon: Icon,
  onClick,
  size = 36,
  active,
  tooltip,
  type = 'button',
  className = '',
  disabled,
  ...rest
}) {
  const iconSize = size >= 40 ? 18 : 16;
  return (
    <button
      type={type}
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      disabled={disabled}
      className={`${styles.btn} ${active ? styles.active : ''} ${className}`}
      style={{ width: size, height: size, borderRadius: size >= 40 ? 12 : 10 }}
      {...rest}
    >
      {Icon ? <Icon size={iconSize} strokeWidth={1.75} /> : null}
    </button>
  );
}
