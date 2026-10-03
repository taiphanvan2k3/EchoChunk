import { create } from "zustand";
import { SpeakingChunk } from "@/types";
import { soundManager } from "@/lib/client/sound";

interface ModalState {
  isAnalyticsOpen: boolean;
  isChunkModalOpen: boolean;
  isAuthPromptOpen: boolean;
  chunkToEdit: SpeakingChunk | null;

  openAnalytics: () => void;
  closeAnalytics: () => void;
  openAuthPrompt: () => void;
  closeAuthPrompt: () => void;
  openAddChunk: (user: unknown) => void;
  openAddChunkAfterAuth: () => void;
  openEditChunk: (chunk: SpeakingChunk, user: unknown) => void;
  closeChunkModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isAnalyticsOpen: false,
  isChunkModalOpen: false,
  isAuthPromptOpen: false,
  chunkToEdit: null,

  openAnalytics: () => {
    soundManager.playClick();
    set({ isAnalyticsOpen: true });
  },
  closeAnalytics: () => set({ isAnalyticsOpen: false }),

  openAuthPrompt: () => set({ isAuthPromptOpen: true }),
  closeAuthPrompt: () => set({ isAuthPromptOpen: false }),

  openAddChunk: (user) => {
    soundManager.playClick();
    if (!user) {
      set({ isAuthPromptOpen: true });
      return;
    }
    set({ chunkToEdit: null, isChunkModalOpen: true });
  },

  openAddChunkAfterAuth: () => {
    set({ isAuthPromptOpen: false, chunkToEdit: null, isChunkModalOpen: true });
  },

  openEditChunk: (chunk, user) => {
    soundManager.playClick();
    if (!user) {
      set({ isAuthPromptOpen: true });
      return;
    }
    set({ chunkToEdit: chunk, isChunkModalOpen: true });
  },

  closeChunkModal: () => set({ isChunkModalOpen: false, chunkToEdit: null })
}));
