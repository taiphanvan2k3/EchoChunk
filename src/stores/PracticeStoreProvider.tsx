"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useIsClient } from "@/hooks/useIsClient";
import { clearAllLegacyLocalStorage } from "@/lib/client/storage";
import { InitialPracticeData } from "@/lib/server/practiceData";
import { createChunkStore, ChunkStoreContext } from "./chunkStore";
import { createProgressStore, ProgressStoreContext } from "./progressStore";
import { useSessionStore } from "./sessionStore";
import {
  fetchCustomChunks,
  fetchUserProgressMap,
  fetchUserStats
} from "@/lib/client/firebase/firestore";

interface PracticeStoreProviderProps {
  initialData?: InitialPracticeData;
  children: React.ReactNode;
}

/**
 * PracticeStoreProvider:
 * Cung cấp Zustand store instances cho toàn bộ ứng dụng:
 * 1. Khởi tạo store với InitialData từ SSR qua lazy state initialization -> getInitialState() có đầy đủ dữ liệu -> 0ms flash, đúng thống kê & chunk ngay frame đầu tiên.
 * 2. Lắng nghe AuthState để đồng bộ Cloud Firestore khi login/logout.
 * 3. Cho phép từng component con sử dụng granular selector độc lập (useProgressStore, useChunkStore, useModalStore, useSessionStore).
 */
export function PracticeStoreProvider({ initialData, children }: PracticeStoreProviderProps) {
  const { user } = useAuth();
  const isClient = useIsClient();

  // Tạo instance store 1 lần duy nhất bằng useState lazy initialization (chuẩn React 19)
  const [chunkStore] = useState(() => {
    const initCustom = initialData?.firstChunk ? [initialData.firstChunk] : [];
    return createChunkStore({ customChunks: initCustom });
  });

  const [progressStore] = useState(() => {
    return createProgressStore({
      progressMap: initialData?.progressMap ?? {},
      userStats: initialData?.userStats,
      todayTimestamp: Date.now()
    });
  });

  // Cloud Sync on user login / logout
  const currentUserId = user?.uid ?? null;
  const prevUserIdRef = useRef<string | null>(currentUserId);

  useEffect(() => {
    if (!isClient) return;
    clearAllLegacyLocalStorage();

    if (currentUserId !== prevUserIdRef.current) {
      prevUserIdRef.current = currentUserId;
      if (!currentUserId) {
        // User logged out: reset stores in-memory immediately
        chunkStore.getState().resetCustomChunks();
        progressStore.getState().resetProgress();
        useSessionStore.getState().resetFilters();
        return;
      }
    }

    if (!user) return;

    let isMounted = true;
    Promise.all([
      fetchCustomChunks(user.uid),
      fetchUserProgressMap(user.uid),
      fetchUserStats(user.uid)
    ])
      .then(([cloudCustom, cloudProgress, cloudStats]) => {
        if (!isMounted) return;
        if (cloudCustom && cloudCustom.length > 0) {
          chunkStore.getState().setCustomChunks(cloudCustom);
        }
        if (cloudProgress && Object.keys(cloudProgress).length > 0) {
          progressStore.getState().setProgressMap(cloudProgress);
        }
        if (cloudStats) {
          progressStore.getState().setUserStats(cloudStats);
        }
      })
      .catch((err) => {
        console.warn("[PracticeStoreProvider] Lỗi nạp dữ liệu từ Cloud Firestore:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isClient, user, currentUserId, chunkStore, progressStore]);

  return (
    <ChunkStoreContext.Provider value={chunkStore}>
      <ProgressStoreContext.Provider value={progressStore}>
        {children}
      </ProgressStoreContext.Provider>
    </ChunkStoreContext.Provider>
  );
}
