import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Safe fallback credentials to allow static page prerendering (next build / SSG) 
// to complete safely without crashing even if env vars are not injected yet in CI/CD.
const defaultApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyFakeBuildKeyForStaticPrerendering0';

const firebaseConfig = {
  apiKey: defaultApiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'echo-chunk.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'echo-chunk',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'echo-chunk.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '156951163271',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:156951163271:web:placeholder',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-PLACEHOLDER',
};

// Singleton initialization pattern for Next.js App Router & SSR safety
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const isFirebaseConfigured: boolean = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
