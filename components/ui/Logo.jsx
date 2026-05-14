import styles from './Logo.module.css';

export default function Logo({ size = 28, showWordmark = true }) {
  return (
    <div className={styles.wrap}>
      <img
        src="/brand/iris-mark.svg"
        alt=""
        width={size}
        height={size}
        className={styles.mark}
      />
      {showWordmark ? (
        <div className={styles.wordmark}>
          <span className={styles.name}>AnimeLegacy</span>
          <span className={styles.eyebrow}>TRACKER · CHRONICLE</span>
        </div>
      ) : null}
    </div>
  );
}
