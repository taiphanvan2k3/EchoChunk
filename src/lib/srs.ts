// Spaced Repetition System (SuperMemo SM-2 & FSRS principles)
import { ChunkProgress, SRSRating, SpeakingChunk } from '@/types';

export const DEFAULT_EASE_FACTOR = 2.5;

export function calculateNextReview(
  currentProgress: ChunkProgress | undefined,
  rating: SRSRating,
  chunkId: string
): ChunkProgress {
  const now = new Date();
  
  if (!currentProgress) {
    currentProgress = {
      chunkId,
      repetitions: 0,
      intervalDays: 1,
      easeFactor: DEFAULT_EASE_FACTOR,
      dueDate: now.toISOString(),
      lastReviewed: now.toISOString(),
      confidenceScore: rating,
      accuracyHistory: [],
      bestAccuracy: 0,
    };
  }

  let { repetitions, intervalDays, easeFactor } = currentProgress;

  if (rating === 1) {
    // Again: reset repetitions
    repetitions = 0;
    intervalDays = 1;
  } else {
    // 2: Hard, 3: Good, 4: Easy
    if (repetitions === 0) {
      intervalDays = rating === 2 ? 1 : rating === 3 ? 2 : 4;
    } else if (repetitions === 1) {
      intervalDays = rating === 2 ? 3 : rating === 3 ? 6 : 8;
    } else {
      const multiplier = rating === 2 ? 1.2 : rating === 3 ? easeFactor : easeFactor * 1.35;
      intervalDays = Math.round(intervalDays * multiplier);
    }
    repetitions += 1;
  }

  // Adjust ease factor based on performance
  // EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  const grade = rating + 1; // map 1..4 to 2..5
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;
  if (easeFactor > 3.0) easeFactor = 3.0;

  const nextDueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    ...currentProgress,
    repetitions,
    intervalDays,
    easeFactor,
    dueDate: nextDueDate.toISOString(),
    lastReviewed: now.toISOString(),
    confidenceScore: rating,
  };
}

export function isDue(progress: ChunkProgress | undefined): boolean {
  if (!progress) return true; // Unstudied chunks are always eligible
  const due = new Date(progress.dueDate);
  return due.getTime() <= Date.now();
}

export function sortQueue(chunks: SpeakingChunk[], progressMap: Record<string, ChunkProgress>): SpeakingChunk[] {
  return [...chunks].sort((a, b) => {
    const progA = progressMap[a.id];
    const progB = progressMap[b.id];

    // Priority 1: Unstudied chunks first
    if (!progA && progB) return -1;
    if (progA && !progB) return 1;
    if (!progA && !progB) {
      if (a.number !== b.number) return a.number - b.number;
      return a.id.localeCompare(b.id);
    }

    // Priority 2: Due date ascending (overdue first)
    const dueA = new Date(progA.dueDate).getTime();
    const dueB = new Date(progB.dueDate).getTime();
    if (dueA !== dueB) return dueA - dueB;

    return a.id.localeCompare(b.id);
  });
}

/**
 * Deterministic Fisher-Yates shuffle using Mulberry32 PRNG (Pure function, safe for React 19).
 */
export function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  if (seed <= 0 || array.length <= 1) return array;
  const arr = [...array];
  let s = (seed * 12345 + 7) & 0xffffffff;

  const random = () => {
    s = (s + 0x6d2b79f5) & 0xffffffff;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}
