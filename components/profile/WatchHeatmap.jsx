import { memo, useMemo } from 'react';
import { translate } from 'react-switch-lang';
import styles from './profile.module.css';

function WatchHeatmap({ heatmap, title, meta, t }) {
  const cellByKey = useMemo(() => {
    const map = new Map();
    for (const cell of heatmap.cells) {
      map.set(`${cell.week}:${cell.day}`, cell);
    }
    return map;
  }, [heatmap.cells]);

  return (
    <div className={styles.section}>
      <div className={styles.distroHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        <span className={styles.kicker}>{meta}</span>
      </div>
      <div
        className={styles.heatmapGrid}
        style={{
          gridTemplateColumns: `repeat(${heatmap.weeks}, 1fr)`,
          aspectRatio: `${heatmap.weeks} / ${heatmap.days}`,
        }}
        role="img"
      >
        {Array.from({ length: heatmap.weeks * heatmap.days }, (_, idx) => {
          const week = Math.floor(idx / heatmap.days);
          const day = idx % heatmap.days;
          const cell = cellByKey.get(`${week}:${day}`);
          if (!cell) return <span key={idx} className={styles.heatCell} data-level="0" />;
          return (
            <span
              key={cell.key}
              className={styles.heatCell}
              data-level={cell.level}
              data-future={cell.future ? 'true' : 'false'}
              title={`${cell.key}: ${cell.count}`}
            />
          );
        })}
      </div>
      <div className={styles.heatLegend}>
        <span>{t('profile.heatmapLess')}</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <span key={lvl} className={styles.heatCell} data-level={lvl} data-legend="true" />
        ))}
        <span>{t('profile.heatmapMore')}</span>
      </div>
    </div>
  );
}

export default translate(memo(WatchHeatmap));
