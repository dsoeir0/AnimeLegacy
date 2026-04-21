export default function SeasonsIndex() {
  return null;
}

export async function getServerSideProps() {
  const year = new Date().getFullYear();
  return {
    redirect: { destination: `/seasons/${year}`, permanent: false },
  };
}
