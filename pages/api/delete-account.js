// Account deletion endpoint.
//
// When FIREBASE_ADMIN_* env vars are present, this handler deletes every
// personal data document for the caller:
//   - users/{uid} and all its subcollections
//   - usernames/{normalized} (via Admin SDK — rules forbid deletion from clients)
//   - the Firebase Auth user itself
//
// When the Admin SDK is NOT configured, it returns 503 with a payload that
// points the client to the manual /privacy flow (email-based deletion). This
// lets the UI show a helpful fallback instead of a silent failure, and means
// the route is safe to merge before production credentials are provisioned.

import { getAdminAuth, getAdminDb } from '../../lib/firebase/admin';

const USER_SUBCOLLECTIONS = ['anime', 'activity', 'list', 'collections', 'favoriteCharacters'];

const deleteCollection = async (db, collRef) => {
  const snap = await collRef.get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return res.status(503).json({
      error: 'admin-not-configured',
      fallback: '/privacy',
    });
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const usernameLower = userSnap.exists ? userSnap.data()?.usernameLower : null;

    // Wipe every subcollection first, then the parent doc.
    for (const name of USER_SUBCOLLECTIONS) {
      await deleteCollection(db, userRef.collection(name));
    }
    if (userSnap.exists) await userRef.delete();

    // Release the username reservation. Rules forbid delete from clients but
    // Admin SDK bypasses rules, which is the whole reason this path exists.
    if (usernameLower) {
      await db.collection('usernames').doc(usernameLower).delete().catch(() => {});
    }

    // Finally remove the Auth user — this invalidates any remaining sessions.
    await auth.deleteUser(uid);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Deletion failed' });
  }
}
