import { Capacitor } from '@capacitor/core';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';

export interface DailyReminderConfig {
  enabled: boolean;
  time: string; // Format: "HH:mm", e.g., "20:00"
}

export const REMINDER_STORAGE_KEY = 'echochunk_daily_reminder_config';
export const NOTIFICATION_ID_DAILY = 1001;
export const NOTIFICATION_ID_TEST = 9999;
export const REMINDER_CHANNEL_ID = 'echochunk_daily_reminders';

export const DEFAULT_REMINDER_CONFIG: DailyReminderConfig = {
  enabled: true,
  time: '20:00',
};

/**
 * Check if running inside a native mobile container (Capacitor Android/iOS).
 */
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
}

/**
 * Get current saved reminder config from localStorage.
 */
export function getDailyReminderConfig(): DailyReminderConfig {
  if (typeof window === 'undefined') return DEFAULT_REMINDER_CONFIG;
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_CONFIG;
    const parsed = JSON.parse(raw) as Partial<DailyReminderConfig>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      time: parsed.time && /^\d{2}:\d{2}$/.test(parsed.time) ? parsed.time : '20:00',
    };
  } catch {
    return DEFAULT_REMINDER_CONFIG;
  }
}

/**
 * Save reminder config to localStorage.
 */
export function saveDailyReminderConfig(config: DailyReminderConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('[Notifications] Failed to save reminder config:', e);
  }
}

/**
 * Ensure notification channel is created on Android 8+.
 */
async function ensureNotificationChannel(): Promise<void> {
  if (!isCapacitorNative() || Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'EchoChunk Nhắc Nhở Học Tập',
      description: 'Thông báo nhắc nhở luyện phản xạ tiếng Anh và ôn tập SRS hàng ngày',
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: 'beep.wav',
    });
  } catch (e) {
    console.warn('[Notifications] Failed to create notification channel:', e);
  }
}

/**
 * Check current notification permission status.
 */
export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isCapacitorNative()) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = Notification.permission;
      if (perm === 'granted') return 'granted';
      if (perm === 'denied') return 'denied';
      return 'prompt';
    }
    return 'denied';
  }

  try {
    const status: PermissionStatus = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return 'granted';
    if (status.display === 'denied') return 'denied';
    return 'prompt';
  } catch (e) {
    console.error('[Notifications] Check permission error:', e);
    return 'denied';
  }
}

/**
 * Request notification permission from system.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isCapacitorNative()) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        return res === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }

  try {
    const res: PermissionStatus = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  } catch (e) {
    console.error('[Notifications] Request permission error:', e);
    return false;
  }
}

/**
 * Cancel previously scheduled daily reminder.
 */
export async function cancelDailyReminder(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: NOTIFICATION_ID_DAILY }],
    });
  } catch (e) {
    console.warn('[Notifications] Failed to cancel reminder:', e);
  }
}

/**
 * Schedule the single daily reminder based on config.
 */
