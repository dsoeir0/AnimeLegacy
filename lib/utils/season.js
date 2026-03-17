export const getSeasonFromDate = (date = new Date()) => {
  const month = date.getMonth() + 1;
  if (month >= 1 && month <= 3) return 'winter';
  if (month >= 4 && month <= 6) return 'spring';
  if (month >= 7 && month <= 9) return 'summer';
  return 'fall';
};

export const formatSeasonLabel = (season, year) => {
  if (season) {
    const label = `${season[0].toUpperCase()}${season.slice(1)}`;
    return year ? `${label} ${year}` : label;
  }
  if (year) return `${year}`;
  return 'Unknown';
};
