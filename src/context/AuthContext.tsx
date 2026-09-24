"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from "react";
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
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    const unsubscribe = onAuthChange((currentUser: AuthUser | null) => {
      setUser((prev) => {
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

      // Chỉ refresh khi người dùng thay đổi trạng thái thực sự so với SSR sau khi đã mount
      if (isMountedRef.current && currentUser?.uid !== initialUser?.uid) {
        router.refresh();
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [initialUser?.uid, router]);

  const handleSignIn = useCallback(async () => {
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
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [router]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      isSigningIn,
      signInWithGoogle: handleSignIn,
      logout: handleLogout
    }),
    [user, loading, isSigningIn, handleSignIn, handleLogout]
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
