'use client';

import { useSyncExternalStore, useEffect, useCallback, useState } from 'react';
import { youtubeHistoryStore } from '@/stores/youtubeHistoryStore';
import { YouTubeHistoryItem } from '@/types/youtube';
import { getCallerComponentName } from '@/lib/client/debug';

const EMPTY_HISTORY: YouTubeHistoryItem[] = [];

/**
 * Custom React Hook kết nối UI với YouTubeHistoryStore thông qua useSyncExternalStore.
 * Hỗ trợ Local-First, Instant Render, Cross-Tab Sync và tự động đồng bộ ngầm với Cloud Firestore.
 */
export function useYouTubeHistory(uid?: string | null): YouTubeHistoryItem[] {
  // Tự động phát hiện tên component gọi hook (chỉ chạy 1 lần lúc mount, zero-config)
  const [componentName] = useState(getCallerComponentName);

  // Callback subscribe ổn định tham chiếu (đảm bảo chỉ chạy 1 lần lúc mount và 1 lần lúc unmount)
  const subscribeWithLogging = useCallback(
    (onStoreChange: () => void) => {
      console.log(`🟢 [Store Subscribe] <${componentName} /> vừa ĐĂNG KÝ lắng nghe Store! (UID: ${uid ?? 'guest'})`);
      const unsubscribe = youtubeHistoryStore.subscribe(onStoreChange);

      return () => {
        console.log(`🔴 [Store Unsubscribe] <${componentName} /> vừa HỦY ĐĂNG KÝ khỏi Store!`);
        unsubscribe();
      };
    },
    [componentName, uid]
  );

  const historyItems = useSyncExternalStore(
    subscribeWithLogging,
    () => youtubeHistoryStore.getSnapshot(uid),
    () => EMPTY_HISTORY
  );

  // Tự động đồng bộ ngầm với Cloud Firestore khi user đã đăng nhập
  useEffect(() => {
    if (!uid || uid === 'guest') return;

    youtubeHistoryStore.fetchAndSync(uid).catch((err) => {
      console.warn('[useYouTubeHistory] Cloud sync error:', err);
    });
  }, [uid]);

  return historyItems;
}
