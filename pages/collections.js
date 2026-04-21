import ComingSoon from '../components/ui/ComingSoon';

export default function CollectionsPage() {
  return (
    <ComingSoon
      eyebrow="CURATED · ROADMAP"
      title="Collections are coming."
      description="Hand-picked editorial lists — seasons worth revisiting, underrated gems, director retrospectives. Not auto-generated."
      bullets={[
        'Short themed runs of 5–15 titles',
        'Editorial notes on why each entry belongs',
        'Save any collection to your list in one click',
      ]}
      metaDescription="Curated anime collections — coming soon to AnimeLegacy."
    />
  );
}
