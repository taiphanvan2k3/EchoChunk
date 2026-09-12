'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { AuthUser, onAuthChange, signInWithGoogle, signOutUser } from '@/lib/firebase/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const authUser = await signInWithGoogle();
      setUser(authUser);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message !== 'POPUP_CLOSED') {
        console.error('Sign in failed:', error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      isSigningIn,
      signInWithGoogle: handleSignIn,
      logout: handleLogout,
    }),
    [user, loading, isSigningIn]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
