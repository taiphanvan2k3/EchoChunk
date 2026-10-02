import dataset from '@/data/speaking-chunks.json';
import { SpeakingChunk } from '@/types';

const baseChunkIds = new Set<string>((dataset.chunks as SpeakingChunk[]).map((c) => c.id));

export const BASE_CHUNKS_COUNT = baseChunkIds.size;

export type ChunkKind = 'SYSTEM' | 'USER_EDITED' | 'USER_CREATED';

/**
 * Kiểm tra xem ID có thuộc bộ từ vựng mặc định của hệ thống (361 câu gốc) hay không.
 */
export function isBaseChunkId(id: string): boolean {
  return baseChunkIds.has(id);
}

/**
 * Phân định rạch ròi 3 dạng từ vựng mà không cần kiểm tra topicId:
 * 1. Không nằm trong 361 câu gốc -> 100% là User tự tạo mới (`USER_CREATED`).
 * 2. Nằm trong 361 câu gốc nhưng có cờ `isCustom` -> User đã sửa câu gốc (`USER_EDITED`).
 * 3. Còn lại -> Câu hệ thống nguyên bản (`SYSTEM`).
 */
export function getChunkKind(chunk: SpeakingChunk): ChunkKind {
  if (!baseChunkIds.has(chunk.id)) return 'USER_CREATED';
  return chunk.isCustom ? 'USER_EDITED' : 'SYSTEM';
}

/**
 * Chunk thuộc sở hữu của User (gồm cả từ tự tạo mới và từ hệ thống đã sửa).
 */
export function isUserOwnedChunk(chunk: SpeakingChunk): boolean {
  return !baseChunkIds.has(chunk.id) || !!chunk.isCustom;
}
