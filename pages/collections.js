import { translate } from 'react-switch-lang';
import ComingSoon from '../components/ui/ComingSoon';
import MobileCollections from '../components/collections/MobileCollections';

function CollectionsPage({ t }) {
  return (
    <ComingSoon
      eyebrow={t('comingSoon.collections.eyebrow')}
      title={t('comingSoon.collections.title')}
      description={t('comingSoon.collections.body')}
      bullets={[
        t('comingSoon.collections.bullet1'),
        t('comingSoon.collections.bullet2'),
        t('comingSoon.collections.bullet3'),
      ]}
      primaryLabel={t('comingSoon.backHome')}
      metaDescription={t('comingSoon.collections.meta')}
      mobileTitle={t('nav.collections')}
      mobileSlot={<MobileCollections />}
    />
  );
}

export default translate(CollectionsPage);
