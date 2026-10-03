import { useState, useEffect, useRef, useCallback } from "react";
import { triggerLightHaptic } from "@/lib/client/haptics";

export interface UsePullToRefreshOptions {
  /** Hàm callback bất đồng bộ để làm mới dữ liệu */
  onRefresh: () => Promise<void> | void;
  /** Ngưỡng khoảng cách kéo tối thiểu (px) để kích hoạt (Mặc định: 70) */
  threshold?: number;
  /** Khoảng cách kéo tối đa cho phép giao diện co giãn (px) (Mặc định: 120) */
  maxPull?: number;
  /** Hệ số cản lực đàn hồi ban đầu k (Mặc định: 0.45) */
  resistanceCoeff?: number;
  /** Có kích hoạt rung phản hồi xúc giác hay không (Mặc định: true) */
  enableHaptics?: boolean;
  /** Vô hiệu hóa toàn bộ cơ chế PTR (Mặc định: false) */
  disabled?: boolean;
  /** Vị trí neo (px) của indicator trong lúc đang làm mới (Mặc định bằng threshold) */
  refreshingHoldDistance?: number;
}

export interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pullDistance: number;
  isRefreshing: boolean;
  isReadyToRelease: boolean;
  isPulling: boolean;
}

/**
 * Hàm tính cản lực đàn hồi tiệm cận mũ (Exponential Tension / Spring Physics)
 * Tham khảo: Strict Mode (https://www.strictmode.io/articles/react-pull-to-refresh)
 * 
 * F(dy) = MAX * (1 - e^(-k * dy / MAX))
 * - Khi dy nhỏ: F(dy) xấp xỉ k * dy (phản hồi nhạy theo ngón tay)
 * - Khi dy lớn: F(dy) tiệm cận trơn tru về MAX (không bao giờ bị khựng vào trần cứng)
 */
function calculateExponentialTension(dy: number, max: number, k: number): number {
  if (dy <= 0) return 0;
  return max * (1 - Math.exp((-k * dy) / max));
}

