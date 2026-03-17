/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'myanimelist.net' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: 's4.anilist.co' },
      { protocol: 'https', hostname: 's3.anilist.co' },
      { protocol: 'https', hostname: 's2.anilist.co' },
      { protocol: 'https', hostname: 's1.anilist.co' },
    ],
  },
  webpack: (config) => {
    config.watchOptions ??= {};
    const existing = config.watchOptions.ignored ?? [];
    const ignoredList = [...(Array.isArray(existing) ? existing : [existing])];

    const systemFiles = new Set([
      'c:\\dumpstack.log.tmp',
      'c:\\hiberfil.sys',
      'c:\\pagefile.sys',
      'c:\\swapfile.sys',
    ]);

    const existingFn = typeof existing === 'function' ? existing : null;

    // Ignore Windows system files that can trigger watchpack lstat errors.
    config.watchOptions.ignored = (path) => {
      const normalized = String(path).toLowerCase();
      if (systemFiles.has(normalized)) return true;
      if (existingFn) return existingFn(path);
      if (ignoredList.length > 0)
        return ignoredList.some((entry) => {
          if (entry instanceof RegExp) return entry.test(path);
          if (typeof entry === 'string') return normalized.includes(entry.toLowerCase());
          return false;
        });
      return false;
    };

    return config;
  },
};

module.exports = nextConfig;
