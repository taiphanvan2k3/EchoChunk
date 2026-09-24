import { SpeakingChunk } from '@/types';

/**
 * Pure function: Hợp nhất danh sách Base Chunks mặc định với Custom Chunks (được sửa hoặc tạo mới bởi user).
 * Có thể chạy an toàn trên cả Server (Node.js SSR) và Client (Browser).
 */
export function mergeCustomChunksWithBase(
  baseChunks: SpeakingChunk[],
  customChunks: SpeakingChunk[],
  deletedIds: Set<string> = new Set()
): SpeakingChunk[] {
  const customMap = new Map<string, SpeakingChunk>();
  for (const c of customChunks) {
    customMap.set(c.id, c);
  }

  const result: SpeakingChunk[] = [];
  for (const base of baseChunks) {
    if (deletedIds.has(base.id)) continue;
    // Nếu user đã sửa từ gốc này, ưu tiên lấy bản ghi của user
    if (customMap.has(base.id)) {
      result.push(customMap.get(base.id)!);
      customMap.delete(base.id);
    } else {
      result.push(base);
    }
  }

  // Các từ vựng mới hoàn toàn do user tạo thêm
  for (const newChunk of customMap.values()) {
    if (!deletedIds.has(newChunk.id)) {
      result.unshift(newChunk); // Hiển thị từ của tôi lên đầu
    }
  }

  return result;
}
