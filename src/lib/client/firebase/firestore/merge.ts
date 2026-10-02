import {
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config';
import { ChunkProgress, UserStats, SpeakingChunk } from '@/types';
import { fetchUserProgressMap } from './progress';
import { fetchUserStats } from './stats';
import { fetchCustomChunks } from './customChunks';

/**
 * Cơ chế Local-to-Cloud Merge: Hợp nhất toàn bộ dữ liệu từ localStorage lên Firestore
 * khi người dùng đăng nhập Google lần đầu.
 */
export async function batchMergeLocalToCloud(
  uid: string,
  localProgress: Record<string, ChunkProgress>,
  localStats: UserStats,
  localCustomChunks: SpeakingChunk[]
): Promise<{
  mergedProgress: Record<string, ChunkProgress>;
  mergedStats: UserStats;
  mergedCustomChunks: SpeakingChunk[];
}> {
  try {
    // 1. Lấy dữ liệu hiện có trên Cloud
    const [cloudProgress, cloudStats, cloudCustomChunks] = await Promise.all([
      fetchUserProgressMap(uid),
      fetchUserStats(uid),
      fetchCustomChunks(uid),
    ]);

    // 2. Merge Progress: Ưu tiên bản ghi có lịch sử hoặc điểm cao hơn
    const mergedProgress: Record<string, ChunkProgress> = { ...cloudProgress };
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const [chunkId, localItem] of Object.entries(localProgress)) {
      const cloudItem = mergedProgress[chunkId];
      if (!cloudItem) {
        mergedProgress[chunkId] = localItem;
      } else {
        // Nếu cả hai đều có, lấy bestAccuracy cao nhất và repetitions lớn nhất
        const betterAccuracy = Math.max(localItem.bestAccuracy, cloudItem.bestAccuracy);
        const moreReps = Math.max(localItem.repetitions, cloudItem.repetitions);
        const mergedItem: ChunkProgress = {
          ...cloudItem,
          bestAccuracy: betterAccuracy,
          repetitions: moreReps,
        };
        mergedProgress[chunkId] = mergedItem;
      }
    }

    // Lưu toàn bộ progress vào document tổng hợp (Single Document Pattern - chỉ tốn 1 Write thay vì hàng trăm Write)
    if (Object.keys(localProgress).length > 0) {
      const summaryRef = doc(db, 'users', uid, 'progress_summary', 'current');
      batch.set(summaryRef, mergedProgress, { merge: true });
      batchCount++;
    }

    // 3. Merge Stats: Lấy streakDays cao nhất, gộp số câu hôm nay
    const mergedStats: UserStats = {
      streakDays: Math.max(localStats.streakDays, cloudStats?.streakDays || 1),
      lastActiveDate: cloudStats?.lastActiveDate || localStats.lastActiveDate,
      todayReviewedCount: Math.max(localStats.todayReviewedCount, cloudStats?.todayReviewedCount || 0),
      totalPracticedCount: Math.max(localStats.totalPracticedCount, cloudStats?.totalPracticedCount || 0),
      dailyGoal: cloudStats?.dailyGoal || localStats.dailyGoal || 20,
    };
    const statsRef = doc(db, 'users', uid, 'stats', 'current');
    batch.set(statsRef, mergedStats);
    batchCount++;

    // 4. Merge Custom Chunks vào Subcollection
    const existingIds = new Set(cloudCustomChunks.map((c) => c.id));
    const mergedCustomChunks = [...cloudCustomChunks];

    for (const chunk of localCustomChunks) {
      // Bảo vệ: Không bao giờ merge chunk thuộc quyền sở hữu của user khác
      if (chunk.userId && chunk.userId !== uid && chunk.userId !== 'guest') {
        continue;
      }
      if (!existingIds.has(chunk.id)) {
        const chunkToSave: SpeakingChunk = {
          ...chunk,
          userId: uid,
        };
        mergedCustomChunks.push(chunkToSave);
        const ref = doc(db, 'users', uid, 'customChunks', chunk.id);
        batch.set(ref, chunkToSave);
        batchCount++;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return {
      mergedProgress,
      mergedStats,
      mergedCustomChunks,
    };
  } catch (error) {
    console.error('Batch merge failed:', error);
    return {
      mergedProgress: localProgress,
      mergedStats: localStats,
      mergedCustomChunks: localCustomChunks,
    };
  }
}
