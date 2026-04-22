# Account deletion — operator runbook

This runbook covers **two modes**: automated (when Firebase Admin credentials are provisioned) and manual (the fallback before those credentials exist).

Account deletion is a GDPR Article 17 obligation. If someone emails you asking for their data to be erased, **you have 30 days to respond and complete the request**.

---

## Mode 1 — Automated (the goal)

**Prerequisites in Vercel**: the 3 env vars below, set at `Production` / `Preview` / `Development` scopes.

| Variable | Where to get it |
|---|---|
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Console → Project Settings → General → Project ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Console → Project Settings → Service accounts → Generate new private key → JSON: `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Same JSON file: `private_key`. Paste **as-is** including the `-----BEGIN PRIVATE KEY-----` and the newlines (the code strips surrounding quotes and un-escapes `\n`) |

When all three are set, the API route at `/api/delete-account` does the full deletion cascade:

1. Verifies the caller's ID token (Firebase Auth)
2. Deletes every subcollection under `users/{uid}/*` in batches
3. Deletes the `users/{uid}` doc
4. Releases the `usernames/{normalized}` reservation (Admin SDK bypasses the `allow delete: if false` rule — that rule exists to stop squatting from clients, not to block GDPR compliance)
5. Deletes the Firebase Auth user

The UI ("Delete account" button in the profile edit modal) calls this automatically after double confirmation.

---

## Mode 2 — Manual (current default)

Until those env vars are set, the API route returns `503 { error: 'admin-not-configured', fallback: '/privacy' }`, and the UI points the user at the email contact on `/privacy`.

When an email arrives, execute the deletion yourself:

### Prerequisites
- Firebase Console access to the AnimeLegacy project
- `firebase` CLI installed and authenticated against the project (optional — speeds things up)

### Steps

1. **Identify the user**. Ask them to include their account email or username in the request. Cross-reference:
   - Firebase Console → Authentication → Users → search by email → note the UID
   - Or Firestore → `users/{uid}` where `usernameLower` matches

2. **Delete the subcollections**. For each of the subcollections below, delete the documents (either click-through in the Firestore console or via the CLI):

   ```bash
   firebase firestore:delete users/<UID>/anime --recursive --force
   firebase firestore:delete users/<UID>/activity --recursive --force
   firebase firestore:delete users/<UID>/list --recursive --force
   firebase firestore:delete users/<UID>/collections --recursive --force
   firebase firestore:delete users/<UID>/favoriteCharacters --recursive --force
   ```

3. **Delete the parent user document**:

   ```bash
   firebase firestore:delete users/<UID> --force
   ```

4. **Release the username reservation**. The Firestore rule `usernames/{…}` has `allow delete: if false` — your client-side deletion won't work. Two options:
   - **Firebase Console** (Web UI): navigate to `usernames/<usernameLower>` → delete document. The admin console bypasses security rules.
   - Or temporarily relax the rule, deploy, delete, revert, deploy again (don't bother — the console path is faster).

5. **Delete the Firebase Auth user**: Authentication → Users → `…` menu → Delete account.

6. **Reply to the user** confirming completion. Keep a log entry (subject line, UID, date actioned) for your own records in case of CNPD audit.

### Sanity check — nothing personal should remain

After deletion, searching Firestore for the UID (via the Console's global search) should return zero results. `anime/{id}` catalog entries and `characterStats/{id}` counters are *not* personal data and stay.

---

## Notifying the user

A short template:

> Hi,
> Your AnimeLegacy account and all associated data (list entries, reviews, activity, favourites) have been deleted from our systems.
>
> This action is irreversible. If you'd like to use AnimeLegacy again in the future, you're welcome to create a new account.
>
> — AnimeLegacy

---

## Logging / audit trail

Even in manual mode, keep a private note of each request:

```
YYYY-MM-DD | <email-masked> | <UID> | deleted | notes
```

Not required by GDPR but saves you if someone later claims the request wasn't honoured.
