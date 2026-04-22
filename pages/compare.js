import { translate } from 'react-switch-lang';
import ComingSoon from '../components/ui/ComingSoon';

function ComparePage({ t }) {
  return (
    <ComingSoon
      eyebrow={t('comingSoon.compare.eyebrow')}
      title={t('comingSoon.compare.title')}
      description={t('comingSoon.compare.body')}
      bullets={[
        t('comingSoon.compare.bullet1'),
        t('comingSoon.compare.bullet2'),
        t('comingSoon.compare.bullet3'),
      ]}
      primaryHref="/my-list"
      primaryLabel={t('comingSoon.compare.back')}
      metaDescription={t('comingSoon.compare.meta')}
    />
  );
}

export default translate(ComparePage);
