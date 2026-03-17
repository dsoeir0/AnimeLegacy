import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isConfigured = Object.values(firebaseConfig).every(Boolean);

let app = null;
let db = null;
let auth = null;
let googleProvider = null;
let storage = null;
let initAttempted = false;

const initFirebase = () => {
  if (initAttempted || !isConfigured) return;
  initAttempted = true;
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = typeof window === 'undefined' ? null : getFirestore(app);

  if (typeof window !== 'undefined') {
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    storage = getStorage(app);
  }
};

export const getFirebaseClient = () => {
  initFirebase();
  return {
    app,
    db,
    auth,
    googleProvider,
    storage,
    enabled: isConfigured && Boolean(app),
  };
};
