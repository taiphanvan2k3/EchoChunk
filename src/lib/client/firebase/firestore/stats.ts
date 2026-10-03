import {
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { UserStats } from '@/types';
import { tracedGetDoc, tracedSetDoc } from './tracer';

/**
 * Cập nhật thống kê học tập (streak, số câu hôm nay)
 */
export async function syncUserStats(uid: string, stats: UserStats): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, 'stats', 'current');
    await tracedSetDoc(
      ref,
      {
        ...stats,
        updatedAt: serverTimestamp(),
      },
      'syncUserStats'
    );
  } catch (error) {
    console.error('Failed to sync user stats:', error);
  }
}

/**
 * Tải thống kê học tập từ Cloud Firestore
 */
export async function fetchUserStats(uid: string): Promise<UserStats | null> {
  try {
    const ref = doc(db, 'users', uid, 'stats', 'current');
    const snap = await tracedGetDoc(ref, 'fetchUserStats');
    if (snap.exists()) {
      return snap.data() as UserStats;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    return null;
  }
}
