import { getAdminAuth, getAdminDb } from '../../lib/firebase/admin';

const deleteCollection = async (db, path, batchSize = 500) => {
  let snapshot = await db.collection(path).limit(batchSize).get();
  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    snapshot = await db.collection(path).limit(batchSize).get();
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return res.status(503).json({ error: 'Account deletion is not configured on the server.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded?.uid;
    if (!uid) return res.status(401).json({ error: 'Invalid auth token.' });

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const usernameLower = userSnap.exists ? userSnap.data()?.usernameLower : null;

    await Promise.all([
      deleteCollection(adminDb, `users/${uid}/list`),
      deleteCollection(adminDb, `users/${uid}/anime`),
      deleteCollection(adminDb, `users/${uid}/activity`),
      deleteCollection(adminDb, `users/${uid}/collections`),
    ]);

    await userRef.delete();
    if (usernameLower) {
      await adminDb.collection('usernames').doc(usernameLower).delete();
    }

    await adminAuth.deleteUser(uid);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to delete account.' });
  }
}
