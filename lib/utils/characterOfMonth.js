export const pickCharacterOfMonth = (pool, now = new Date()) => {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const year = now.getFullYear();
  const month = now.getMonth();
  const index = (year * 12 + month) % pool.length;
  return pool[index];
};

export const pickPrincipalRole = (animeEntries) => {
  if (!Array.isArray(animeEntries) || animeEntries.length === 0) return null;
  const main = animeEntries.find((e) => e?.role === 'Main');
  return main || animeEntries[0];
};

export const pickPrincipalVoice = (voiceEntries) => {
  if (!Array.isArray(voiceEntries) || voiceEntries.length === 0) return null;
  const japanese = voiceEntries.find((v) => v?.language === 'Japanese');
  return japanese || voiceEntries[0];
};
