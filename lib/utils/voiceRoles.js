export const yearOfVoiceRole = (entry) => {
  const fromYear = entry?.anime?.year;
  if (Number.isFinite(fromYear)) return fromYear;
  const iso = entry?.anime?.aired?.from;
  if (!iso) return null;
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? y : null;
};

const favouritesOf = (anime) =>
  Number.isFinite(anime?.favourites) ? anime.favourites : 0;

const popularityOf = (anime) =>
  Number.isFinite(anime?.popularity) && anime.popularity > 0
    ? anime.popularity
    : Number.POSITIVE_INFINITY;

export const sortVoiceRolesByPopularity = (entries) =>
  [...entries].sort((a, b) => {
    const fa = favouritesOf(a?.anime);
    const fb = favouritesOf(b?.anime);
    if (fa !== fb) return fb - fa;
    const pa = popularityOf(a?.anime);
    const pb = popularityOf(b?.anime);
    if (pa !== pb) return pa - pb;
    const ya = yearOfVoiceRole(a) ?? 0;
    const yb = yearOfVoiceRole(b) ?? 0;
    return yb - ya;
  });
