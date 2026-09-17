// Local-First & Cloud Firestore Manager for YouTube Study History
import { YouTubeHistoryItem } from '@/types/youtube';
import {
  syncYouTubeHistoryToCloud,
  removeYouTubeHistoryFromCloud,
  mergeYouTubeHistoryLocalAndCloud,
} from './firebase/firestore/youtubeHistory';

const BASE_HISTORY_KEY = 'echo_yt_history_v1';
const MAX_HISTORY_ITEMS = 20;

function getStorageKey(uid?: string | null): string {
  if (!uid || uid === 'guest') {
    return `${BASE_HISTORY_KEY}_guest`;
  }
  return `${BASE_HISTORY_KEY}_${uid}`;
}

/**
 * Lấy danh sách lịch sử video đã học của người dùng từ LocalStorage (bộ nhớ cục bộ trình duyệt)
 */
export function getLocalYouTubeHistory(uid?: string | null): YouTubeHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const key = getStorageKey(uid);
    let raw = localStorage.getItem(key);

    // Fallback cho guest nếu có key cũ
    if (!raw && (!uid || uid === 'guest')) {
      raw = localStorage.getItem(BASE_HISTORY_KEY);
      if (raw) {
        localStorage.setItem(key, raw);
        localStorage.removeItem(BASE_HISTORY_KEY);
      }
    }

    if (!raw) return [];
    const parsed: YouTubeHistoryItem[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.sort((a, b) => (b.lastStudiedAt || 0) - (a.lastStudiedAt || 0));
  } catch (err) {
    console.error('[YouTubeHistory] Lỗi khi đọc lịch sử video từ LocalStorage:', err);
    return [];
  }
}

/**
 * Đồng bộ lịch sử video giữa LocalStorage và Cloud Firestore.
 * Giúp người dùng chuyển đổi trình duyệt / thiết bị vẫn giữ nguyên toàn bộ video đã học.
 */
export async function fetchAndSyncYouTubeHistory(
  uid?: string | null
): Promise<YouTubeHistoryItem[]> {
  const localList = getLocalYouTubeHistory(uid);
  if (!uid || uid === 'guest') {
    return localList;
  }

  try {
    const mergedList = await mergeYouTubeHistoryLocalAndCloud(uid, localList);
    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(mergedList));
    return mergedList;
  } catch (err) {
    console.error('[YouTubeHistory] Lỗi khi đồng bộ lịch sử video với Cloud:', err);
    return localList;
  }
}

/**
 * Lưu hoặc cập nhật một video vào đầu danh sách lịch sử (lưu LocalStorage + sync Cloud Firestore)
 */
export function saveYouTubeHistoryItem(
  item: Omit<YouTubeHistoryItem, 'lastStudiedAt'> & { lastStudiedAt?: number },
  uid?: string | null
): void {
  if (typeof window === 'undefined') return;

  try {
    const currentList = getLocalYouTubeHistory(uid);
    const existingIndex = currentList.findIndex((i) => i.videoId === item.videoId);

    const updatedItem: YouTubeHistoryItem = {
      ...item,
      lastStudiedAt: item.lastStudiedAt || Date.now(),
    };

    let newList: YouTubeHistoryItem[];
    if (existingIndex >= 0) {
      // Giữ lại tiến độ cao hơn nếu có
      const existing = currentList[existingIndex];
      updatedItem.completedSentencesCount = Math.max(
        existing.completedSentencesCount || 0,
        item.completedSentencesCount || 0
      );
      newList = [
        updatedItem,
        ...currentList.slice(0, existingIndex),
        ...currentList.slice(existingIndex + 1),
      ];
    } else {
      newList = [updatedItem, ...currentList];
    }

    // Giới hạn số lượng lưu tối đa
    if (newList.length > MAX_HISTORY_ITEMS) {
      newList = newList.slice(0, MAX_HISTORY_ITEMS);
    }

    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(newList));

    // Đồng bộ lên Cloud Firestore nếu người dùng đã đăng nhập
    if (uid && uid !== 'guest') {
      syncYouTubeHistoryToCloud(uid, updatedItem).catch((err) => {
        console.warn('[YouTubeHistory] Lỗi sync video lên Cloud:', err);
      });
    }
  } catch (err) {
    console.error('[YouTubeHistory] Lỗi khi lưu video vào lịch sử:', err);
  }
}

/**
 * Cập nhật số lượng câu đã luyện tập cho một video trong lịch sử
 */
export function updateYouTubeHistoryProgress(
  videoId: string,
  completedCount: number,
  uid?: string | null
): void {
  if (typeof window === 'undefined') return;

  try {
    const currentList = getLocalYouTubeHistory(uid);
    const target = currentList.find((i) => i.videoId === videoId);
    if (!target) return;

    target.completedSentencesCount = completedCount;
    target.lastStudiedAt = Date.now();

    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(currentList));

    // Đồng bộ tiến độ lên Cloud Firestore nếu người dùng đã đăng nhập
    if (uid && uid !== 'guest') {
      syncYouTubeHistoryToCloud(uid, target).catch((err) => {
        console.warn('[YouTubeHistory] Lỗi sync tiến độ video lên Cloud:', err);
      });
    }
  } catch (err) {
    console.error('[YouTubeHistory] Lỗi khi cập nhật tiến độ video:', err);
  }
}

/**
 * Xóa một video khỏi lịch sử học (xóa LocalStorage + xóa Cloud Firestore)
 */
export function removeYouTubeHistoryItem(videoId: string, uid?: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    const currentList = getLocalYouTubeHistory(uid);
    const filtered = currentList.filter((i) => i.videoId !== videoId);
    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(filtered));

    // Xóa khỏi Cloud Firestore nếu người dùng đã đăng nhập
    if (uid && uid !== 'guest') {
      removeYouTubeHistoryFromCloud(uid, videoId).catch((err) => {
        console.warn('[YouTubeHistory] Lỗi xóa video trên Cloud:', err);
      });
    }
  } catch (err) {
    console.error('[YouTubeHistory] Lỗi khi xóa video khỏi lịch sử:', err);
  }
}

/**
 * Xóa toàn bộ lịch sử video của người dùng hiện tại
 */
export function clearYouTubeHistory(uid?: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(uid);
    localStorage.removeItem(key);
  } catch (err) {
    console.error('[YouTubeHistory] Lỗi khi xóa toàn bộ lịch sử:', err);
  }
}
