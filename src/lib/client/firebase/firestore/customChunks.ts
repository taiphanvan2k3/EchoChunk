import {
  doc,
  deleteField,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config";
import { SpeakingChunk } from "@/types";
import {
  tracedGetDoc,
  tracedGetDocs,
  tracedSetDoc,
  tracedUpdateDoc,
  tracedWriteBatch
} from "./tracer";

const DEFAULT_BUCKET_ID = "bucket_1";

/**
 * Lấy reference tới một document bucket trong subcollection custom_chunks_summary
 */
function getSummaryBucketRef(uid: string, bucketId: string = DEFAULT_BUCKET_ID) {
  return doc(db, "users", uid, "custom_chunks_summary", bucketId);
}

/**
 * Lấy toàn bộ danh sách từ vựng tự tạo từ Cloud Firestore.
 * Áp dụng Bucket Sharding Single-Document Pattern:
 * - Thay vì đọc từng document lẻ (ngốn 244+ Reads), chỉ đọc các bucket document tổng hợp (1-2 Reads).
 * - Tự động fallback và auto-migrate nếu user cũ chưa có bucket summary.
 */
export async function fetchCustomChunks(
  uid: string,
  customChunkBucketIds?: string[]
): Promise<SpeakingChunk[]> {
  try {
    const bucketsToFetch =
      customChunkBucketIds && customChunkBucketIds.length > 0 ? customChunkBucketIds : [DEFAULT_BUCKET_ID];

    const bucketDocs = await Promise.all(
      bucketsToFetch.map((bId) => tracedGetDoc(getSummaryBucketRef(uid, bId), 'fetchCustomChunks:bucket'))
    );

    const chunks: SpeakingChunk[] = [];
    let hasValidBucket = false;

    bucketDocs.forEach((snap) => {
      if (snap.exists()) {
        hasValidBucket = true;
        const data = snap.data();
        for (const [key, value] of Object.entries(data)) {
          if (key !== "updatedAt" && value && typeof value === "object") {
            const chunk = value as SpeakingChunk;
            if (!chunk.userId || chunk.userId === uid || chunk.userId === "guest") {
              chunks.push(chunk);
            }
          }
        }
      }
    });

    if (hasValidBucket) {
      return chunks;
    }

    // Fallback cho tài khoản legacy chưa migrate: Đọc 1 lần từ subcollection cũ
    const colRef = collection(db, "users", uid, "customChunks");
    const snapshot = await tracedGetDocs(colRef, 'fetchCustomChunks:legacyFallback');
    const fallbackChunks: SpeakingChunk[] = [];
    const autoMigrateMap: Record<string, unknown> = {
      updatedAt: serverTimestamp()
    };

    snapshot.forEach((d) => {
      const data = d.data() as SpeakingChunk;
      if (!data.userId || data.userId === uid || data.userId === "guest") {
        fallbackChunks.push(data);
        autoMigrateMap[d.id] = data;
      }
    });

    // Auto-migrate ngầm sang bucket_1 để lần tải sau chỉ tốn đúng 1 Read duy nhất
    if (fallbackChunks.length > 0) {
      tracedSetDoc(getSummaryBucketRef(uid, DEFAULT_BUCKET_ID), autoMigrateMap, { merge: true }, 'autoMigrateSummary').catch(
        (err) => console.warn("[customChunks] Auto-migration summary failed:", err)
      );
    }

    return fallbackChunks;
  } catch (error) {
    console.error("Failed to fetch custom chunks:", error);
    return [];
  }
}

/**
 * Lưu/Cập nhật từ vựng tự tạo của người dùng lên Cloud Firestore.
 * Áp dụng cơ chế Dual-Write:
 * 1. Ghi vào Summary Bucket (để fetch sau này chỉ tốn 1 Read).
 * 2. Ghi song song vào subcollection lẻ (để bảo toàn Cold Backup).
 */
export async function syncCustomChunk(
  uid: string,
  chunk: SpeakingChunk,
  activeBucketId: string = DEFAULT_BUCKET_ID
): Promise<void> {
  try {
    const summaryRef = getSummaryBucketRef(uid, activeBucketId);
    const backupRef = doc(db, "users", uid, "customChunks", chunk.id);
    const statsRef = doc(db, "users", uid, "stats", "current");

    const cleanChunk = {
      ...chunk,
      userId: uid
    };

    const batch = tracedWriteBatch(db, 'syncCustomChunk');

    // 1. Ghi vào Summary Bucket
    batch.set(
      summaryRef,
      {
        [chunk.id]: cleanChunk,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // 2. Ghi song song vào doc lẻ làm backup an toàn
    batch.set(
      backupRef,
      {
        ...cleanChunk,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // 3. Cập nhật timestamp trong stats
    batch.set(
      statsRef,
      {
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
 * Xóa từ vựng tự tạo khỏi Cloud Firestore.
 * Áp dụng cơ chế Dual-Delete:
 * 1. Xóa field trong Summary Bucket (dùng deleteField).
 * 2. Xóa doc trong subcollection lẻ.
 */
export async function deleteCustomChunk(
  uid: string,
  chunkId: string,
  targetBucketId: string = DEFAULT_BUCKET_ID
): Promise<void> {
  try {
    const summaryRef = getSummaryBucketRef(uid, targetBucketId);
    const backupRef = doc(db, "users", uid, "customChunks", chunkId);
    const statsRef = doc(db, "users", uid, "stats", "current");

    // 1. Xóa field trong Summary Bucket
    try {
      await tracedUpdateDoc(summaryRef, {
        [chunkId]: deleteField(),
        updatedAt: serverTimestamp()
      }, 'deleteCustomChunk:summaryField');
    } catch {
      // Document có thể chưa tạo hoặc đã xóa
    }

    // 2. Xóa doc trong subcollection lẻ
    const batch = tracedWriteBatch(db, 'deleteCustomChunk:backupDoc');
    batch.delete(backupRef);
    batch.set(
      statsRef,
      {
        lastCustomChunksUpdatedAt: Date.now()
      },
      { merge: true }
    );

    await batch.commit();
  } catch (error) {
    console.error(`Failed to delete custom chunk ${chunkId}:`, error);
  }
}
