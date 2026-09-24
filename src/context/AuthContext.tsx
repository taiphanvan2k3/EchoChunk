"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { AuthUser, onAuthChange, signInWithGoogle, signOutUser } from "@/lib/client/firebase/auth";

import { useRouter } from "next/navigation";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  initialUser?: AuthUser | null;
  children: React.ReactNode;
}> = ({ initialUser = null, children }) => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser: AuthUser | null) => {
      setUser((prev) => {
        if (!prev && currentUser) {
          router.refresh();
        }
        if (
          prev &&
          currentUser &&
          prev.uid === currentUser.uid &&
          prev.email === currentUser.email &&
          prev.displayName === currentUser.displayName &&
          prev.photoURL === currentUser.photoURL
        ) {
          return prev;
        }
        return currentUser;
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const authUser = await signInWithGoogle();
      setUser(authUser);
      router.refresh();
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message !== "POPUP_CLOSED") {
        console.error("Sign in failed:", error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setUser(null);
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      isSigningIn,
      signInWithGoogle: handleSignIn,
      logout: handleLogout
    }),
    [user, loading, isSigningIn]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
