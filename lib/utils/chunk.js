export const chunk = (items, size) => {
  if (!Array.isArray(items) || items.length === 0 || size <= 0) return [];
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};
