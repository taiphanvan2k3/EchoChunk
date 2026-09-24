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
import { mergeCustomChunksWithBase } from '@/lib/shared/chunksMerge';
import { getAdminInstances, verifyUserSession } from '@/lib/server/admin';

const data = dataset as unknown as ChunksDataset;

export interface InitialPracticeData {
  allChunks: SpeakingChunk[];
  progressMap: Record<string, ChunkProgress>;
  userStats: UserStats;
  dynamicTopics: TopicMeta[];
  practiceQueue: SpeakingChunk[];
  reviewDueCount: number;
  unstudiedCount: number;
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
  progressMap: Record<string, ChunkProgress>
): TopicMeta[] {
  const counts: Record<string, number> = {};
  let customCount = 0;
  let studiedCount = 0;

  allChunks.forEach((c) => {
    counts[c.topicId] = (counts[c.topicId] || 0) + 1;
    if (c.isCustom || c.topicId === 'CUSTOM') {
      customCount += 1;
    }
    if (progressMap[c.id] && progressMap[c.id].repetitions > 0) {
      studiedCount += 1;
    }
  });

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
  let customChunks: SpeakingChunk[] = [];
  const progressMap: Record<string, ChunkProgress> = {};
  let userStats: UserStats = defaultStats;

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
      if (db) {
        try {
          const userDocRef = db.collection('users').doc(decoded.uid);

          const [customSnap, progressSnap, statsDoc, rootUserDoc] = await Promise.all([
            userDocRef.collection('customChunks').get(),
            userDocRef.collection('progress').get(),
            userDocRef.collection('stats').doc('current').get(),
            userDocRef.get(),
          ]);

          customChunks = customSnap.docs.map((doc) => {
            const d = serializeFirestoreData<Record<string, unknown>>(doc.data());
            return {
              id: doc.id,
              topicId: (d.topicId as string) || 'CUSTOM',
              topicName: (d.topicName as string) || 'Từ vựng của tôi',
              topicIcon: (d.topicIcon as string) || '⭐',
              number: Number(d.number) || 1,
              chunk: (d.chunk as string) || '',
              meaning: (d.meaning as string) || '',
              level: (d.level as string) || 'B1',
              exampleSentence: (d.exampleSentence as string) || '',
              cleanExample: (d.cleanExample as string) || (d.exampleSentence as string) || '',
              ipa: (d.ipa as string) || '',
              chunkIpa: (d.chunkIpa as string) || '',
              sentenceIpa: (d.sentenceIpa as string) || '',
              translation: (d.translation as string) || '',
              context: (d.context as string) || '',
              tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
              isCustom: true,
              userId: decoded.uid,
            } as SpeakingChunk;
          });

          progressSnap.docs.forEach((doc) => {
            const d = serializeFirestoreData<Record<string, unknown>>(doc.data());
            progressMap[doc.id] = {
              chunkId: (d.chunkId as string) || doc.id,
              repetitions: Number(d.repetitions) || 0,
              intervalDays: Number(d.intervalDays) || 1,
              easeFactor: Number(d.easeFactor) || 2.5,
              dueDate: typeof d.dueDate === 'string' ? d.dueDate : new Date().toISOString(),
              lastReviewed: typeof d.lastReviewed === 'string' ? d.lastReviewed : new Date().toISOString(),
              confidenceScore: ((d.confidenceScore as number) || 3) as SRSRating,
              accuracyHistory: Array.isArray(d.accuracyHistory) ? (d.accuracyHistory as number[]) : [],
              bestAccuracy: Number(d.bestAccuracy) || 0,
            };
          });

          const statsSource = statsDoc.exists ? statsDoc : (rootUserDoc.exists ? rootUserDoc : null);
          if (statsSource && statsSource.data()) {
            const raw = serializeFirestoreData<Record<string, unknown>>(statsSource.data() || {});
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

            userStats = {
              streakDays,
              lastActiveDate: today,
              todayReviewedCount,
              totalPracticedCount: Number(raw.totalPracticedCount) || 0,
              dailyGoal: Number(raw.dailyGoal) || 20,
            };
          }
        } catch (error) {
          console.error('[Server Data] Error pre-fetching user data from Firestore:', error);
        }
      }
    }
  }

  const allChunks = mergeCustomChunksWithBase(data.chunks, customChunks);
  const dynamicTopics = computeDynamicTopics(allChunks, progressMap);
  const practiceQueue = sortQueue(allChunks, progressMap);

  const reviewDueCount = allChunks.filter((c) => {
    const prog = progressMap[c.id];
    if (!prog || prog.repetitions === 0) return false;
    return new Date(prog.dueDate).getTime() <= todayTimestamp;
  }).length;

  const unstudiedCount = allChunks.filter((c) => !progressMap[c.id]).length;

  return toPlainObject({
    initialUser,
    initialPracticeData: {
      allChunks,
      progressMap,
      userStats,
      dynamicTopics,
      practiceQueue,
      reviewDueCount,
      unstudiedCount,
    },
  });
}
