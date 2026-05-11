export const toFivePoint = (score10) => {
  if (typeof score10 !== 'number' || !Number.isFinite(score10)) return null;
  if (score10 <= 0) return null;
  return score10 / 2;
};

export const formatFivePoint = (score10, precision = 1) => {
  const v = toFivePoint(score10);
  return v === null ? null : v.toFixed(precision);
};
