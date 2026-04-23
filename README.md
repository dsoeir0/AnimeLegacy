# AnimeLegacy

> A personal anime tracker with the visual discipline of a modern editorial product. A spiritual successor to MyAnimeList — search, track, and chronicle every series you watch.

Built with Next.js 14, Firebase, and the Jikan + AniList APIs. Dark-first, typography-led, designed to stay out of your way while you decide what to watch next.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![React](https://img.shields.io/badge/React-18-61DAFB) ![Firebase](https://img.shields.io/badge/Firebase-10-FFCA28) ![License](https://img.shields.io/badge/license-private-lightgrey)

---

## Features

- **Seasonal discovery** — browse current & past seasons, with filters for genre, format, and sort.
- **Personal list** — track what you're watching, planning, completed, on hold, or dropped. Real-time sync via Firestore.
- **Smart progress** — episode counters clamp to totals; airing shows can't be marked "completed" until they finish.
- **Ratings & reviews** — rate 1–5 stars (half-star precision) and write freeform reviews. Split into two focused modals so rating is a 2-second action and review is a dedicated writing surface. Restricted to `watching` / `completed` / `on_hold` / `dropped` statuses.
- **Favorites** — curate up to 10 favorite anime and 10 favorite characters, featured on your profile.
- **MyAnimeList import** — paste your MAL username and pull your full list (every status, progress, score) plus favourite anime and favourite characters in one step. Skip-silent merge leaves existing entries intact, and the 10-per-category favourite cap is honoured.
- **Character & voice actor pages** — biographies, appearances, and cross-linked cast.
- **Profile** — live stats (episodes watched, days spent, mean score), top genres, seasonal progress, and activity feed.
- **Global search** — debounced Jikan search with cover preview, keyboard navigation, and ⌘K shortcut.
- **Auth** — email/password + Google OAuth with password strength rules and account deletion.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (Pages Router) |
| Language | JavaScript (ES2022) |
| Styling | CSS Modules + design tokens (`styles/tokens.css`) |
| UI primitives | Custom (`components/ui/`) + [Lucide React](https://lucide.dev) icons |
| Typography | Space Grotesk (display) · Plus Jakarta Sans (body) · JetBrains Mono (numerics) |
| Auth & DB | Firebase Auth + Firestore |
| Anime data | [Jikan v4](https://jikan.moe) (MyAnimeList) + [AniList GraphQL](https://anilist.gitbook.io) for higher-res covers |
| Analytics | Vercel Analytics |
| Deployment | Vercel |

---

## Quick start

### Prerequisites
- Node.js **20+** (LTS) — pinned in `.nvmrc` / `.node-version`
- [pnpm](https://pnpm.io) 9+ — this project uses pnpm (not npm/yarn)
- A Firebase project (Auth + Firestore enabled)
- **Java 17+** — only required to run the test suite (Firestore emulator). Skip if you only intend to `pnpm dev` / `pnpm build`.

### Install

```bash
pnpm install
```

### Configure environment

Copy `.env.local.example` to `.env.local` and fill in your Firebase credentials. Alternatively, if the project is linked to Vercel, pull them straight from the dashboard:

```bash
pnpm dlx vercel link           # one-time: pick the animelegacy project
pnpm dlx vercel env pull .env.local
```

Manual setup — `.env.local`:

```bash
# Client — public by design (ship to browser, secured by firestore.rules)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Optional — bucket key for `pnpm gen-trans` (MyMemory API).
# With an email the daily quota is 50 000 words/day; anonymous is 5 000.
# MyMemory does not validate this — it is only used as a quota bucket.
MYMEMORY_EMAIL=
```

### Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other scripts

```bash
pnpm build                 # Production build
pnpm start                 # Start production server
pnpm lint                  # Oxlint (project has a zero-error discipline)
pnpm format                # Oxfmt
pnpm test                  # Vitest against the Firestore emulator (needs Java 17+)
pnpm test:watch            # Same, in watch mode
pnpm analyze               # Build with @next/bundle-analyzer — opens treemap
pnpm seed:firestore        # Seed anime catalog (requires service-account JSON)
pnpm gen-trans             # Regenerate pt/es/fr from lang/en.json via MyMemory
```

---

## Project structure

```
AnimeLegacy/
├── components/
│   ├── auth/            # Shared auth page (sign-in / sign-up)
│   ├── cards/           # PosterCard, DetailedCard, HorizontalRow
│   ├── layout/          # Sidebar, Header, Layout shell
│   ├── modals/          # AddToListModal, RatingReviewModal
│   └── ui/              # Button, IconButton, Logo, StatusBadge, etc.
├── hooks/               # useAuth, useMyList, useProfileData, useUserProfile
├── lib/
│   ├── firebase/        # client.js (browser) + admin.js (server)
│   ├── services/        # jikan, anilist, userProfile, userAnime, animeCatalog
│   └── utils/           # anime, season, media, time, cardShape
├── pages/
│   ├── api/             # delete-account
│   ├── anime/[id]       # Anime detail
│   ├── characters/[id]  # Character detail
│   ├── seasons/[year]   # Seasonal browse
│   ├── index.js         # Home
│   ├── my-list.js       # Personal list
│   ├── profile.js       # User profile
│   ├── search.js        # Discover
│   └── sign-in|sign-up|forgot-password|reset-password
├── styles/              # Global tokens + per-page CSS modules
├── tests/               # Vitest suite (runs against Firestore emulator)
├── firestore.rules      # Firestore security rules
├── firestore.indexes.json
├── firebase.json        # Emulator port config
└── next.config.js
```

### Route map

| Route | Description |
|-------|-------------|
| `/` | Home — hero carousel + continue watching + trending rows |
| `/seasons` | Redirects to current year |
| `/seasons/[year]` | Seasonal browse with filters |
| `/anime/[id]` | Anime detail, cast, trailer, add-to-list |
| `/characters/[id]` | Character detail, bio, appearances, voice actors |
| `/search?q=` | Search results (Jikan) |
| `/my-list` | Personal list with tabs, list/grid view |
| `/profile` | Profile stats, favorites, reviews, activity |
| `/movies` | Top rated movies |
| `/sign-in`, `/sign-up` | Auth |
| `/forgot-password`, `/reset-password` | Recovery flow |
| `/privacy` | GDPR rights + account-deletion contact |
| `/api/delete-account` | Self-service erasure endpoint (auto when Admin SDK configured, 503 fallback otherwise) |

---

## Design system

Tokens live in [`styles/tokens.css`](styles/tokens.css). All components consume them via CSS variables.

**Color ramp (dark-first):**
- `--al-ink-0` → `--al-ink-5` — surface layers from deepest bg to borders
- `--al-fg-1` → `--al-fg-4` — foreground ramp from primary text to disabled

**Accents:**
- Primary — cyan/blue gradient (`#6f83ff → #84d9ff`)
- Warm — amber (favorites, ratings)
- Collection — violet (in-list state)
- Semantic — `success` / `danger` / `warn` with soft background variants

**Status tokens** for the 5 watching states (`watching`, `completed`, `plan`, `dropped`, `paused`) each have a dedicated color & badge style.

**Typography scale:** `display-hero` (72px) → `xs` (12px), plus an uppercase-tracked `eyebrow` for section headers. Monospace numerics are used in progress counters, scores, and rankings for rhythm.

**Motion:** `--dur-1` (120ms) → `--dur-4` (420ms), `--ease-standard` (`cubic-bezier(0.2, 0, 0, 1)`). Page transitions use the `al-rise` animation (8px fade-up).

---

## Data flow

```
┌──────────────┐        ┌───────────────────┐
│   Jikan v4   │────────│  /lib/services/   │
└──────────────┘        │  jikan.js         │
                        │                   │────┐
┌──────────────┐        │  anilist.js       │    │
│ AniList GQL  │────────│  (cover upgrade)  │    │
└──────────────┘        └───────────────────┘    │
                                                 ▼
                                         ┌───────────────┐
                                         │  Next.js page │
                                         │  (SSR / CSR)  │
                                         └───────┬───────┘
                                                 │
                        ┌───────────────┐        │
                        │  useMyList    │◄───────┤
                        │  useProfile   │        │
                        │  useAuth      │        │
                        └───────┬───────┘        │
                                │                │
                                ▼                ▼
                        ┌───────────────────────────┐
                        │       Firestore           │
                        │  users/{uid}/list         │
                        │  users/{uid}/anime        │
                        │  users/{uid}/activity     │
                        │  users/{uid}/favoriteChars│
                        │  anime/{id}               │
                        │  usernames/{normalized}   │
                        │  characterStats/{id}      │
                        └───────────────────────────┘
```

- **Jikan** (`api.jikan.moe/v4`) is the main source for anime metadata, characters, and search.
- **AniList GraphQL** supplements poster/banner URLs with higher-resolution imagery. IDs are resolved by MAL ID in batches of 25.
- **Firestore** stores per-user state with real-time `onSnapshot` listeners. Catalog docs are denormalized for offline-friendly views of each user's list.

### In-memory TTL cache

Both external APIs (Jikan + AniList) are wrapped by a shared cache at [`lib/services/_cache.js`](lib/services/_cache.js). Each cached getter has a TTL tuned to how often the underlying data actually changes:

| Service / endpoint | TTL | Reason |
|---|---|---|
| Jikan — anime / character / person detail | 1h | Biographies and metadata are near-static |
| Jikan — `/top/anime` | 15m | Popularity shifts |
| Jikan — `/seasons/{year}/{season}` | 1h | Season lineup is fixed once published |
| Jikan — `/schedules` | 5m | Broadcast times can change day-of |
| Jikan — `/anime?q=` (search) | not cached | Every query is unique |
| AniList — cover/banner per MAL ID | 6h | Cover URLs are effectively immutable |

The cache lives inside each serverless function instance and survives the warm lifetime that Vercel Fluid Compute gives us (minutes–hours). It serves stale data when the origin fails, so a Jikan 429 burst doesn't blank out popular pages. When the deployment scales out horizontally enough that cross-instance coherence matters, the `cached(key, ttlMs, fetcher)` signature is a drop-in replacement slot for Upstash Redis or Vercel KV.

---

## Firestore schema (summary)

```
users/{uid}
  ├─ profile data (username, bio, avatarData, timestamps)
  ├─ list/{animeId}           — lightweight entry
  ├─ anime/{animeId}          — full tracked entry with progress + rating
  ├─ activity/{id}            — activity log for feed
  └─ favoriteCharacters/{id}

anime/{animeId}               — shared catalog cache
usernames/{normalized}        — username uniqueness index
characterStats/{id}           — global character favorite counters
```

Security rules live in [`firestore.rules`](firestore.rules). Key invariants:
- A user can only read/write under their own `users/{uid}` document.
- The favorite limit (10) is enforced in client code; rules protect against direct manipulation.

### Account deletion (GDPR Article 17)

`/privacy` is always available and explains how to request erasure. There are two deletion modes:

- **Self-service (automated)**: requires `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` in Vercel. When present, the Delete account button in the profile edit modal calls `/api/delete-account`, which wipes every subcollection under `users/{uid}`, releases the username reservation, and removes the Firebase Auth user.
- **Manual fallback (current default)**: without those env vars, the API returns `503` and the UI points users at `/privacy` to request removal via email. See [`docs/account-deletion.md`](docs/account-deletion.md) for the operator runbook — what to click, in what order, to stay GDPR-compliant without automation.

---

## Testing

Integration tests run against the Firestore emulator, so bugs that only show up at the rule level are caught — not just client logic mistakes.

```bash
pnpm test           # one-shot run (used by CI)
pnpm test:watch     # watch mode for local work
```

Both commands wrap the run with `firebase emulators:exec`, which starts a throwaway emulator on `127.0.0.1:8080`, runs Vitest, and shuts it down. First run downloads the emulator JAR (~50 MB, cached under `~/.cache/firebase/`).

### What's covered

| File | Scope |
|------|-------|
| `tests/cleanSynopsis.test.js` | Pure regex tests for the MAL/AniList credit stripper (`[Written by …]`, `(Source: …)`). |
| `tests/listTransitions.test.js` | `useMyList` state machine — status normalisation for airing shows, progress clamping, favourite-limit enforcement, activity-label derivation across every transition. |
| `tests/claimUsername.test.js` | Transactional username uniqueness — cross-case collisions, idempotent re-claim, rules-only tests that verify `firestore.rules` forbids impersonation / overwrite / delete even if client logic were buggy. |
| `tests/upsertUserProfile.test.js` | Profile writes — `createdAt` preserved, `usernameLower` derivation, avatar merge semantics, impersonation blocked. |
| `tests/userDataRules.test.js` | Firestore rules for all user-scoped subcollections (`anime`, `list`, `activity`, `favoriteCharacters`) + catalog (`anime/{id}`) + `characterStats/{id}` whitelist. |
| `tests/cache.test.js` | Shared service cache helper — hit/miss behaviour, TTL expiry, stale-on-error fallback. |
| `tests/profileStats.test.js` | Pure profile aggregators (`computeStats`, `computeGenres`). |
| `tests/authErrors.test.js` | Firebase Auth error-code → i18n key mapping. |
| `tests/deleteAccount.test.js` | `/api/delete-account` gatekeeping — 405 / 503 fallback / 401 auth paths. |

### Adding tests

- Tests live under `tests/` and follow a single `*.test.js` convention.
- For integration against the emulator, import `newTestEnv` from `tests/helpers.js` (wraps `@firebase/rules-unit-testing`).
- Functions that depend on Firebase use a DI pattern so tests can pass in an emulator-backed Firestore: e.g. `claimUsernameIn(db, args)` vs the public `claimUsername(args)` that pulls from `getFirebaseClient()`. Prefer extracting a pure helper when the logic doesn't actually need Firestore.
- Test files run **sequentially** (`fileParallelism: false`) because they all share one emulator instance — running in parallel would let one file's `clearFirestore()` wipe another file's mid-test state.

CI enforces the suite alongside lint and build (`.github/workflows/ci.yml`).

---

## Performance & bundle size

There's no hard performance budget yet, but two lightweight signals are in place so regressions don't slip through unnoticed:

### Local — `pnpm analyze`

Runs a production build with `@next/bundle-analyzer` enabled, then opens a treemap in the browser. Good for finding surprising node_modules that snuck in via an npm upgrade.

```bash
pnpm analyze
```

### CI — bundle-size comment on PRs

[`.github/workflows/bundle-size.yml`](.github/workflows/bundle-size.yml) builds both the PR and its base branch, diffs per-route **First Load JS**, and posts a sticky comment on the PR that looks like:

| Route | Size | First Load JS | Δ vs main |
|-------|------|---------------|-----------|
| `/profile` | 10.1 kB | 249 kB | +2.3 kB (+0.9%) |
| `/my-list` | 7.22 kB | 252 kB | +18 kB (+7.7%) 🟡 |

Anything growing more than ±2% gets flagged. There are **no hard gates** — a regression doesn't block merge — but nobody can merge without having seen the number, which is enough in practice.

---

## Deployment

AnimeLegacy deploys to Vercel out of the box.

1. Push to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Add the environment variables from **Quick start**.
4. Deploy.

Password-reset emails are handled by Firebase Authentication — customize the template in the Firebase console and point the action URL to:

```
https://<your-domain>/reset-password
```

See [`docs/email-deliverability.md`](docs/email-deliverability.md) for deliverability tips.

---

## Contributing

This is a personal project, but issues and pull requests are welcome.

Before opening a PR:
- Run `pnpm lint`, `pnpm test`, and `pnpm build` (CI enforces all three).
- Keep CSS in modules (`styles/*.module.css`) and drive colors through the token variables — avoid inline hex values.
- Preserve the Firebase + Jikan boundaries; don't inline external fetches inside components.
- When touching `lib/services/*` or Firestore rules, add or update tests under `tests/` — rules-only tests are especially valuable since they prove security holds even against a buggy client.

---

## Acknowledgements

- **[Jikan](https://jikan.moe)** — the unofficial MyAnimeList API
- **[AniList](https://anilist.co)** — cover & banner imagery
- **[Lucide](https://lucide.dev)** — the icon set used across primitives
- **Fonts** — Space Grotesk, Plus Jakarta Sans, JetBrains Mono (Google Fonts)

---

## License

Private project. All rights reserved.
