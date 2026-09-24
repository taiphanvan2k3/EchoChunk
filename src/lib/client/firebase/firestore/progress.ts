import {
  doc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { ChunkProgress } from '@/types';

/**
 * Lưu/Cập nhật tiến độ SRS của một chunk cụ thể
 */
export async function syncChunkProgress(
  uid: string,
  chunkId: string,
  progress: ChunkProgress
): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, 'progress', chunkId);
    await setDoc(ref, {
      ...progress,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Failed to sync progress for chunk ${chunkId}:`, error);
  }
}

/**
 * Tải toàn bộ bản đồ tiến độ của người dùng từ Cloud Firestore
 */
export async function fetchUserProgressMap(
  uid: string
): Promise<Record<string, ChunkProgress>> {
  try {
    const colRef = collection(db, 'users', uid, 'progress');
    const snapshot = await getDocs(colRef);
    const map: Record<string, ChunkProgress> = {};
    snapshot.forEach((d) => {
      map[d.id] = d.data() as ChunkProgress;
    });
    return map;
  } catch (error) {
    console.error('Failed to fetch user progress map:', error);
    return {};
  }
}
