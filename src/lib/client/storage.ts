// LocalStorage Manager with Streak, Progress & Full CRUD Vocabulary
import { mergeCustomChunksWithBase } from "@/lib/shared/chunksMerge";

import { ChunkProgress, SpeakingChunk, UserStats } from "@/types";

const PROGRESS_KEY = "echo_chunk_progress_v1";
const STATS_KEY = "echo_chunk_stats_v1";
const CUSTOM_CHUNKS_KEY = "echo_chunk_custom_chunks_v1";
const DELETED_CHUNK_IDS_KEY = "echo_chunk_deleted_ids_v1";

export function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getStorageKey(baseKey: string, uid?: string | null): string {
  if (!uid || uid === "guest") {
    return `${baseKey}_guest`;
  }
  return `${baseKey}_${uid}`;
}

function getItemWithFallback(baseKey: string, uid?: string | null): string | null {
  if (typeof window === "undefined") return null;
  const key = getStorageKey(baseKey, uid);
  const val = localStorage.getItem(key);
  if (val !== null) return val;

  // Fallback / legacy migration for guest
  if (!uid || uid === "guest") {
    const legacy = localStorage.getItem(baseKey);
    if (legacy !== null) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(baseKey);
      return legacy;
    }
  }
  return null;
}

export function clearGuestStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PROGRESS_KEY}_guest`);
  localStorage.removeItem(`${STATS_KEY}_guest`);
  localStorage.removeItem(`${CUSTOM_CHUNKS_KEY}_guest`);
  localStorage.removeItem(`${DELETED_CHUNK_IDS_KEY}_guest`);
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(STATS_KEY);
  localStorage.removeItem(CUSTOM_CHUNKS_KEY);
  localStorage.removeItem(DELETED_CHUNK_IDS_KEY);
}

export function loadProgressMap(uid?: string | null): Record<string, ChunkProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = getItemWithFallback(PROGRESS_KEY, uid);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to load progress", e);
    return {};
  }
}

export function saveProgressMap(map: Record<string, ChunkProgress>, uid?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(PROGRESS_KEY, uid);
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to save progress", e);
  }
}

export function loadUserStats(uid?: string | null): UserStats {
  const defaultStats: UserStats = {
    streakDays: 1,
    lastActiveDate: getTodayDateStr(),
    todayReviewedCount: 0,
    totalPracticedCount: 0,
    dailyGoal: 20
  };

  if (typeof window === "undefined") return defaultStats;

  try {
    const raw = getItemWithFallback(STATS_KEY, uid);
    if (!raw) return defaultStats;

    const stats: UserStats = JSON.parse(raw);
    const today = getTodayDateStr();

    if (stats.lastActiveDate !== today) {
      const lastDate = new Date(stats.lastActiveDate);
      const currentDate = new Date(today);
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        stats.streakDays += 1;
      } else if (diffDays > 1) {
        stats.streakDays = 1;
      }
      stats.todayReviewedCount = 0;
      stats.lastActiveDate = today;
    }

    return stats;
  } catch {
    return defaultStats;
  }
}

export function saveUserStats(stats: UserStats, uid?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(STATS_KEY, uid);
    localStorage.setItem(key, JSON.stringify(stats));
  } catch (e) {
    console.error("Failed to save stats", e);
  }
}

export function recordChunkReviewed(chunkId: string, accuracy: number, uid?: string | null) {
  const stats = loadUserStats(uid);
  stats.todayReviewedCount += 1;
  stats.totalPracticedCount += 1;
  saveUserStats(stats, uid);
  return stats;
}

// --------------------------------------------------------------------------
// CRUD Operations for Custom & Edited Chunks
// --------------------------------------------------------------------------

export function loadCustomChunks(uid?: string | null): SpeakingChunk[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = getItemWithFallback(CUSTOM_CHUNKS_KEY, uid);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load custom chunks", e);
    return [];
  }
}

export function saveCustomChunks(chunks: SpeakingChunk[], uid?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(CUSTOM_CHUNKS_KEY, uid);
    localStorage.setItem(key, JSON.stringify(chunks));
  } catch (e) {
    console.error("Failed to save custom chunks", e);
  }
}

export function loadDeletedChunkIds(uid?: string | null): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = getItemWithFallback(DELETED_CHUNK_IDS_KEY, uid);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load deleted chunk ids", e);
    return [];
  }
}

export function saveDeletedChunkIds(ids: string[], uid?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(DELETED_CHUNK_IDS_KEY, uid);
    localStorage.setItem(key, JSON.stringify(ids));
  } catch (e) {
    console.error("Failed to save deleted chunk ids", e);
  }
}

export function getMergedChunks(baseChunks: SpeakingChunk[], uid?: string | null): SpeakingChunk[] {
  const customChunks = loadCustomChunks(uid);
  const deletedIds = new Set(loadDeletedChunkIds(uid));
  const userFiltered = customChunks.filter((c) => !uid || !c.userId || c.userId === uid || c.userId === "guest");
  return mergeCustomChunksWithBase(baseChunks, userFiltered, deletedIds);
}

export function saveChunk(chunk: SpeakingChunk, uid?: string | null): SpeakingChunk[] {
  const customChunks = loadCustomChunks(uid);
  const index = customChunks.findIndex((c) => c.id === chunk.id);
  const chunkToSave: SpeakingChunk = {
    ...chunk,
    userId: uid || "guest"
  };

  if (index >= 0) {
    customChunks[index] = chunkToSave;
  } else {
    customChunks.unshift(chunkToSave);
  }
  saveCustomChunks(customChunks, uid);

  const deletedIds = loadDeletedChunkIds(uid);
  if (deletedIds.includes(chunk.id)) {
    saveDeletedChunkIds(
      deletedIds.filter((id) => id !== chunk.id),
      uid
    );
  }

  return customChunks;
}

export function removeChunk(chunkId: string, uid?: string | null): void {
  const customChunks = loadCustomChunks(uid);
  const filtered = customChunks.filter((c) => c.id !== chunkId);
  saveCustomChunks(filtered, uid);

  const deletedIds = loadDeletedChunkIds(uid);
  if (!deletedIds.includes(chunkId)) {
    deletedIds.push(chunkId);
    saveDeletedChunkIds(deletedIds, uid);
  }
}

// --------------------------------------------------------------------------
// Backup & Restore
// --------------------------------------------------------------------------

export function exportBackupJSON(): string {
  const progress = loadProgressMap();
  const stats = loadUserStats();
  const customChunks = loadCustomChunks();
  const deletedChunkIds = loadDeletedChunkIds();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      progress,
      stats,
      customChunks,
      deletedChunkIds
    },
    null,
    2
  );
}

export function importBackupJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.progress) saveProgressMap(parsed.progress);
    if (parsed.stats) saveUserStats(parsed.stats);
    if (parsed.customChunks && Array.isArray(parsed.customChunks)) {
      saveCustomChunks(parsed.customChunks);
    }
    if (parsed.deletedChunkIds && Array.isArray(parsed.deletedChunkIds)) {
      saveDeletedChunkIds(parsed.deletedChunkIds);
    }
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
}
