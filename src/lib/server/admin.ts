import 'server-only';

import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

function initAdmin(): { app: App | null; auth: Auth | null; db: Firestore | null } {
  if (adminApp) {
    return { app: adminApp, auth: adminAuth, db: adminDb };
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    return { app: adminApp, auth: adminAuth, db: adminDb };
  }

  // 1. Check for service-account.json in project root
  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
      const serviceAccount = JSON.parse(fileContent);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });

      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);
      console.log('[Firebase Admin] Initialized successfully using service-account.json');
      return { app: adminApp, auth: adminAuth, db: adminDb };
    } catch (error) {
      console.error('[Firebase Admin] Error loading service-account.json:', error);
    }
  }

  // 2. Check for environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);
      console.log('[Firebase Admin] Initialized successfully using environment variables');
      return { app: adminApp, auth: adminAuth, db: adminDb };
    } catch (error) {
      console.error('[Firebase Admin] Error initializing with env variables:', error);
    }
  }

  console.warn(
    '[Firebase Admin] Missing service account credentials. Server SSR will fall back to client-side data fetching.'
  );
  return { app: null, auth: null, db: null };
}

export function getAdminInstances() {
  return initAdmin();
}

export async function verifyUserSession(sessionCookie?: string | null) {
  if (!sessionCookie) return null;
  const { auth } = initAdmin();
  if (!auth) return null;

  try {
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    return decodedToken;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('[Firebase Admin] verifySessionCookie failed:', {
      code: err.code,
      message: err.message,
      error,
    });
    return null;
  }
}
