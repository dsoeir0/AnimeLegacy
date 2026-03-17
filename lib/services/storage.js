import { deleteObject, getDownloadURL, ref, refFromURL, uploadBytes } from 'firebase/storage';
import { getFirebaseClient } from '../firebase/client';

const sanitizeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export const uploadUserAvatar = async ({ uid, file, previousUrl }) => {
  if (!uid || !file) return '';
  const { storage } = getFirebaseClient();
  if (!storage) return '';
  const safeName = sanitizeFileName(file.name || 'avatar');
  const objectPath = `users/${uid}/avatar/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, objectPath);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  if (previousUrl) {
    try {
      await deleteObject(refFromURL(previousUrl));
    } catch {
      // Ignore failures (old file might not exist or be accessible).
    }
  }
  return url;
};

export const deleteFileByUrl = async (url) => {
  if (!url) return false;
  const { storage } = getFirebaseClient();
  if (!storage) return false;
  try {
    await deleteObject(refFromURL(url));
    return true;
  } catch {
    return false;
  }
};
