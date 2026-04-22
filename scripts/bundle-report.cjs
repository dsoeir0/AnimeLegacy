#!/usr/bin/env node
/*
 * Reads `next build` stdout from stdin and extracts the per-route size table
 * that Next.js prints at the end. Emits JSON keyed by route, with sizes in
 * bytes so diffing is straightforward.
 *
 * Usage:
 *   pnpm build 2>&1 | node scripts/bundle-report.cjs > sizes.json
 */

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  // Strip ANSI colour codes so the regex below works regardless of TTY.
  // eslint-disable-next-line no-control-regex
  const plain = input.replace(/\x1b\[[0-9;]*m/g, '');
  const lines = plain.split('\n');

  const parseSize = (s) => {
    const m = s.match(/([\d.]+)\s*(B|kB|MB)/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    const unit = m[2];
    if (unit === 'B') return Math.round(n);
    if (unit === 'kB') return Math.round(n * 1024);
    if (unit === 'MB') return Math.round(n * 1024 * 1024);
    return null;
  };

  const routes = {};
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    // Route lines look like:
    //   ┌ ƒ /                                      5.56 kB         248 kB
    //   ├ ○ /profile                               10.1 kB         249 kB
    //   ├   /_app                                  0 B             110 kB
    //
    // We require a path starting with `/` and TWO size tokens on the line
    // (size + firstLoad). Lines that are CSS sub-rows or shared-chunk
    // entries only have one size token and are skipped.
    const m = line.match(
      /[├┌└]\s+(?:[ƒ○●]\s+)?(\/[A-Za-z0-9[\]_.\-/]*)\s+([\d.]+\s*(?:B|kB|MB))\s+([\d.]+\s*(?:B|kB|MB))\s*$/,
    );
    if (!m) continue;
    const route = m[1];
    const size = parseSize(m[2]);
    const firstLoad = parseSize(m[3]);
    if (size === null || firstLoad === null) continue;
    routes[route] = { size, firstLoad };
  }

  process.stdout.write(`${JSON.stringify(routes, null, 2)}\n`);
});
