"use client";

import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { ChunkProgress, UserStats, SRSRating } from "@/types";
import { calculateNextReview } from "@/lib/shared/srs";
import { getTodayDateStr } from "@/lib/client/storage";
import { soundManager } from "@/lib/client/sound";
import confetti from "canvas-confetti";

export const getDefaultStats = (): UserStats => ({
  streakDays: 1,
  lastActiveDate: getTodayDateStr(),
  todayReviewedCount: 0,
  totalPracticedCount: 0,
  dailyGoal: 20
});

export interface ProgressState {
  progressMap: Record<string, ChunkProgress>;
  userStats: UserStats;
  todayTimestamp: number;

  setProgressMap: (map: Record<string, ChunkProgress>) => void;
  setUserStats: (stats: UserStats) => void;
  rateChunk: (
    chunkId: string,
    rating: SRSRating,
    accuracy: number
  ) => { nextProg: ChunkProgress; updatedStats: UserStats; isGoalMet: boolean };
  resetProgress: () => void;
}

export type ProgressStore = ReturnType<typeof createProgressStore>;

export const createProgressStore = (initProps?: {
  progressMap?: Record<string, ChunkProgress>;
  userStats?: UserStats;
  todayTimestamp?: number;
}) => {
  return createStore<ProgressState>()((set, get) => ({
    progressMap: initProps?.progressMap ?? {},
    userStats: initProps?.userStats ?? getDefaultStats(),
    todayTimestamp: initProps?.todayTimestamp ?? Date.now(),

    setProgressMap: (map) => set({ progressMap: map }),

    setUserStats: (stats) => set({ userStats: stats }),

    rateChunk: (chunkId, rating, accuracy) => {
      const { progressMap, userStats } = get();
      const currentProg = progressMap[chunkId];
      const nextProg = calculateNextReview(currentProg, rating, chunkId);

      nextProg.accuracyHistory = [...(currentProg?.accuracyHistory || []), accuracy];
      nextProg.bestAccuracy = Math.max(currentProg?.bestAccuracy || 0, accuracy);

      const today = getTodayDateStr();
      const isNewDay = userStats.lastActiveDate !== today;
      const updatedStats: UserStats = {
        ...userStats,
        lastActiveDate: today,
        todayReviewedCount: isNewDay ? 1 : userStats.todayReviewedCount + 1,
        totalPracticedCount: userStats.totalPracticedCount + 1
      };

      const isGoalMet = updatedStats.todayReviewedCount === updatedStats.dailyGoal;

      set({
        progressMap: {
          ...progressMap,
          [chunkId]: nextProg
        },
        userStats: updatedStats
      });

      if (rating >= 3) {
        soundManager.playSuccess();
      } else {
        soundManager.playClick();
      }

      if (isGoalMet) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      }

      return { nextProg, updatedStats, isGoalMet };
    },

    resetProgress: () =>
      set({
        progressMap: {},
        userStats: getDefaultStats()
      })
  }));
};

export const ProgressStoreContext = createContext<ProgressStore | null>(null);

export function useProgressStore<T>(selector: (state: ProgressState) => T): T {
  const store = useContext(ProgressStoreContext);
  if (!store) {
    throw new Error("useProgressStore must be used within PracticeStoreProvider");
  }
  return useStore(store, selector);
}

export function useProgressStoreApi(): ProgressStore {
  const store = useContext(ProgressStoreContext);
  if (!store) {
    throw new Error("useProgressStoreApi must be used within PracticeStoreProvider");
  }
  return store;
}
