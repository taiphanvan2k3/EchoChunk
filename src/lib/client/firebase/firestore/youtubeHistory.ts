import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config';
import { YouTubeHistoryItem } from '@/types/youtube';

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
    await setDoc(
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
      { merge: true }
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
    await deleteDoc(ref);
  } catch (error) {
    console.error(`[Firestore] Failed to remove video history ${videoId} for user ${uid}:`, error);
  }
}

/**
 * Lấy toàn bộ danh sách video đã học của người dùng từ Cloud Firestore
 */
export async function fetchYouTubeHistoryFromCloud(
  uid: string
): Promise<YouTubeHistoryItem[]> {
  if (!uid || uid === 'guest') return [];

  try {
    const colRef = collection(db, 'users', uid, 'youtubeHistory');
    const snapshot = await getDocs(colRef);
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
 * Hợp nhất lịch sử video từ LocalStorage và Cloud Firestore
 */
export async function mergeYouTubeHistoryLocalAndCloud(
  uid: string,
  localItems: YouTubeHistoryItem[]
): Promise<YouTubeHistoryItem[]> {
  if (!uid || uid === 'guest') return localItems;

  try {
    const cloudItems = await fetchYouTubeHistoryFromCloud(uid);
    const itemMap = new Map<string, YouTubeHistoryItem>();

    // Đưa cloud items vào map trước
    cloudItems.forEach((item) => {
      itemMap.set(item.videoId, { ...item });
    });

    const batch = writeBatch(db);
    let batchCount = 0;

    // Hợp nhất với local items
    for (const local of localItems) {
      const existing = itemMap.get(local.videoId);
      if (!existing) {
        itemMap.set(local.videoId, local);
        const ref = doc(db, 'users', uid, 'youtubeHistory', local.videoId);
        batch.set(
          ref,
          {
            ...local,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        batchCount++;
      } else {
        // Giữ tiến độ số câu hoàn thành cao hơn và mốc thời gian mới nhất
        const higherCompleted = Math.max(
          existing.completedSentencesCount || 0,
          local.completedSentencesCount || 0
        );
        const latestStudied = Math.max(
          existing.lastStudiedAt || 0,
          local.lastStudiedAt || 0
        );

        if (
          higherCompleted !== existing.completedSentencesCount ||
          latestStudied !== existing.lastStudiedAt
        ) {
          const mergedItem: YouTubeHistoryItem = {
            ...existing,
            completedSentencesCount: higherCompleted,
            lastStudiedAt: latestStudied,
          };
          itemMap.set(local.videoId, mergedItem);
          const ref = doc(db, 'users', uid, 'youtubeHistory', local.videoId);
          batch.set(
            ref,
            {
              ...mergedItem,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          batchCount++;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    const mergedList = Array.from(itemMap.values()).sort(
      (a, b) => (b.lastStudiedAt || 0) - (a.lastStudiedAt || 0)
    );

    return mergedList.slice(0, MAX_CLOUD_HISTORY);
  } catch (error) {
    console.error(`[Firestore] Failed to merge youtube history for user ${uid}:`, error);
    return localItems;
  }
}
