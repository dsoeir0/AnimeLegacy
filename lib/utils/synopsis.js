// Strips MAL/AniList credit and source tags from synopsis text.
// Handles:
//   [Written by MAL Rewrite]
//   [Written by X]
//   (Source: ANN)
//   (Source: MAL Rewrite, edited)
//   [Source: Funimation]
// Anywhere in the text, case-insensitive. Also normalizes whitespace.

const CREDIT_PATTERN = /\s*[[(][^\])]*?(?:Written by|Source\s*:)[^\])]*?[\])]/gi;

export const cleanSynopsis = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(CREDIT_PATTERN, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
