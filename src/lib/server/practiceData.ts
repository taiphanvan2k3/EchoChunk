import 'server-only';

import { cookies } from 'next/headers';
import dataset from '@/data/speaking-chunks.json';
import {
  ChunksDataset,
  SpeakingChunk,
  ChunkProgress,
  UserStats,
  TopicMeta,
  SRSRating,
  AuthUser,
} from '@/types';
import { sortQueue } from '@/lib/shared/srs';
import { getAdminInstances, verifyUserSession } from '@/lib/server/admin';
import { isUserOwnedChunk } from '@/lib/shared/chunkClassification';

const data = dataset as unknown as ChunksDataset;

export interface InitialPracticeData {
  /** Chunk đầu tiên trong queue nếu user đã sửa nó - dùng để tránh IPA flicker khi SSR→hydration */
  firstChunk?: SpeakingChunk;
  progressMap: Record<string, ChunkProgress>;
  userStats: UserStats;
  dynamicTopics: TopicMeta[];
  practiceQueue?: SpeakingChunk[];
  reviewDueCount: number;
  unstudiedCount: number;
  totalChunksCount: number;
}

export interface InitialServerResult {
  initialUser: AuthUser | null;
  initialPracticeData: InitialPracticeData;
}

function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function computeDynamicTopics(
  allChunks: SpeakingChunk[],
  progressMap: Record<string, ChunkProgress>,
  customChunksCount: number = 0
): TopicMeta[] {
  const counts: Record<string, number> = {};
  let customCount = 0;

  allChunks.forEach((c) => {
    if (c.topicId && c.topicId !== 'CUSTOM' && c.topicId !== 'STUDIED') {
      counts[c.topicId] = (counts[c.topicId] || 0) + 1;
    }
    if (isUserOwnedChunk(c)) {
      customCount += 1;
    }
  });

  if (customCount === 0) {
    customCount = customChunksCount;
  }

  // Đếm chính xác số câu đã luyện tập từ progressMap (không phụ thuộc allChunks)
  const studiedCount = Object.values(progressMap).filter(
    (p) => p && p.repetitions > 0
  ).length;

  const list = data.topics.map((t) => ({
    ...t,
    chunkCount: counts[t.topicId] || 0,
  }));

  if (customCount > 0) {
    list.unshift({
      topicId: 'CUSTOM',
      topicName: 'Từ vựng của tôi',
      icon: '⭐',
      chunkCount: customCount,
    });
  }

  if (studiedCount > 0) {
    list.unshift({
      topicId: 'STUDIED',
      topicName: 'Đã luyện tập',
      icon: '🧠',
      chunkCount: studiedCount,
    });
  }

  return list;
}

function serializeFirestoreData<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;

  if (typeof obj === 'object') {
    if ('_seconds' in obj && '_nanoseconds' in obj) {
      const ts = obj as { _seconds: number; _nanoseconds: number };
      return new Date(ts._seconds * 1000).toISOString() as unknown as T;
    }
    if (typeof (obj as { toDate?: () => Date }).toDate === 'function') {
      return (obj as { toDate: () => Date }).toDate().toISOString() as unknown as T;
    }
    if (obj instanceof Date) {
      return obj.toISOString() as unknown as T;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => serializeFirestoreData(item)) as unknown as T;
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeFirestoreData(value);
    }
    return result as T;
  }

  return obj as T;
}

function toPlainObject<T>(data: T): T {
  const sanitized = serializeFirestoreData(data);
  return JSON.parse(JSON.stringify(sanitized));
}

