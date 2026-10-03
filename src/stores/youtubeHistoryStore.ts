// Cloud-First In-Memory External Store for YouTube Study History
// Pure TypeScript Store (Không phụ thuộc LocalStorage)

import { YouTubeHistoryItem } from "@/types/youtube";
import {
  syncYouTubeHistoryToCloud,
  removeYouTubeHistoryFromCloud,
  clearAllYouTubeHistoryOnCloud,
  fetchYouTubeHistoryFromCloud
} from "@/lib/client/firebase/firestore/youtubeHistory";

export type StoreListener = () => void;
const listeners = new Set<StoreListener>();

let memoryItems: YouTubeHistoryItem[] = [];
let loadedUid: string | null | undefined = undefined;
let isLoading = false;

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): YouTubeHistoryItem[] {
  return memoryItems;
}

export function getIsLoading(): boolean {
  return isLoading;
}

export function isStoreLoading(uid?: string | null): boolean {
  // Người dùng chưa đăng nhập hoặc là guest -> Không có dữ liệu Cloud để nạp -> Không loading
  if (!uid || uid === "guest") return false;
  if (loadedUid !== uid) return true; // Chưa hoàn tất nạp cho user này
  return isLoading;
}

/**
 * Nạp danh sách video trực tiếp từ Cloud Firestore
 */
export async function load(uid?: string | null, force = false): Promise<YouTubeHistoryItem[]> {
  if (!uid || uid === "guest") {
    memoryItems = [];
    loadedUid = uid;
    isLoading = false;
    emitChange();
    return memoryItems;
  }

  // Nếu đã nạp cho cùng uid và không yêu cầu force, không fetch lại
  if (!force && loadedUid === uid) {
    return memoryItems;
  }

  isLoading = true;
  emitChange();

  try {
    const cloudItems = await fetchYouTubeHistoryFromCloud(uid);
    memoryItems = cloudItems;
    loadedUid = uid;
    return cloudItems;
  } catch (err) {
    console.error("[YouTubeHistoryStore] Lỗi nạp lịch sử từ Cloud:", err);
    memoryItems = [];
    loadedUid = uid;
    return [];
  } finally {
    isLoading = false;
    emitChange();
  }
}

/**
 * Lưu hoặc cập nhật một video vào lịch sử học (In-Memory + Cloud Firestore)
 */
export function save(
  item: Omit<YouTubeHistoryItem, "lastStudiedAt"> & { lastStudiedAt?: number },
  uid?: string | null
): void {
  const fullItem: YouTubeHistoryItem = {
    ...item,
    lastStudiedAt: item.lastStudiedAt || Date.now()
  };

  // Cập nhật ngay trong memory
  const nextList = [fullItem, ...memoryItems.filter((i) => i.videoId !== item.videoId)];
  memoryItems = nextList;
  emitChange();

  if (uid && uid !== "guest") {
    syncYouTubeHistoryToCloud(uid, fullItem).catch((err: unknown) => {
      console.warn("[YouTubeHistoryStore] Lỗi sync video lên Cloud:", err);
    });
  }
}

/**
 * Cập nhật số lượng câu đã hoàn thành cho một video trong lịch sử
 */
export function updateProgress(videoId: string, completedCount: number, uid?: string | null): void {
  const target = memoryItems.find((i) => i.videoId === videoId);
  if (!target) return;

  const updatedItem: YouTubeHistoryItem = {
    ...target,
    completedSentencesCount: completedCount,
    lastStudiedAt: Date.now()
  };

  memoryItems = [updatedItem, ...memoryItems.filter((i) => i.videoId !== videoId)];
  emitChange();

  if (uid && uid !== "guest") {
    syncYouTubeHistoryToCloud(uid, updatedItem).catch((err: unknown) => {
      console.warn("[YouTubeHistoryStore] Lỗi sync tiến độ video lên Cloud:", err);
    });
  }
}

/**
 * Xóa một video khỏi lịch sử học (In-Memory + Cloud Firestore)
 */
export function remove(videoId: string, uid?: string | null): void {
  memoryItems = memoryItems.filter((i) => i.videoId !== videoId);
  emitChange();

  if (uid && uid !== "guest") {
    removeYouTubeHistoryFromCloud(uid, videoId).catch((err: unknown) => {
      console.warn("[YouTubeHistoryStore] Lỗi xóa video trên Cloud:", err);
    });
  }
}

/**
 * Xóa toàn bộ lịch sử video của người dùng hiện tại
 */
export function clear(uid?: string | null): void {
  memoryItems = [];
  emitChange();

  if (uid && uid !== "guest") {
    clearAllYouTubeHistoryOnCloud(uid).catch((err: unknown) => {
      console.warn("[YouTubeHistoryStore] Lỗi xóa toàn bộ lịch sử trên Cloud:", err);
    });
  }
}

export const youtubeHistoryStore = {
  subscribe,
  getSnapshot,
  getIsLoading,
  isStoreLoading,
  load,
  save,
  updateProgress,
  remove,
  clear
};
