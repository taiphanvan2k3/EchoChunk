// LocalStorage Manager for YouTube Study History (Partitioned by User UID)
import { YouTubeHistoryItem } from '@/types/youtube';

const BASE_HISTORY_KEY = 'echo_yt_history_v1';
const MAX_HISTORY_ITEMS = 20;

function getStorageKey(uid?: string | null): string {
  if (!uid || uid === 'guest') {
    return `${BASE_HISTORY_KEY}_guest`;
  }
  return `${BASE_HISTORY_KEY}_${uid}`;
}

/**
 * Lấy danh sách lịch sử video đã học của người dùng, sắp xếp theo thời gian gần nhất
 */
export function getYouTubeHistory(uid?: string | null): YouTubeHistoryItem[] {
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
    console.error('[YouTubeHistory] Lỗi khi đọc lịch sử video:', err);
    return [];
  }
}

/**
 * Lưu hoặc cập nhật một video vào đầu danh sách lịch sử
 */
export function saveYouTubeHistoryItem(
  item: Omit<YouTubeHistoryItem, 'lastStudiedAt'> & { lastStudiedAt?: number },
  uid?: string | null
): void {
  if (typeof window === 'undefined') return;

  try {
    const currentList = getYouTubeHistory(uid);
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
    const currentList = getYouTubeHistory(uid);
    const target = currentList.find((i) => i.videoId === videoId);
    if (!target) return;

    target.completedSentencesCount = completedCount;
    target.lastStudiedAt = Date.now();

    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(currentList));
  } catch (err) {
    console.error('[YouTubeHistory] Lỗi khi cập nhật tiến độ video:', err);
  }
}

/**
 * Xóa một video khỏi lịch sử học
 */
export function removeYouTubeHistoryItem(videoId: string, uid?: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    const currentList = getYouTubeHistory(uid);
    const filtered = currentList.filter((i) => i.videoId !== videoId);
    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(filtered));
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
