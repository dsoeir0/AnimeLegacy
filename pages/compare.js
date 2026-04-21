import ComingSoon from '../components/ui/ComingSoon';

export default function ComparePage() {
  return (
    <ComingSoon
      eyebrow="SOCIAL · ROADMAP"
      title="Compare lists — soon."
      description="See what you and a friend have both watched, what they loved and you missed, and the overlap between your taste profiles."
      bullets={[
        'Diff two users’ lists side by side',
        'Highlight titles only one of you has scored',
        'Spot shared favorites and blind spots',
      ]}
      primaryHref="/my-list"
      primaryLabel="Back to my list"
      metaDescription="Compare your anime list with friends — coming soon."
    />
  );
}
