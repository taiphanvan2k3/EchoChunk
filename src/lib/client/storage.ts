// Storage Utility (Zero-LocalStorage for Study Data)
// Toàn bộ dữ liệu học tập (Chunks, Progress, Stats) đã chuyển sang Cloud-First (In-Memory + Firestore)

export function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Xóa sạch toàn bộ key LocalStorage di sản từ các phiên bản cũ
 * để giải phóng dung lượng và tránh xung đột state trên trình duyệt.
 */
export function clearAllLegacyLocalStorage(): void {
  if (typeof window === "undefined") return;

  const legacyPrefixes = [
    "echo_chunk_progress",
    "echo_chunk_stats",
    "echo_chunk_custom_chunks",
    "echo_chunk_deleted_ids",
    "echo_chunk_last_synced",
    "echo_yt_history"
  ];

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && legacyPrefixes.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (err) {
    console.warn("[Storage] Không thể xóa localStorage legacy:", err);
  }
}

/**
 * Tương thích ngược: Xóa sạch dữ liệu khách vãng lai
 */
export function clearGuestStorage(): void {
  clearAllLegacyLocalStorage();
}
