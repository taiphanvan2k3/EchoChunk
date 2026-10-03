"use client";

import React, { useCallback, useState, useEffect } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

export interface PullToRefreshProps {
  /** Các component con bên trong trang web */
  children: React.ReactNode;

  /**
   * Hàm callback bất đồng bộ chạy khi người dùng kéo thả để làm mới.
   * Nếu không truyền, mặc định tải lại toàn bộ trang từ đầu giống phím F5 (`window.location.reload()`).
   */
  onRefresh?: () => Promise<void> | void;

  /** Ngưỡng khoảng cách kéo tối thiểu (px) để kích hoạt (Mặc định: 70) */
  threshold?: number;

  /** Khoảng cách kéo tối đa cho phép giao diện giãn ra (Mặc định: 110) */
  maxPullDistance?: number;

  /** Bật/Tắt tính năng rung xúc giác Haptic (Mặc định: true) */
  enableHaptics?: boolean;

  /** Vô hiệu hóa toàn bộ cơ chế PTR (Mặc định: false) */
  disabled?: boolean;

  /** Vị trí neo (px) của indicator khi đang tải dữ liệu (Mặc định bằng threshold) */
  refreshingHoldDistance?: number;
}

export function PullToRefresh({
  children,
  onRefresh: customOnRefresh,
  threshold = 70,
  maxPullDistance = 110,
  enableHaptics = true,
  disabled = false,
  refreshingHoldDistance,
}: PullToRefreshProps) {
  const [topOffset, setTopOffset] = useState(85);

  // Tính toán chiều cao thực tế của Navbar để indicator luôn trượt ra ngay dưới mép Navbar
  useEffect(() => {
    const updateOffset = () => {
      const header = document.querySelector("header");
      if (header) {
        setTopOffset(header.offsetHeight + 10);
      } else {
        setTopOffset(16);
      }
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, []);

  // Xử lý làm mới trang: mặc định Hard Reload (F5) toàn bộ ứng dụng
  const handleRefresh = useCallback(async () => {
    if (customOnRefresh) {
      await customOnRefresh();
    } else {
      // Giữ indicator quay mượt mà 350ms trước khi thực hiện reload toàn trang như F5
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  }, [customOnRefresh]);

  const {
    pullDistance,
    isRefreshing,
    isReadyToRelease,
    isPulling,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold,
    maxPull: maxPullDistance,
    enableHaptics,
    disabled,
    refreshingHoldDistance: refreshingHoldDistance ?? threshold,
  });

  const isVisible = pullDistance > 10 || isRefreshing;

  return (
    <div className="relative w-full">
      {/* Floating Glassmorphism Pill Indicator - z-[120] cao hơn Navbar z-[100] */}
      <div
        role="status"
        aria-live="polite"
        className="fixed left-1/2 z-[120] flex items-center justify-center pointer-events-none select-none"
        style={{
          top: `${topOffset}px`,
          transform: `translate3d(-50%, ${pullDistance}px, 0)`,
          opacity: isVisible ? 1 : 0,
          transition: isPulling
            ? "opacity 0.15s ease-out"
            : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out",
          willChange: isPulling ? "transform" : "auto",
        }}
      >
        <div
          className={`flex items-center justify-center gap-2 h-8 min-w-[152px] backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ease-out ${
            isReadyToRelease
              ? "bg-notion-blue-bg/80 border border-notion-blue-border/70 text-notion-blue-text shadow-[0_4px_16px_rgba(35,131,226,0.14),0_1px_2px_rgba(0,0,0,0.03)]"
              : isRefreshing
              ? "bg-white/75 border border-notion-border-medium/70 text-notion-text shadow-[0_4px_16px_rgba(15,15,15,0.06),0_1px_2px_rgba(15,15,15,0.03)]"
              : "bg-white/75 border border-notion-border/70 text-notion-secondary shadow-[0_2px_10px_rgba(15,15,15,0.05),0_1px_2px_rgba(15,15,15,0.02)]"
          }`}
        >
          {isRefreshing ? (
            <>
              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-notion-primary" />
              <span className="leading-none text-notion-text">Đang cập nhật...</span>
            </>
          ) : isReadyToRelease ? (
            <>
              <ArrowDown className="w-4 h-4 shrink-0 text-notion-primary rotate-180 transition-transform duration-200" />
              <span className="leading-none text-notion-blue-text">Thả để làm mới</span>
            </>
          ) : (
            <>
              <ArrowDown className="w-4 h-4 shrink-0 text-notion-muted transition-transform duration-200" />
              <span className="leading-none text-notion-secondary">Kéo xuống để làm mới</span>
            </>
          )}
        </div>
      </div>

      {/* Nội dung trang được giãn nhẹ theo độ kéo (Parallax Elastic Effect) */}
      <div
        style={{
          transform: pullDistance > 0 ? `translate3d(0, ${pullDistance * 0.3}px, 0)` : "none",
          transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: isPulling ? "transform" : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