export async function scheduleDailyReminder(
  userConfig?: DailyReminderConfig
): Promise<{ success: boolean; message: string }> {
  const config = userConfig || getDailyReminderConfig();
  saveDailyReminderConfig(config);

  if (!config.enabled) {
    await cancelDailyReminder();
    return { success: true, message: 'Đã tắt nhắc nhở hàng ngày.' };
  }

  if (!isCapacitorNative()) {
    return {
      success: true,
      message: 'Cài đặt đã lưu. Tính năng chuông báo native sẽ hoạt động khi bạn mở app trên điện thoại Android.',
    };
  }

  try {
    const permission = await checkNotificationPermission();
    if (permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return {
          success: false,
          message: 'Chưa cấp quyền thông báo. Vui lòng cho phép ứng dụng gửi thông báo.',
        };
      }
    }

    await ensureNotificationChannel();
    await cancelDailyReminder();

    const [hourStr, minuteStr] = config.time.split(':');
    const hour = parseInt(hourStr, 10) || 20;
    const minute = parseInt(minuteStr, 10) || 0;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID_DAILY,
          title: '🌙 Giờ vàng EchoChunk: Ôn tập giữ streak!',
          body: 'Bạn có các câu Speaking Chunks cần ôn tập hôm nay để củng cố phản xạ và duy trì chuỗi học tập.',
          channelId: REMINDER_CHANNEL_ID,
          schedule: {
            on: {
              hour,
              minute,
            },
            allowWhileIdle: true,
          },
          sound: 'beep.wav',
          extra: {
            action: 'open_practice',
            time: config.time,
          },
        },
      ],
    });

    return {
      success: true,
      message: `Đã lên lịch nhắc học lúc ${config.time} mỗi ngày thành công!`,
    };
  } catch (err: unknown) {
    console.error('[Notifications] Schedule failed:', err);
    const msg = err instanceof Error ? err.message : 'Không thể lên lịch thông báo.';
    return { success: false, message: msg };
  }
}

/**
 * Send a test notification that rings in 5 seconds.
 */
export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  if (!isCapacitorNative()) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission();
        }

        if (perm === 'granted') {
          setTimeout(() => {
            new Notification('🔔 Thử nghiệm thông báo EchoChunk', {
              body: 'Hệ thống thông báo hoạt động tốt! Trên điện thoại, chuông báo sẽ reo đúng giờ đã hẹn.',
              icon: '/favicon.ico',
            });
          }, 2000);
          return { success: true, message: 'Đã gửi thông báo thử nghiệm (sẽ hiện sau 2 giây ở góc màn hình máy tính)!' };
        } else {
          return {
            success: false,
            message: 'Trình duyệt web chưa được cấp quyền thông báo. Hãy bấm Cho phép khi trình duyệt hỏi.',
          };
        }
      } catch (err) {
        console.error('[Notifications] Web notification error:', err);
      }
    }
    return {
      success: true,
      message: 'Tính năng nhắc học native đã sẵn sàng trên app Android của bạn.',
    };
  }

  try {
    const perm = await checkNotificationPermission();
    if (perm !== 'granted') {
      const ok = await requestNotificationPermission();
      if (!ok) {
        return { success: false, message: 'Vui lòng cấp quyền thông báo trước khi thử nghiệm.' };
      }
    }

    await ensureNotificationChannel();

    const triggerAt = new Date(Date.now() + 5000); // 5 seconds from now
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID_TEST,
          title: '🔔 Thử nghiệm chuông báo EchoChunk',
          body: 'Thông báo nhắc nhở đã rung chuông thành công! Khóa màn hình hoặc đóng app chuông vẫn hoạt động chuẩn xác.',
          channelId: REMINDER_CHANNEL_ID,
          schedule: {
            at: triggerAt,
            allowWhileIdle: true,
          },
          sound: 'beep.wav',
        },
      ],
    });

    return {
      success: true,
      message: 'Đã đặt thông báo! Vui lòng khóa màn hình hoặc chờ 5 giây để nghe chuông báo.',
    };
  } catch (e: unknown) {
    console.error('[Notifications] Test notification failed:', e);
    const msg = e instanceof Error ? e.message : 'Lỗi khi gửi thông báo thử nghiệm.';
    return { success: false, message: msg };
  }
}

/**
 * Initialize app lifecycle listener to re-verify or reschedule on app resume/timezone changes.
 */
let isLifecycleInitialized = false;

export function initNotificationLifecycle(): void {
  if (typeof window === 'undefined' || !isCapacitorNative() || isLifecycleInitialized) return;
  isLifecycleInitialized = true;

  try {
    App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        const config = getDailyReminderConfig();
        if (config.enabled) {
          scheduleDailyReminder(config).catch(() => {});
        }
      }
    });
  } catch (e) {
    console.warn('[Notifications] App lifecycle listener init failed:', e);
  }
}
