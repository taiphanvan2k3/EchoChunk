/**
 * Haptic Feedback Utility (Đa nền tảng Web & Capacitor Native)
 * 
 * Mục đích:
 * Tạo phản hồi rung xúc giác nhẹ (Tactile Haptic Feedback) khi người dùng:
 * - Kéo vuốt đạt ngưỡng kích hoạt (Pull-to-Refresh: threshold >= 70px).
 * - Nhấn các nút tương tác quan trọng hoặc chuyển trạng thái thành công.
 * 
 * Giúp người dùng nhận biết tức thì bằng xúc giác đầu ngón tay rằng thao tác
 * đã hoàn tất thành công mà không cần phải nhìn chằm chằm vào màn hình.
 * 
 * Thứ tự ưu tiên đa tầng (Graceful Degradation Architecture):
 * 1. Tầng 1 (Capacitor Native Shell): Gọi Taptic Engine (iOS) / Motor rung (Android)
 *    qua bridge `window.Capacitor.Plugins.Haptics.impact({ style: "LIGHT" })`.
 * 2. Tầng 2 (Mobile Web / PWA Fallback): Dùng chuẩn HTML5 Web Vibration API
 *    `navigator.vibrate(15)` (rung khẽ 1 nhịp 15ms trên Chrome/Android Web).
 * 3. Tầng 3 (Desktop & Thiết bị không hỗ trợ): Yên lặng bỏ qua an toàn trong try/catch,
 *    bảo đảm tuyệt đối 100% không bao giờ ném Exception hay gây nghẽn luồng UI chính.
 */

interface CapacitorHapticsPlugin {
  impact: (options: { style: "HEAVY" | "MEDIUM" | "LIGHT" }) => Promise<void>;
  vibrate?: () => Promise<void>;
}

interface WindowWithCapacitor extends Window {
  Capacitor?: {
    isPluginAvailable?: (name: string) => boolean;
    Plugins?: {
      Haptics?: CapacitorHapticsPlugin;
    };
  };
}

/**
 * Kích hoạt một nhịp rung xúc giác nhẹ (Light Haptic Feedback)
 * 
 * Thường được gọi đúng 1 lần khi cử chỉ vuốt kéo đạt ngưỡng kích hoạt (>= 70px)
 * để thông báo cho người dùng biết có thể buông tay để làm mới trang.
 */
export async function triggerLightHaptic(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const win = window as WindowWithCapacitor;

    // 1. Ưu tiên: Sử dụng plugin Haptics gốc được inject sẵn trên Capacitor Native Shell
    const haptics = win.Capacitor?.Plugins?.Haptics;
    if (haptics && typeof haptics.impact === "function") {
      await haptics.impact({ style: "LIGHT" });
      return;
    }

    // 2. Dự phòng: Fallback sang Web Vibration API chuẩn của trình duyệt di động HTML5
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(15);
    }
  } catch {
    // 3. Yên lặng bỏ qua, bảo đảm không bao giờ ảnh hưởng đến luồng giao diện chính
  }
}

