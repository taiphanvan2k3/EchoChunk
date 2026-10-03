import { SpeakingChunk } from "@/types";
import { AuthUser } from "@/lib/client/firebase/auth";
import { ChunkStore } from "@/stores/chunkStore";
import { ProgressStore } from "@/stores/progressStore";
import { useModalStore, useSessionStore } from "@/stores";
import { isBaseChunkId, BASE_CHUNKS_COUNT } from "@/lib/shared/chunkClassification";
import { syncCustomChunk, deleteCustomChunk, syncUserStats } from "@/lib/client/firebase/firestore";

/**
 * Action thêm hoặc sửa câu:
 * 1. Cập nhật Zustand Store tức thì (0ms)
 * 2. Đồng bộ Firestore nếu đã đăng nhập
 */
export function saveChunkWithSync(
  chunk: SpeakingChunk,
  user: AuthUser | null,
  chunkStore: ChunkStore,
  progressStore: ProgressStore
): void {
  if (!user) {
    useModalStore.getState().openAuthPrompt();
    return;
  }

  const chunkWithUser: SpeakingChunk = {
    ...chunk,
    userId: user.uid
  };

  chunkStore.getState().addOrUpdateChunk(chunkWithUser);
  syncCustomChunk(user.uid, chunkWithUser);

  const nextCustom = chunkStore.getState().customChunks;
  const userCreatedCount = nextCustom.filter((c) => !isBaseChunkId(c.id)).length;
  const nextTotalChunksCount = BASE_CHUNKS_COUNT + userCreatedCount;

  const currentStats = progressStore.getState().userStats;
  const nextStats = {
    ...currentStats,
    customChunksCount: nextCustom.length,
    totalChunksCount: nextTotalChunksCount
  };
  progressStore.getState().setUserStats(nextStats);
  syncUserStats(user.uid, nextStats);

  useModalStore.getState().closeChunkModal();
}

/**
 * Action xóa câu:
 * 1. Xóa khỏi Zustand Store tức thì (0ms)
 * 2. Xóa khỏi Firestore nếu đã đăng nhập
 */
export function deleteChunkWithSync(
  chunkId: string,
  user: AuthUser | null,
  chunkStore: ChunkStore,
  progressStore: ProgressStore
): void {
  if (!user) return;

  chunkStore.getState().removeChunk(chunkId);
  const queueIndex = useSessionStore.getState().queueIndex;
  if (queueIndex > 0) {
    useSessionStore.getState().setQueueIndex(0);
  }

  deleteCustomChunk(user.uid, chunkId);

  const nextCustom = chunkStore.getState().customChunks;
  const userCreatedCount = nextCustom.filter((c) => !isBaseChunkId(c.id)).length;
  const nextTotalChunksCount = BASE_CHUNKS_COUNT + userCreatedCount;

  const currentStats = progressStore.getState().userStats;
  const nextStats = {
    ...currentStats,
    customChunksCount: nextCustom.length,
    totalChunksCount: nextTotalChunksCount
  };
  progressStore.getState().setUserStats(nextStats);
  syncUserStats(user.uid, nextStats);

  useModalStore.getState().closeChunkModal();
}
