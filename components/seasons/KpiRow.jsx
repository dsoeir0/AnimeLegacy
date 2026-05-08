import { translate } from 'react-switch-lang';
import styles from './KpiRow.module.css';

function KpiRow({ stats, t }) {
  const periodKpi = stats?.periodKpi;
  return (
    <div className={styles.kpis}>
      <div className={styles.kpi}>
        <div className={styles.kpiLabel}>{t('seasonsPage.kpis.titles')}</div>
        <div className={styles.kpiValue}>{stats.total}</div>
      </div>
      <div className={styles.kpi}>
        <div className={styles.kpiLabel}>{t('seasonsPage.kpis.airing')}</div>
        <div className={styles.kpiValue}>{stats.airing}</div>
      </div>
      <div className={styles.kpi}>
        <div className={styles.kpiLabel}>{t('seasonsPage.kpis.premieres')}</div>
        <div className={styles.kpiValue}>{stats.premieres}</div>
      </div>
      {periodKpi?.kind === 'ended' ? (
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>{t('seasonsPage.kpis.status')}</div>
          <div className={styles.kpiValueText}>{t('seasonsPage.kpis.statusEnded')}</div>
        </div>
      ) : periodKpi?.kind === 'upcoming' ? (
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>{t('seasonsPage.kpis.daysUntilStart')}</div>
          <div className={styles.kpiValue}>{periodKpi.days}</div>
        </div>
      ) : (
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>{t('seasonsPage.kpis.daysUntilEnd')}</div>
          <div className={styles.kpiValue}>{periodKpi?.days ?? 0}</div>
        </div>
      )}
    </div>
  );
}

export default translate(KpiRow);
