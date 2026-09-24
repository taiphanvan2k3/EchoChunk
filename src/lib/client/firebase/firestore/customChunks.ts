import { doc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../config";
import { SpeakingChunk } from "@/types";

/**
 * Lưu từ vựng tự tạo của người dùng lên Cloud
 */
export async function syncCustomChunk(uid: string, chunk: SpeakingChunk): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "customChunks", chunk.id);
    await setDoc(ref, {
      ...chunk,
      userId: uid,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`Failed to sync custom chunk ${chunk.id}:`, error);
  }
}

/**
 * Xóa từ vựng tự tạo khỏi Cloud
 */
export async function deleteCustomChunk(uid: string, chunkId: string): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "customChunks", chunkId);
    await deleteDoc(ref);
  } catch (error) {
    console.error(`Failed to delete custom chunk ${chunkId}:`, error);
  }
}

/**
 * Lấy danh sách từ vựng tự tạo từ Cloud
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
