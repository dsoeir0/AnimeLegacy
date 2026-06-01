/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [48, 96, 200, 384],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: 'https', hostname: 'myanimelist.net' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: 's4.anilist.co' },
      { protocol: 'https', hostname: 's3.anilist.co' },
      { protocol: 'https', hostname: 's2.anilist.co' },
      { protocol: 'https', hostname: 's1.anilist.co' },
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
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

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const baseConfig = withBundleAnalyzer(nextConfig);

if (process.env.ANALYZE === 'true') {
  module.exports = baseConfig;
} else {
  const { withSentryConfig } = require('@sentry/nextjs');
  module.exports = withSentryConfig(baseConfig, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    disableSourceMapUpload: !process.env.SENTRY_AUTH_TOKEN,
    hideSourceMaps: true,
  });
}
