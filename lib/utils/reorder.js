export const mergeReorderedSlice = (full, slice) => {
  const head = slice.filter((id) => full.includes(id));
  const tail = full.filter((id) => !head.includes(id));
  return [...head, ...tail];
};
