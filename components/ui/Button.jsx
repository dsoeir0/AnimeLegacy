import styles from './Button.module.css';

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  children,
  onClick,
  type = 'button',
  fullWidth,
  disabled,
  className = '',
  ...rest
}) {
  const classes = [
    styles.btn,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const iconSize = size === 'lg' ? 18 : 16;

  return (
    <button className={classes} onClick={onClick} disabled={disabled} type={type} {...rest}>
      {Icon ? <Icon size={iconSize} strokeWidth={1.75} /> : null}
      {children}
      {IconRight ? <IconRight size={iconSize} strokeWidth={1.75} /> : null}
    </button>
  );
}
