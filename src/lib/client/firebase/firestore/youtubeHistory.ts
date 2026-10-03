import {
  doc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import { db } from '../config';
import { YouTubeHistoryItem } from '@/types/youtube';
import {
  tracedSetDoc,
  tracedDeleteDoc,
  tracedGetDocs,
  tracedWriteBatch
} from './tracer';

const MAX_CLOUD_HISTORY = 30;

/**
 * Lưu hoặc cập nhật thông tin 1 video trong lịch sử học của người dùng lên Cloud Firestore
 */
export async function syncYouTubeHistoryToCloud(
  uid: string,
  item: YouTubeHistoryItem
): Promise<void> {
  if (!uid || uid === 'guest') return;

  try {
    const ref = doc(db, 'users', uid, 'youtubeHistory', item.videoId);
    await tracedSetDoc(
      ref,
      {
        videoId: item.videoId,
        videoUrl: item.videoUrl,
        videoTitle: item.videoTitle,
        thumbnailUrl: item.thumbnailUrl,
        totalSentences: item.totalSentences,
        completedSentencesCount: item.completedSentencesCount || 0,
        lastStudiedAt: item.lastStudiedAt || Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
      'syncYouTubeHistoryToCloud'
    );
  } catch (error) {
    console.error(`[Firestore] Failed to sync video history ${item.videoId} for user ${uid}:`, error);
  }
}

/**
 * Xóa 1 video khỏi lịch sử học trên Cloud Firestore
 */
export async function removeYouTubeHistoryFromCloud(
  uid: string,
  videoId: string
): Promise<void> {
  if (!uid || uid === 'guest') return;

  try {
    const ref = doc(db, 'users', uid, 'youtubeHistory', videoId);
    await tracedDeleteDoc(ref, 'removeYouTubeHistoryFromCloud');
  } catch (error) {
    console.error(`[Firestore] Failed to remove video history ${videoId} for user ${uid}:`, error);
  }
}

/**
 * Xóa toàn bộ lịch sử video của người dùng trên Cloud Firestore
 */
export async function clearAllYouTubeHistoryOnCloud(uid: string): Promise<void> {
  if (!uid || uid === 'guest') return;

  try {
    const colRef = collection(db, 'users', uid, 'youtubeHistory');
    const snapshot = await tracedGetDocs(colRef, 'clearAllYouTubeHistory:fetch');
    const batch = tracedWriteBatch(db, 'clearAllYouTubeHistory:batch');

    snapshot.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error(`[Firestore] Failed to clear all video history for user ${uid}:`, error);
  }
}

/**
 * Lấy danh sách video đã học gần đây của người dùng từ Cloud Firestore.
 */
export async function fetchYouTubeHistoryFromCloud(
  uid: string,
  limitCount: number = MAX_CLOUD_HISTORY
): Promise<YouTubeHistoryItem[]> {
  if (!uid || uid === 'guest') return [];

  try {
    const colRef = collection(db, 'users', uid, 'youtubeHistory');
    let snapshot;
    try {
      const q = query(colRef, orderBy('lastStudiedAt', 'desc'), limit(limitCount));
      snapshot = await tracedGetDocs(q, 'fetchYouTubeHistoryFromCloud');
    } catch {
      const q = query(colRef, limit(limitCount));
      snapshot = await tracedGetDocs(q, 'fetchYouTubeHistoryFromCloud:fallback');
    }

    const list: YouTubeHistoryItem[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      const lastStudied =
        data.lastStudiedAt ||
        (data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now());

      list.push({
        videoId: data.videoId || d.id,
        videoUrl: data.videoUrl || `https://www.youtube.com/watch?v=${data.videoId || d.id}`,
        videoTitle: data.videoTitle || 'YouTube Speaking Practice',
        thumbnailUrl:
          data.thumbnailUrl || `https://i.ytimg.com/vi/${data.videoId || d.id}/mqdefault.jpg`,
        totalSentences: data.totalSentences || 0,
        completedSentencesCount: data.completedSentencesCount || 0,
        lastStudiedAt: lastStudied,
      });
    });

    // Sắp xếp theo thứ tự học gần nhất lên đầu
    return list.sort((a, b) => (b.lastStudiedAt || 0) - (a.lastStudiedAt || 0));
  } catch (error) {
    console.error(`[Firestore] Failed to fetch youtube history for user ${uid}:`, error);
    return [];
  }
}

/**
 * Lấy danh sách video đã học theo từng trang (cursor-based pagination).
 */
export async function fetchYouTubeHistoryPageFromCloud(
  uid: string,
  limitCount: number = 10,
  cursorTimestamp?: number
): Promise<{ items: YouTubeHistoryItem[]; nextCursor: number | null; hasMore: boolean }> {
  if (!uid || uid === 'guest') return { items: [], nextCursor: null, hasMore: false };

  try {
    const colRef = collection(db, 'users', uid, 'youtubeHistory');
    const fetchLimit = limitCount + 1;
    let snapshot;

    try {
      if (cursorTimestamp && !isNaN(cursorTimestamp) && cursorTimestamp > 0) {
        const q = query(
          colRef,
          orderBy('lastStudiedAt', 'desc'),
          startAfter(cursorTimestamp),
          limit(fetchLimit)
        );
        snapshot = await tracedGetDocs(q, 'fetchYouTubeHistoryPageFromCloud');
      } else {
        const q = query(
          colRef,
          orderBy('lastStudiedAt', 'desc'),
          limit(fetchLimit)
        );
        snapshot = await tracedGetDocs(q, 'fetchYouTubeHistoryPageFromCloud');
      }
    } catch (err) {
      console.warn('[Firestore] Fallback query for youtubeHistory page:', err);
      const q = query(colRef, limit(fetchLimit));
      snapshot = await tracedGetDocs(q, 'fetchYouTubeHistoryPageFromCloud:fallback');
    }

    const list: YouTubeHistoryItem[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      const lastStudied =
        data.lastStudiedAt ||
        (data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now());

      list.push({
        videoId: data.videoId || d.id,
        videoUrl: data.videoUrl || `https://www.youtube.com/watch?v=${data.videoId || d.id}`,
        videoTitle: data.videoTitle || 'YouTube Speaking Practice',
        thumbnailUrl:
          data.thumbnailUrl || `https://i.ytimg.com/vi/${data.videoId || d.id}/mqdefault.jpg`,
        totalSentences: data.totalSentences || 0,
        completedSentencesCount: data.completedSentencesCount || 0,
        lastStudiedAt: lastStudied,
      });
    });

    const hasMore = list.length > limitCount;
    const pagedItems = hasMore ? list.slice(0, limitCount) : list;
    const lastItem = pagedItems[pagedItems.length - 1];
    const nextCursor = hasMore && lastItem?.lastStudiedAt ? lastItem.lastStudiedAt : null;

    return {
      items: pagedItems,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    console.error(`[Firestore] Failed to fetch youtube history page for user ${uid}:`, error);
    return { items: [], nextCursor: null, hasMore: false };
  }
}
