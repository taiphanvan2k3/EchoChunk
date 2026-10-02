'use client';

import { useSyncExternalStore, useEffect, useCallback, useMemo } from 'react';
import { youtubeHistoryStore } from '@/stores/youtubeHistoryStore';
import { YouTubeHistoryItem } from '@/types/youtube';

const EMPTY_HISTORY: YouTubeHistoryItem[] = [];

export type UseYouTubeHistoryResult = YouTubeHistoryItem[] & {
  historyItems: YouTubeHistoryItem[];
  isLoading: boolean;
};

/**
 * Custom React Hook kết nối UI với YouTubeHistoryStore (Cloud-First).
 * Dữ liệu được nạp trực tiếp từ Cloud Firestore và lưu tạm trong bộ nhớ in-memory.
 */
export function useYouTubeHistory(uid?: string | null): UseYouTubeHistoryResult {
  const subscribe = useCallback((onStoreChange: () => void) => {
    return youtubeHistoryStore.subscribe(onStoreChange);
  }, []);

  const historyItems = useSyncExternalStore(
    subscribe,
    youtubeHistoryStore.getSnapshot,
    () => EMPTY_HISTORY
  );

  const isLoading = useSyncExternalStore(
    subscribe,
    () => youtubeHistoryStore.isStoreLoading(uid),
    () => true
  );

  useEffect(() => {
    youtubeHistoryStore.load(uid);
  }, [uid]);

  return useMemo(() => {
    const list = [...historyItems] as UseYouTubeHistoryResult;
    list.historyItems = historyItems;
    list.isLoading = isLoading;
    return list;
  }, [historyItems, isLoading]);
}
