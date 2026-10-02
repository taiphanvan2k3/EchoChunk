import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

import { AuthUser } from '@/types';
export type { AuthUser };

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export async function signInWithGoogle(): Promise<AuthUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Cập nhật hoặc khởi tạo thông tin người dùng trong collection 'users/{uid}'
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Đồng bộ session cookie với Server Next.js
    const idToken = await user.getIdToken();
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
    } catch (sessionErr) {
      console.error('Session sync error:', sessionErr);
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    // Bỏ qua nếu người dùng chủ động đóng popup
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('POPUP_CLOSED');
    }
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
      });
    } catch (sessionErr) {
      console.error('Session clear error:', sessionErr);
    }
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}

export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
    if (firebaseUser) {
      const authUser: AuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };
      callback(authUser);

      // Đảm bảo session cookie luôn tồn tại và khớp với phiên đăng nhập hiện tại
      try {
        const idToken = await firebaseUser.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      } catch (err) {
        console.error('[Auth] Error syncing session cookie in onAuthChange:', err);
      }
    } else {
      callback(null);
    }
  });
}
