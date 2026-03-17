import { readFileSync } from 'fs';
import path from 'path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const readServiceAccountFile = () => {
  try {
    const filePath = path.join(process.cwd(), 'config', 'firebase-admin.json');
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getPrivateKey = () => {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!key) return '';
  const trimmed = key.trim().replace(/^"+|"+$/g, '');
  return trimmed.replace(/\\n/g, '\n');
};

const getAdminApp = () => {
  if (getApps().length) return getApps()[0];

  const fromEnv = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: getPrivateKey(),
  };

  const serviceAccount = readServiceAccountFile();
  const projectId = fromEnv.projectId || serviceAccount?.project_id;
  const clientEmail = fromEnv.clientEmail || serviceAccount?.client_email;
  const privateKey = fromEnv.privateKey || serviceAccount?.private_key;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
};

export const getAdminAuth = () => {
  const app = getAdminApp();
  if (!app) return null;
  return getAuth(app);
};

export const getAdminDb = () => {
  const app = getAdminApp();
  if (!app) return null;
  return getFirestore(app);
};