export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 120,
  resistanceCoeff = 0.45,
  enableHaptics = true,
  disabled = false,
  refreshingHoldDistance,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Lưu trữ các options mới nhất vào Ref để useEffect không bị re-bind liên tục
  const optionsRef = useRef({
    onRefresh,
    threshold,
    maxPull,
    resistanceCoeff,
    enableHaptics,
    disabled,
    refreshingHoldDistance,
  });

  // Lưu trữ các trạng thái đồng bộ sang Ref
  const isRefreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    optionsRef.current = {
      onRefresh,
      threshold,
      maxPull,
      resistanceCoeff,
      enableHaptics,
      disabled,
      refreshingHoldDistance,
    };
    isRefreshingRef.current = isRefreshing;
    pullDistanceRef.current = pullDistance;
  });

  // Lưu trữ các trạng thái tính toán cử chỉ trong Refs để đảm bảo 60/120fps
  const startY = useRef(0);
  const startX = useRef(0);
  const isPullingRef = useRef(false);
  const isDeterminingDirection = useRef(false);
  const directionLocked = useRef<"vertical" | "horizontal" | null>(null);
  const hasFiredHaptic = useRef(false);
  const watchdogTimer = useRef<NodeJS.Timeout | null>(null);

  const isReadyToRelease = pullDistance >= threshold;

  // Thu hồi trạng thái sạch sẽ
  const resetPull = useCallback(() => {
    isPullingRef.current = false;
    isDeterminingDirection.current = false;
    directionLocked.current = null;
    hasFiredHaptic.current = false;
    pullDistanceRef.current = 0;
    setIsPulling(false);
    setPullDistance(0);
  }, []);

  // Xử lý kích hoạt Refresh
  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setIsPulling(false);
    isPullingRef.current = false;

    // Vị trí neo êm ái cho indicator trong lúc loading (mặc định trùng với ngưỡng threshold để không bị giật vị trí)
    const holdDistance = optionsRef.current.refreshingHoldDistance ?? optionsRef.current.threshold;
    pullDistanceRef.current = holdDistance;
    setPullDistance(holdDistance);

    // Watchdog Timer an toàn 8000ms: Tự động giải phóng nếu API hoặc Router bị treo
    if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
    watchdogTimer.current = setTimeout(() => {
      setIsRefreshing(false);
      resetPull();
    }, 8000);

    try {
      await optionsRef.current.onRefresh();
    } catch (err) {
      console.warn("[PullToRefresh] Error during refresh cycle:", err);
    } finally {
      if (watchdogTimer.current) {
        clearTimeout(watchdogTimer.current);
        watchdogTimer.current = null;
      }
      setIsRefreshing(false);
      resetPull();
    }
  }, [resetPull]);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    // Các hàm xử lý touchmove và touchend được gắn linh hoạt (Dynamic Event Registration)
    // Giúp tối ưu hóa tài nguyên trình duyệt khi không trong phiên vuốt kéo
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDeterminingDirection.current && !isPullingRef.current) return;
      if (isRefreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startY.current;
      const diffX = Math.abs(currentX - startX.current);

      const currentOptions = optionsRef.current;

      // Bước 1: Khóa hướng cử chỉ (Directional Lock)
      if (isDeterminingDirection.current) {
        if (diffY <= 0) {
          // Người dùng vuốt cuộn lên hoặc đang xem nội dung phía dưới -> Hủy
          cleanupTouchListeners();
          resetPull();
          return;
        }

        if (diffX > diffY) {
          // Vuốt ngang (chuyển tab, flashcard, slide) -> Khóa ngang và hủy
          directionLocked.current = "horizontal";
          cleanupTouchListeners();
          resetPull();
          return;
        }

        if (diffY > 6 && diffY > diffX * 1.5) {
          // Xác định chính xác là cử chỉ vuốt kéo dọc từ đỉnh
          directionLocked.current = "vertical";
          isDeterminingDirection.current = false;
          isPullingRef.current = true;
          setIsPulling(true);
        }
      }

      // Bước 2: Xử lý kéo dọc với công thức tiệm cận đàn hồi
      if (isPullingRef.current && directionLocked.current === "vertical") {
        if (window.scrollY > 0) {
          cleanupTouchListeners();
          resetPull();
          return;
        }

        if (e.cancelable) {
          e.preventDefault();
        }

        // Tính quãng đường kéo theo hàm cản lực lò xo tiệm cận
        const calculatedDistance = calculateExponentialTension(
          diffY,
          currentOptions.maxPull,
          currentOptions.resistanceCoeff
        );
        pullDistanceRef.current = calculatedDistance;
        setPullDistance(calculatedDistance);

        // Kích hoạt rung Haptic đúng 1 nhịp khi chạm ngưỡng kích hoạt
        if (calculatedDistance >= currentOptions.threshold && !hasFiredHaptic.current) {
          hasFiredHaptic.current = true;
          if (currentOptions.enableHaptics) {
            void triggerLightHaptic();
          }
        } else if (calculatedDistance < currentOptions.threshold && hasFiredHaptic.current) {
          hasFiredHaptic.current = false;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      cleanupTouchListeners();

      if (!isPullingRef.current) {
        isDeterminingDirection.current = false;
        directionLocked.current = null;
        return;
      }

      const currentOptions = optionsRef.current;

      // Nhấc ngón tay ra -> Ngừng chế độ kéo chủ động ngay lập tức
      isPullingRef.current = false;
      setIsPulling(false);
      isDeterminingDirection.current = false;
      directionLocked.current = null;

      // Kiểm tra tọa độ cuối cùng từ changedTouches
      const endTouch = e.changedTouches?.[0];
      const finalDiffY = endTouch ? endTouch.clientY - startY.current : 0;
      const finalDistance = calculateExponentialTension(
        finalDiffY,
        currentOptions.maxPull,
        currentOptions.resistanceCoeff
      );

      if (
        (pullDistanceRef.current >= currentOptions.threshold || finalDistance >= currentOptions.threshold) &&
        !isRefreshingRef.current
      ) {
        void triggerRefresh();
      } else {
        resetPull();
      }
    };

    const cleanupTouchListeners = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };

    const handleTouchStart = (e: TouchEvent) => {
      // 1. Chỉ áp dụng chạm 1 ngón tay
      if (e.touches.length !== 1 || isRefreshingRef.current) return;

      // 2. Chỉ cho phép bắt đầu khi trang đang ở sát đỉnh (scrollY <= 0)
      if (window.scrollY > 0) return;

      // 3. Bỏ qua nếu người dùng đang thao tác trên ô nhập liệu
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

      // 4. Bỏ qua nếu bắt đầu từ bên trong một Modal/Dialog đang cuộn
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[role="dialog"], [data-modal], .modal-container')) {
        return;
      }

      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      isDeterminingDirection.current = true;
      directionLocked.current = null;
      hasFiredHaptic.current = false;

      // Đăng ký động touchmove và touchend chỉ khi ngón tay đang chạm
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd, { passive: true });
      window.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      cleanupTouchListeners();
      if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
    };
  }, [disabled, triggerRefresh, resetPull]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isReadyToRelease,
    isPulling,
  };
}
