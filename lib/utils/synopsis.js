const CREDIT_PATTERN = /\s*[[(][^\])]*?(?:Written by|Source\s*:)[^\])]*?[\])]/gi;

export const cleanSynopsis = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(CREDIT_PATTERN, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
