# AnimeLegacy

> A personal anime tracker with the visual discipline of a modern editorial product. A spiritual successor to MyAnimeList — search, track, and chronicle every series you watch.

Built with Next.js 14, Firebase, and the Jikan + AniList APIs. Dark-first, typography-led, designed to stay out of your way while you decide what to watch next.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![React](https://img.shields.io/badge/React-18-61DAFB) ![Firebase](https://img.shields.io/badge/Firebase-10-FFCA28) ![License](https://img.shields.io/badge/license-private-lightgrey)

---

## Features

- **Seasonal discovery** — browse current & past seasons, with filters for genre, format, and sort.
- **Personal list** — track what you're watching, planning, completed, on hold, or dropped. Real-time sync via Firestore.
- **Smart progress** — episode counters clamp to totals; airing shows can't be marked "completed" until they finish.
- **Ratings & reviews** — rate 1–5 stars on completed shows, write freeform reviews.
- **Favorites** — curate up to 10 favorite anime and 10 favorite characters, featured on your profile.
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

# Optional — Google Cloud Translate API key for `pnpm gen-trans`
GOOGLE_TRANSLATE_API_KEY=
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
pnpm seed:firestore        # Seed anime catalog (requires service-account JSON)
pnpm gen-trans             # Regenerate pt/es/fr from lang/en.json via Google Translate
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
├── firestore.rules      # Firestore security rules
├── firestore.indexes.json
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
- Run `pnpm lint` and `pnpm build` (CI enforces both).
- Keep CSS in modules (`styles/*.module.css`) and drive colors through the token variables — avoid inline hex values.
- Preserve the Firebase + Jikan boundaries; don't inline external fetches inside components.

---

## Acknowledgements

- **[Jikan](https://jikan.moe)** — the unofficial MyAnimeList API
- **[AniList](https://anilist.co)** — cover & banner imagery
- **[Lucide](https://lucide.dev)** — the icon set used across primitives
- **Fonts** — Space Grotesk, Plus Jakarta Sans, JetBrains Mono (Google Fonts)

---

## License

Private project. All rights reserved.
