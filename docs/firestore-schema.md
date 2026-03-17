# Firestore Schema

## Collections

### `usernames/{username}`

Reserved usernames to prevent duplicates.

Fields:

- `uid` (string)
- `username` (string)
- `normalized` (string)
- `createdAt` (timestamp)

### `anime/{animeId}`

Global catalog entry for an anime.

Fields:

- `animeId` (string)
- `title` (string)
- `posterUrl` (string)
- `bannerUrl` (string, optional)
- `year` (number, nullable)
- `season` (string, nullable)
- `type` (string)
- `status` (string, nullable)
- `episodesTotal` (number, nullable)
- `durationMin` (number, nullable)
- `genres` (string[])
- `studios` (string[])
- `malScore` (number, nullable)
- `updatedAt` (timestamp)

### `users/{uid}`

User profile document.

Suggested fields:

- `username` (string)
- `displayName` (string)
- `avatarData` (string, data URL)
- `bio` (string)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### `users/{uid}/anime/{animeId}`

Per-user tracking state for an anime.

Fields:

- `uid` (string)
- `animeId` (string)
- `title` (string)
- `posterUrl` (string)
- `year` (number, nullable)
- `type` (string)
- `episodesTotal` (number, nullable)
- `malScore` (number, nullable)
- `genres` (string[])
- `status` (string: `plan`, `watching`, `completed`, `dropped`, `removed`)
- `progress` (number)
- `rating` (number, nullable)
- `isFavorite` (boolean)
- `personalRank` (number, nullable)
- `addedAt` (timestamp)
- `updatedAt` (timestamp)

### `users/{uid}/activity/{activityId}`

Timeline events for the profile page.

Fields:

- `animeId` (string)
- `title` (string, nullable)
- `posterUrl` (string, nullable)
- `type` (string)
- `label` (string)
- `createdAt` (timestamp)

### `users/{uid}/list/{animeId}`

Legacy watchlist entries (used by the list button UI).

Fields:

- `id` (string)
- `title` (string)
- `image` (string)
- `score` (number, nullable)
- `type` (string)
- `episodes` (number, nullable)
- `year` (number, nullable)
- `addedAt` (timestamp)

### `users/{uid}/collections/{collectionId}` (optional)

User-curated collections.

Fields:

- `title` (string)
- `description` (string, optional)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
