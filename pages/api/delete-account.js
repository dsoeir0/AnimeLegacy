import * as Sentry from '@sentry/nextjs';
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
    const decoded = await auth.verifyIdToken(idToken, true);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const usernameLower = userSnap.exists ? userSnap.data()?.usernameLower : null;

    for (const name of USER_SUBCOLLECTIONS) {
      await deleteCollection(db, userRef.collection(name));
    }
    if (userSnap.exists) await userRef.delete();

    if (usernameLower) {
      await db.collection('usernames').doc(usernameLower).delete().catch(() => {});
    }

    await auth.deleteUser(uid);

    return res.status(200).json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'delete-account' } });
    return res.status(500).json({ error: 'Deletion failed' });
  }
}
