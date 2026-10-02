'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, CheckCircle2, AlertCircle, X, Sparkles, Volume2 } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  DailyReminderConfig,
  getDailyReminderConfig,
  scheduleDailyReminder,
  sendTestNotification,
  checkNotificationPermission,
  requestNotificationPermission,
  isCapacitorNative,
} from '@/lib/client/notifications';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
}

export function NotificationSettingsModal({ isOpen = true, onClose }: Props) {
  useEscapeKey(onClose);
  useBodyScrollLock();

  const [config, setConfig] = useState<DailyReminderConfig>(() => getDailyReminderConfig());
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    checkNotificationPermission().then((perm) => {
      if (!isCancelled) {
        setPermission(perm);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) {
      setStatusMessage({ type: 'success', text: 'Đã cấp quyền thông báo thành công!' });
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Quyền thông báo bị từ chối. Hãy mở Cài đặt thiết bị để cho phép EchoChunk gửi thông báo.',
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const result = await scheduleDailyReminder(config);
      if (result.success) {
        setStatusMessage({ type: 'success', text: result.message });
        const perm = await checkNotificationPermission();
        setPermission(perm);
      } else {
        setStatusMessage({ type: 'error', text: result.message });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu lịch hẹn.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    try {
      const res = await sendTestNotification();
      setStatusMessage({
        type: res.success ? 'info' : 'error',
        text: res.message,
      });
      const perm = await checkNotificationPermission();
      setPermission(perm);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 sm:backdrop-blur-[4px] z-[5000] flex sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white sm:border sm:border-gray-200 w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-[480px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt thông báo nhắc học"
      >
        {/* Sticky Header - Chuẩn pattern giống ChunkModal */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-gray-100 bg-white/95 backdrop-blur shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 select-none">
              <Bell size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0 truncate">Nhắc Nhở Học Tập</h2>
              <p className="text-[0.7rem] text-gray-500 m-0 hidden sm:block">Giữ chuỗi Streak và ôn tập Spaced Repetition</p>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 hover:text-gray-900 text-gray-400 border border-gray-200 flex items-center justify-center cursor-pointer transition-colors shrink-0 ml-2"
            onClick={onClose}
            title="Đóng (Esc)"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body with scrollbar-thin - Chuẩn pattern giống ChunkModal */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 flex flex-col gap-4">
          {/* Permission Status Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-[0.8rem] transition-colors ${
              permission === 'granted'
                ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-800'
                : permission === 'denied'
                ? 'bg-amber-50/70 border-amber-200/80 text-amber-800'
                : 'bg-blue-50/70 border-blue-200/80 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {permission === 'granted' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
              )}
              <span>
                {permission === 'granted'
                  ? 'Quyền thông báo: Đã sẵn sàng'
                  : permission === 'denied'
                  ? 'Quyền thông báo đang bị chặn'
                  : 'Chưa cấp quyền gửi thông báo'}
              </span>
            </div>
            {permission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-2.5 py-1 text-[0.75rem] font-semibold bg-white border border-current rounded-md hover:bg-white/80 transition-opacity cursor-pointer"
              >
                Cấp quyền
              </button>
            )}
          </div>

          {/* Single Daily Reminder Config */}
          <div className="p-4 rounded-xl border border-notion-border bg-notion-surface-subtle/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-notion-primary" />
                <span className="text-[0.88rem] font-semibold text-notion-text">Giờ nhắc học hàng ngày</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-notion-primary"></div>
              </label>
            </div>

            <p className="text-[0.76rem] text-notion-secondary leading-relaxed">
              Mỗi ngày ứng dụng sẽ gửi 1 thông báo vào đúng khung giờ này để bạn luyện nhanh các Speaking Chunks cần ôn tập.
            </p>

            {config.enabled && (
              <div className="pt-2 border-t border-notion-border/60 flex items-center justify-between">
                <span className="text-[0.8rem] font-medium text-notion-text">Chọn giờ nhắc:</span>
                <input
                  type="time"
                  value={config.time}
                  onChange={(e) => setConfig({ ...config, time: e.target.value })}
                  className="px-3 py-1.5 text-[0.88rem] font-semibold bg-white border border-notion-border rounded-lg text-notion-text focus:outline-none focus:border-notion-primary shadow-sm cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Feedback Status */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-[0.8rem] leading-snug flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              }`}
            >
              <Sparkles size={15} className="shrink-0 mt-0.5" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Test Notification Button */}
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isTesting}
            className="w-full py-2.5 px-3 text-[0.82rem] font-medium text-notion-secondary hover:text-notion-text bg-notion-surface-subtle hover:bg-notion-hover border border-notion-border rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Volume2 size={15} />
            <span>{isTesting ? 'Đang kích hoạt...' : '🔔 Thử nghiệm thông báo ngay'}</span>
          </button>
        </div>

        {/* Footer - Chuẩn pattern giống ChunkModal */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[0.74rem] text-notion-secondary font-medium">
            {isCapacitorNative() ? '📱 App di động Native' : '🌐 Môi trường Web'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-[0.82rem] font-medium text-gray-600 hover:text-gray-900 bg-transparent hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 text-[0.82rem] font-semibold text-white bg-notion-primary hover:bg-notion-primary-hover rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
