"use client";

import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import dataset from "@/data/speaking-chunks.json";
import { ChunksDataset, SpeakingChunk } from "@/types";
import { mergeCustomChunksWithBase } from "@/lib/shared/chunksMerge";

const initialData = dataset as unknown as ChunksDataset;
const baseChunksList = initialData.chunks;

export interface ChunkState {
  baseChunks: SpeakingChunk[];
  customChunks: SpeakingChunk[];
  allChunks: SpeakingChunk[];

  setCustomChunks: (chunks: SpeakingChunk[]) => void;
  addOrUpdateChunk: (chunk: SpeakingChunk) => void;
  removeChunk: (chunkId: string) => void;
  resetCustomChunks: () => void;
}

export type ChunkStore = ReturnType<typeof createChunkStore>;

export const createChunkStore = (initProps?: { customChunks?: SpeakingChunk[] }) => {
  const custom = initProps?.customChunks ?? [];
  return createStore<ChunkState>()((set) => ({
    baseChunks: baseChunksList,
    customChunks: custom,
    allChunks: custom.length > 0 ? mergeCustomChunksWithBase(baseChunksList, custom) : baseChunksList,

    setCustomChunks: (chunks) =>
      set({
        customChunks: chunks,
        allChunks: chunks.length > 0 ? mergeCustomChunksWithBase(baseChunksList, chunks) : baseChunksList
      }),

    addOrUpdateChunk: (chunk) =>
      set((state) => {
        const nextCustom = [chunk, ...state.customChunks.filter((c) => c.id !== chunk.id)];
        return {
          customChunks: nextCustom,
          allChunks: mergeCustomChunksWithBase(baseChunksList, nextCustom)
        };
      }),

    removeChunk: (chunkId) =>
      set((state) => {
        const nextCustom = state.customChunks.filter((c) => c.id !== chunkId);
        return {
          customChunks: nextCustom,
          allChunks: nextCustom.length > 0 ? mergeCustomChunksWithBase(baseChunksList, nextCustom) : baseChunksList
        };
      }),

    resetCustomChunks: () =>
      set({
        customChunks: [],
        allChunks: baseChunksList
      })
  }));
};

export const ChunkStoreContext = createContext<ChunkStore | null>(null);

export function useChunkStore<T>(selector: (state: ChunkState) => T): T {
  const store = useContext(ChunkStoreContext);
  if (!store) {
    throw new Error("useChunkStore must be used within PracticeStoreProvider");
  }
  return useStore(store, selector);
}

export function useChunkStoreApi(): ChunkStore {
  const store = useContext(ChunkStoreContext);
  if (!store) {
    throw new Error("useChunkStoreApi must be used within PracticeStoreProvider");
  }
  return store;
}
