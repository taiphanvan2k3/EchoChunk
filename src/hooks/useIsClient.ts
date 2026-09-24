'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Custom hook nhận diện môi trường Client-side an toàn trong Next.js (SSR / React 19).
 * - Phía Server (SSR): trả về false (đảm bảo HTML tĩnh an toàn).
 * - Phía Client (Hydration): trả về true (cho phép đọc LocalStorage, window, v.v.).
 * - Ưu điểm: Không gây Hydration Mismatch, không gây Cascading Render (zero effect/setState).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}