export const truncateText = (text, max = 240) => {
  if (typeof text !== 'string') return '';
  const cleaned = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.toLowerCase().startsWith('(source'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const cut = slice.lastIndexOf(' ');
  return `${slice.slice(0, cut > Math.floor(max / 2) ? cut : max)}…`;
};

export const firstSentence = (text) => {
  if (typeof text !== 'string') return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const match = cleaned.match(/[^.!?]+[.!?]/);
  return match ? match[0].trim() : cleaned.slice(0, 90);
};
