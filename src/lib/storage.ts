// LocalStorage Manager with Streak, Progress & Full CRUD Vocabulary
import { ChunkProgress, SpeakingChunk, UserStats } from '@/types';

const PROGRESS_KEY = 'echo_chunk_progress_v1';
const STATS_KEY = 'echo_chunk_stats_v1';
const CUSTOM_CHUNKS_KEY = 'echo_chunk_custom_chunks_v1';
const DELETED_CHUNK_IDS_KEY = 'echo_chunk_deleted_ids_v1';

export function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function loadProgressMap(): Record<string, ChunkProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load progress', e);
    return {};
  }
}

export function saveProgressMap(map: Record<string, ChunkProgress>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save progress', e);
  }
}

export function loadUserStats(): UserStats {
  const defaultStats: UserStats = {
    streakDays: 1,
    lastActiveDate: getTodayDateStr(),
    todayReviewedCount: 0,
    totalPracticedCount: 0,
    dailyGoal: 20,
  };

  if (typeof window === 'undefined') return defaultStats;

  try {
    const raw = localStorage.getItem(STATS_KEY);
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
  } catch (e) {
    return defaultStats;
  }
}

export function saveUserStats(stats: UserStats) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats', e);
  }
}

export function recordChunkReviewed(chunkId: string, accuracy: number) {
  const stats = loadUserStats();
  stats.todayReviewedCount += 1;
  stats.totalPracticedCount += 1;
  saveUserStats(stats);
  return stats;
}

// --------------------------------------------------------------------------
// CRUD Operations for Custom & Edited Chunks
// --------------------------------------------------------------------------

export function loadCustomChunks(): SpeakingChunk[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CHUNKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load custom chunks', e);
    return [];
  }
}

export function saveCustomChunks(chunks: SpeakingChunk[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_CHUNKS_KEY, JSON.stringify(chunks));
  } catch (e) {
    console.error('Failed to save custom chunks', e);
  }
}

export function loadDeletedChunkIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_CHUNK_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load deleted chunk ids', e);
    return [];
  }
}

export function saveDeletedChunkIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DELETED_CHUNK_IDS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save deleted chunk ids', e);
  }
}

export function getMergedChunks(baseChunks: SpeakingChunk[]): SpeakingChunk[] {
  const customChunks = loadCustomChunks();
  const deletedIds = new Set(loadDeletedChunkIds());

  const customMap = new Map<string, SpeakingChunk>();
  for (const c of customChunks) {
    customMap.set(c.id, c);
  }

  const result: SpeakingChunk[] = [];
  for (const base of baseChunks) {
    if (deletedIds.has(base.id)) continue;
    if (customMap.has(base.id)) {
      result.push(customMap.get(base.id)!);
      customMap.delete(base.id);
    } else {
      result.push(base);
    }
  }

  for (const newChunk of customMap.values()) {
    if (!deletedIds.has(newChunk.id)) {
      result.unshift(newChunk); // Show custom chunks near the top
    }
  }

  return result;
}

export function saveChunk(chunk: SpeakingChunk): SpeakingChunk[] {
  const customChunks = loadCustomChunks();
  const index = customChunks.findIndex((c) => c.id === chunk.id);
  if (index >= 0) {
    customChunks[index] = chunk;
  } else {
    customChunks.unshift(chunk);
  }
  saveCustomChunks(customChunks);

  const deletedIds = loadDeletedChunkIds();
  if (deletedIds.includes(chunk.id)) {
    saveDeletedChunkIds(deletedIds.filter((id) => id !== chunk.id));
  }

  return customChunks;
}

export function removeChunk(chunkId: string): void {
  const customChunks = loadCustomChunks();
  const filtered = customChunks.filter((c) => c.id !== chunkId);
  saveCustomChunks(filtered);

  const deletedIds = loadDeletedChunkIds();
  if (!deletedIds.includes(chunkId)) {
    deletedIds.push(chunkId);
    saveDeletedChunkIds(deletedIds);
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
      deletedChunkIds,
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
    console.error('Import failed', e);
    return false;
  }
}