export async function getInitialServerData(): Promise<InitialServerResult> {
  const todayTimestamp = Date.now();
  const defaultStats: UserStats = {
    streakDays: 1,
    lastActiveDate: getTodayDateStr(),
    todayReviewedCount: 0,
    totalPracticedCount: 0,
    dailyGoal: 20,
  };

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  let initialUser: AuthUser | null = null;
  const progressMap: Record<string, ChunkProgress> = {};
  let userStats: UserStats = defaultStats;
  let adminDb: ReturnType<typeof getAdminInstances>['db'] | null = null;

  if (sessionCookie) {
    const decoded = await verifyUserSession(sessionCookie);
    if (decoded) {
      initialUser = {
        uid: decoded.uid,
        email: decoded.email || null,
        displayName: decoded.name || null,
        photoURL: decoded.picture || null,
      };

      const { db } = getAdminInstances();
      adminDb = db;
      if (db) {
        try {
          const userDocRef = db.collection('users').doc(decoded.uid);

          // Tối ưu hóa: Chỉ đọc 2 document cần thiết (progress_summary và stats/current)
          // Không đọc rootUserDoc hay gọi aggregation count() trên customChunks để giảm thiểu network round-trips
          const fetchPromise = Promise.all([
            userDocRef.collection('progress_summary').doc('current').get(),
            userDocRef.collection('stats').doc('current').get(),
          ]);

          // SSR Fail-safe timeout: Nếu mạng Firestore vượt quá 1200ms thì ngắt sớm,
          // trả về dữ liệu mặc định để gửi HTML ngay lập tức, client sẽ hydrate qua LocalStorage/Background Sync
          const timeoutPromise = new Promise<never>((_, reject) => {
            const timer = setTimeout(() => reject(new Error('Firestore SSR timeout')), 1200);
            if (typeof timer.unref === 'function') timer.unref();
          });

          const [progressSummaryDoc, statsDoc] = await Promise.race([
            fetchPromise,
            timeoutPromise,
          ]);

          if (progressSummaryDoc.exists) {
            const rawSummary = serializeFirestoreData<Record<string, unknown>>(progressSummaryDoc.data() || {});
            for (const [key, value] of Object.entries(rawSummary)) {
              if (key !== 'updatedAt' && value && typeof value === 'object') {
                const d = value as Record<string, unknown>;
                progressMap[key] = {
                  chunkId: (d.chunkId as string) || key,
                  repetitions: Number(d.repetitions) || 0,
                  intervalDays: Number(d.intervalDays) || 1,
                  easeFactor: Number(d.easeFactor) || 2.5,
                  dueDate: typeof d.dueDate === 'string' ? d.dueDate : new Date().toISOString(),
                  lastReviewed: typeof d.lastReviewed === 'string' ? d.lastReviewed : new Date().toISOString(),
                  confidenceScore: ((d.confidenceScore as number) || 3) as SRSRating,
                  accuracyHistory: Array.isArray(d.accuracyHistory) ? (d.accuracyHistory as number[]) : [],
                  bestAccuracy: Number(d.bestAccuracy) || 0,
                };
              }
            }
          }

          if (statsDoc.exists && statsDoc.data()) {
            const raw = serializeFirestoreData<Record<string, unknown>>(statsDoc.data() || {});
            const today = getTodayDateStr();
            let streakDays = Number(raw.streakDays) || 1;
            let todayReviewedCount = Number(raw.todayReviewedCount) || 0;
            const lastActiveDate = (raw.lastActiveDate as string) || today;

            if (lastActiveDate !== today) {
              const lastDate = new Date(lastActiveDate);
              const currentDate = new Date(today);
              const diffDays = Math.round(
                (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
              );

              if (diffDays === 1) {
                streakDays += 1;
              } else if (diffDays > 1) {
                streakDays = 1;
              }
              todayReviewedCount = 0;
            }

            const customChunksCount = Number(raw.customChunksCount) || 0;
            const savedTotalChunksCount = typeof raw.totalChunksCount === 'number'
              ? Number(raw.totalChunksCount)
              : undefined;

            userStats = {
              streakDays,
              lastActiveDate: today,
              todayReviewedCount,
              totalPracticedCount: Number(raw.totalPracticedCount) || 0,
              dailyGoal: Number(raw.dailyGoal) || 20,
              customChunksCount,
              totalChunksCount: savedTotalChunksCount,
            };
          }
        } catch (error) {
          console.warn('[Server Data] Warning: Pre-fetching user data skipped or timed out, relying on client cache:', error);
        }
      }
    }
  }

  // Tính chunk đầu tiên sẽ hiển thị để fetch ĐÚNG 1 document nếu user đã sửa nó.
  // Tránh IPA flicker SSR → hydration mà không serialize cả 800KB base data.
  const baseChunks = data.chunks;
  let firstChunk: SpeakingChunk | undefined;

  if (initialUser && adminDb) {
    try {
      // sortQueue cần progressMap đã được populate từ bước trước
      const sortedQueue = sortQueue(baseChunks, progressMap);
      const firstChunkId = sortedQueue[0]?.id;

      if (firstChunkId) {
        // Timeout riêng 400ms, không block SSR quá lâu
        const fetchWithTimeout = Promise.race([
          adminDb
            .collection('users')
            .doc(initialUser.uid)
            .collection('customChunks')
            .doc(firstChunkId)
            .get(),
          new Promise<null>((resolve) => {
            const t = setTimeout(() => resolve(null), 400);
            if (typeof t.unref === 'function') t.unref();
          }),
        ]);

        const customChunkDoc = await fetchWithTimeout;
        if (customChunkDoc && 'exists' in customChunkDoc && customChunkDoc.exists) {
          firstChunk = serializeFirestoreData<SpeakingChunk>(customChunkDoc.data() as SpeakingChunk);
        }
      }
    } catch (e) {
      console.warn('[SSR] Could not prefetch first custom chunk:', e);
    }
  }

  const dynamicTopics = computeDynamicTopics(
    baseChunks,
    progressMap,
    userStats.customChunksCount || 0
  );

  const reviewDueCount = Object.values(progressMap).filter((prog) => {
    if (!prog || prog.repetitions === 0) return false;
    return new Date(prog.dueDate).getTime() <= todayTimestamp;
  }).length;

  const totalChunksCount = userStats.totalChunksCount ?? (baseChunks.length + (userStats.customChunksCount || 0));
  const studiedKeysCount = Object.keys(progressMap).filter((k) => progressMap[k]?.repetitions > 0).length;
  const unstudiedCount = Math.max(0, totalChunksCount - studiedKeysCount);

  return toPlainObject({
    initialUser,
    initialPracticeData: {
      firstChunk,
      progressMap,
      userStats,
      dynamicTopics,
      reviewDueCount,
      unstudiedCount,
      totalChunksCount,
    },
  });
}
