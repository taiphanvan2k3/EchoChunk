import {
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { ChunkProgress } from '@/types';
import { tracedGetDoc, tracedSetDoc } from './tracer';

/**
 * Đường dẫn document tổng hợp tiến độ của user (Single Document Pattern)
 * Giảm số lượt đọc từ hàng trăm Document Reads xuống đúng 1 Read duy nhất.
 */
function getProgressSummaryDocRef(uid: string) {
  return doc(db, 'users', uid, 'progress_summary', 'current');
}

/**
 * Lưu/Cập nhật tiến độ SRS của một chunk cụ thể.
 * Ghi trực tiếp vào trường tương ứng của document tổng hợp, merge: true để không ghi đè các chunk khác.
 */
export async function syncChunkProgress(
  uid: string,
  chunkId: string,
  progress: ChunkProgress
): Promise<void> {
  try {
    const summaryRef = getProgressSummaryDocRef(uid);
    await tracedSetDoc(
      summaryRef,
      {
        [chunkId]: {
          ...progress,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true },
      'syncChunkProgress'
    );
  } catch (error) {
    console.error(`Failed to sync progress for chunk ${chunkId}:`, error);
  }
}

/**
 * Tải toàn bộ bản đồ tiến độ của người dùng từ Cloud Firestore (Single Document Pattern - 1 Read duy nhất).
 */
export async function fetchUserProgressMap(
  uid: string
): Promise<Record<string, ChunkProgress>> {
  try {
    const summaryRef = getProgressSummaryDocRef(uid);
    const snap = await tracedGetDoc(summaryRef, 'fetchUserProgressMap');

    if (snap.exists()) {
      const data = snap.data();
      const map: Record<string, ChunkProgress> = {};
      for (const [key, value] of Object.entries(data)) {
        if (key !== 'updatedAt' && value && typeof value === 'object') {
          map[key] = value as ChunkProgress;
        }
      }
      return map;
    }

    return {};
  } catch (error) {
    console.error('Failed to fetch user progress map:', error);
    return {};
  }
}
