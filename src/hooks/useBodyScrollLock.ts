'use client';

import { useEffect } from 'react';

// Biến toàn cục
let lockCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';

/**
 * Custom hook khóa cuộn dọc của trang (body & html) khi Modal hoặc Drawer đang mở.
 * Khi đóng/unmount, tự động hoàn trả lại trạng thái cuộn ban đầu của trình duyệt.
 * Hỗ trợ đếm ref (lockCount) an toàn khi có nhiều modal lồng nhau.
 *
 * @param isLocked Trạng thái khóa cuộn (mặc định: true khi component mount).
 */
export function useBodyScrollLock(isLocked: boolean = true): void {
  useEffect(() => {
    if (!isLocked) return;

    if (typeof document === 'undefined') return;

    if (lockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }
    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.classList.remove('modal-open');
      }
    };
  }, [isLocked]);
}
