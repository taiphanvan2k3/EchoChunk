'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom hook lắng nghe phím ESC để đóng modal hoặc thực hiện hành động hủy thao tác.
 *
 * @param onEscape Callback được thực thi khi người dùng bấm phím Escape (thường là onClose).
 * @param enabled Có bật lắng nghe hay không (mặc định: true).
 */
export function useEscapeKey(onEscape?: () => void, enabled: boolean = true): void {
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscapeRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

export const useEscapeClose = useEscapeKey;
