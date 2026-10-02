import {
  doc,
  collection,
  getDocs,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db } from "../config";
import { SpeakingChunk } from "@/types";

/**
 * Lưu/Cập nhật từ vựng tự tạo của người dùng lên Cloud Firestore (mỗi câu 1 document riêng biệt).
 */
export async function syncCustomChunk(uid: string, chunk: SpeakingChunk): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "customChunks", chunk.id);
    const statsRef = doc(db, "users", uid, "stats", "current");
    const batch = writeBatch(db);

    batch.set(
      ref,
      {
        ...chunk,
        userId: uid,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // Gỡ khỏi deletedChunkIds nếu tạo/sửa lại và cập nhật timestamp
    batch.set(
      statsRef,
      {
        deletedChunkIds: arrayRemove(chunk.id),
        lastCustomChunksUpdatedAt: Date.now()
      },
      { merge: true }
    );

    await batch.commit();
  } catch (error) {
    console.error(`Failed to sync custom chunk ${chunk.id}:`, error);
  }
}

/**
 * Xóa từ vựng tự tạo khỏi Cloud Firestore và lưu Tombstone vào stats/current.
 */
export async function deleteCustomChunk(uid: string, chunkId: string): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "customChunks", chunkId);
    const statsRef = doc(db, "users", uid, "stats", "current");
    const batch = writeBatch(db);

    batch.delete(ref);
    batch.set(
      statsRef,
      {
        deletedChunkIds: arrayUnion(chunkId),
        lastCustomChunksUpdatedAt: Date.now()
      },
      { merge: true }
    );

    await batch.commit();
  } catch (error) {
    console.error(`Failed to delete custom chunk ${chunkId}:`, error);
  }
}

/**
 * Lấy toàn bộ danh sách từ vựng tự tạo từ Cloud Firestore.
 */
export async function fetchCustomChunks(uid: string): Promise<SpeakingChunk[]> {
  try {
    const colRef = collection(db, "users", uid, "customChunks");
    const snapshot = await getDocs(colRef);
    const chunks: SpeakingChunk[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as SpeakingChunk;

      // Tránh lây nhiễm từ vựng giữa các account khác nhau
      if (!data.userId || data.userId === uid || data.userId === "guest") {
        chunks.push(data);
      }
    });
    return chunks;
  } catch (error) {
    console.error("Failed to fetch custom chunks:", error);
    return [];
  }
}
