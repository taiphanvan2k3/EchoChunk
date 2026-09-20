// Local-First & Cloud Firestore External Store for YouTube Study History
// Pure TypeScript Store (Không phụ thuộc React runtime)

import { YouTubeHistoryItem } from "@/types/youtube";
import {
  syncYouTubeHistoryToCloud,
  removeYouTubeHistoryFromCloud,
  mergeYouTubeHistoryLocalAndCloud
} from "@/lib/firebase/firestore/youtubeHistory";

const BASE_HISTORY_KEY = "echo_yt_history_v1";
const MAX_HISTORY_ITEMS = 20;

export function getStorageKey(uid?: string | null): string {
  if (!uid || uid === "guest") {
    return `${BASE_HISTORY_KEY}_guest`;
  }
  return `${BASE_HISTORY_KEY}_${uid}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pub/Sub Listener Mechanism
// ─────────────────────────────────────────────────────────────────────────────
export type StoreListener = () => void;
const listeners = new Set<StoreListener>();

function emitChange(): void {
  cachedRaw = null;
  cachedSnapshot = null;
  listeners.forEach((listener) => listener());
}

// Lắng nghe sự kiện storage từ các tab trình duyệt khác (Cross-tab sync)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith(BASE_HISTORY_KEY)) {
      emitChange();
    }
  });
}

/**
 * Đăng ký lắng nghe thay đổi dữ liệu trong store
 */
export function subscribe(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot Caching (Đảm bảo reference stability theo quy chuẩn useSyncExternalStore)
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_ARRAY: YouTubeHistoryItem[] = [];
let cachedUid: string | null | undefined = undefined;
let cachedRaw: string | null = null;
let cachedSnapshot: YouTubeHistoryItem[] | null = null;

export function getSnapshot(uid?: string | null): YouTubeHistoryItem[] {
  if (typeof window === "undefined") return EMPTY_ARRAY;

  const key = getStorageKey(uid);
  const raw = localStorage.getItem(key);

  // Nếu key và chuỗi JSON không thay đổi, giữ nguyên tham chiếu reference
  if (cachedUid === uid && cachedRaw === raw && cachedSnapshot !== null) {
    return cachedSnapshot;
  }

  cachedUid = uid;
  cachedRaw = raw;

  if (!raw) {
    cachedSnapshot = EMPTY_ARRAY;
    return cachedSnapshot;
  }

  try {
    const parsed = JSON.parse(raw);
    cachedSnapshot = Array.isArray(parsed)
      ? parsed.sort((a, b) => (b.lastStudiedAt || 0) - (a.lastStudiedAt || 0))
      : EMPTY_ARRAY;
  } catch {
    cachedSnapshot = EMPTY_ARRAY;
  }

  return cachedSnapshot;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Mutations & Cloud Sync Actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Đồng bộ lịch sử video giữa LocalStorage và Cloud Firestore.
 */
export async function fetchAndSync(uid?: string | null): Promise<YouTubeHistoryItem[]> {
  const localList = getSnapshot(uid);
  if (!uid || uid === "guest") {
    return localList;
  }

  try {
    const mergedList = await mergeYouTubeHistoryLocalAndCloud(uid, localList);
    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(mergedList));

    emitChange();
    return mergedList;
  } catch (err) {
    console.error("[YouTubeHistoryStore] Lỗi đồng bộ lịch sử video với Cloud:", err);
    return localList;
  }
}

/**
 * Lưu hoặc cập nhật một video vào đầu danh sách lịch sử (LocalStorage + Cloud Firestore)
 */
export function save(
  item: Omit<YouTubeHistoryItem, "lastStudiedAt"> & { lastStudiedAt?: number },
  uid?: string | null
): void {
  if (typeof window === "undefined") return;

  try {
    const currentList = getSnapshot(uid);
    const existingIndex = currentList.findIndex((i) => i.videoId === item.videoId);

    const updatedItem: YouTubeHistoryItem = {
      ...item,
      lastStudiedAt: item.lastStudiedAt || Date.now()
    };

    let newList: YouTubeHistoryItem[];
    if (existingIndex >= 0) {
      const existing = currentList[existingIndex];
      updatedItem.completedSentencesCount = Math.max(
        existing.completedSentencesCount || 0,
        item.completedSentencesCount || 0
      );
      newList = [updatedItem, ...currentList.slice(0, existingIndex), ...currentList.slice(existingIndex + 1)];
    } else {
      newList = [updatedItem, ...currentList];
    }

    if (newList.length > MAX_HISTORY_ITEMS) {
      newList = newList.slice(0, MAX_HISTORY_ITEMS);
    }

    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(newList));
    emitChange();

    if (uid && uid !== "guest") {
      syncYouTubeHistoryToCloud(uid, updatedItem).catch((err) => {
        console.warn("[YouTubeHistoryStore] Lỗi sync video lên Cloud:", err);
      });
    }
  } catch (err) {
    console.error("[YouTubeHistoryStore] Lỗi khi lưu video vào lịch sử:", err);
  }
}

/**
 * Cập nhật số lượng câu đã hoàn thành cho một video trong lịch sử
 */
export function updateProgress(videoId: string, completedCount: number, uid?: string | null): void {
  if (typeof window === "undefined") return;

  try {
    const currentList = getSnapshot(uid);
    const target = currentList.find((i) => i.videoId === videoId);
    if (!target) return;

    target.completedSentencesCount = completedCount;
    target.lastStudiedAt = Date.now();

    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(currentList));
    emitChange();

    if (uid && uid !== "guest") {
      syncYouTubeHistoryToCloud(uid, target).catch((err) => {
        console.warn("[YouTubeHistoryStore] Lỗi sync tiến độ video lên Cloud:", err);
      });
    }
  } catch (err) {
    console.error("[YouTubeHistoryStore] Lỗi khi cập nhật tiến độ video:", err);
  }
}

/**
 * Xóa một video khỏi lịch sử học (LocalStorage + Cloud Firestore)
 */
export function remove(videoId: string, uid?: string | null): void {
  if (typeof window === "undefined") return;

  try {
    const currentList = getSnapshot(uid);
    const filtered = currentList.filter((i) => i.videoId !== videoId);
    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(filtered));
    emitChange();

    if (uid && uid !== "guest") {
      removeYouTubeHistoryFromCloud(uid, videoId).catch((err) => {
        console.warn("[YouTubeHistoryStore] Lỗi xóa video trên Cloud:", err);
      });
    }
  } catch (err) {
    console.error("[YouTubeHistoryStore] Lỗi khi xóa video khỏi lịch sử:", err);
  }
}

/**
 * Xóa toàn bộ lịch sử video của người dùng hiện tại
 */
export function clear(uid?: string | null): void {
  if (typeof window === "undefined") return;

  try {
    const key = getStorageKey(uid);
    localStorage.removeItem(key);
    emitChange();
  } catch (err) {
    console.error("[YouTubeHistoryStore] Lỗi khi xóa toàn bộ lịch sử:", err);
  }
}

/**
 * Singleton Store Object đóng gói toàn bộ API của YouTube History Store
 */
export const youtubeHistoryStore = {
  subscribe,
  getSnapshot,
  fetchAndSync,
  save,
  updateProgress,
  remove,
  clear
};
