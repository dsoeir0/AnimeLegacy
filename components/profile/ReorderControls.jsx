import { ChevronUp, ChevronDown } from 'lucide-react';
import { translate } from 'react-switch-lang';
import styles from './profile.module.css';

const stopBubble = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

function ReorderControls({ canMoveUp, canMoveDown, onMoveUp, onMoveDown, t }) {
  return (
    <div className={styles.reorderControls} onClick={stopBubble}>
      <button
        type="button"
        className={styles.reorderBtn}
        aria-label={t('profile.moveUp')}
        disabled={!canMoveUp}
        onClick={(e) => {
          stopBubble(e);
          onMoveUp();
        }}
      >
        <ChevronUp size={14} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        className={styles.reorderBtn}
        aria-label={t('profile.moveDown')}
        disabled={!canMoveDown}
        onClick={(e) => {
          stopBubble(e);
          onMoveDown();
        }}
      >
        <ChevronDown size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export default translate(ReorderControls);
