import { create } from "zustand";
import { soundManager } from "@/lib/client/sound";

interface SessionState {
  selectedTopicId: string;
  selectedLevel: string;
  searchQuery: string;
  soundEnabled: boolean;
  queueIndex: number;
  shuffleSeed: number;

  setSelectedTopicId: (topicId: string) => void;
  setSelectedLevel: (level: string) => void;
  setSearchQuery: (query: string) => void;
  toggleSound: () => void;
  setQueueIndex: (index: number | ((prev: number) => number)) => void;
  setShuffleSeed: (seed: number | ((prev: number) => number)) => void;
  nextChunk: (queueLength: number) => void;
  shuffle: () => void;
  resetFilters: () => void;
  startTopic: (topicId: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  selectedTopicId: "ALL",
  selectedLevel: "ALL",
  searchQuery: "",
  soundEnabled: true,
  queueIndex: 0,
  shuffleSeed: 0,

  setSelectedTopicId: (topicId) => set({ selectedTopicId: topicId }),
  setSelectedLevel: (level) => set({ selectedLevel: level }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

  setQueueIndex: (updater) =>
    set((state) => ({
      queueIndex: typeof updater === "function" ? updater(state.queueIndex) : updater
    })),

  setShuffleSeed: (updater) =>
    set((state) => ({
      shuffleSeed: typeof updater === "function" ? updater(state.shuffleSeed) : updater
    })),

  nextChunk: (queueLength) => {
    soundManager.playClick();
    set((state) => ({
      queueIndex: state.queueIndex + 1 < queueLength ? state.queueIndex + 1 : 0
    }));
  },

  shuffle: () => {
    soundManager.playClick();
    set((state) => ({
      shuffleSeed: state.shuffleSeed + 1,
      queueIndex: 0
    }));
  },

  resetFilters: () =>
    set({
      selectedTopicId: "ALL",
      selectedLevel: "ALL",
      searchQuery: "",
      shuffleSeed: 0,
      queueIndex: 0
    }),

  startTopic: (topicId) => {
    soundManager.playSuccess();
    set({
      selectedTopicId: topicId,
      selectedLevel: "ALL",
      searchQuery: "",
      shuffleSeed: 0,
      queueIndex: 0
    });
  }
}));
