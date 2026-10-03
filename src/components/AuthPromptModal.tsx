'use client';

import { useCallback } from 'react';
import { Sparkles, Cloud, Brain, X, Loader2 } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useAuth } from '@/context/AuthContext';

interface AuthPromptModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}

export function AuthPromptModal({
  isOpen = true,
  onClose,
  onSuccess,
  title = 'Đăng nhập để thêm từ vựng riêng',
  description = 'Để lưu trữ và đồng bộ kho từ vựng cá nhân của bạn trên đám mây, vui lòng đăng nhập bằng tài khoản Google.'
}: AuthPromptModalProps) {
  useEscapeKey(onClose);
  useBodyScrollLock();

  const { signInWithGoogle, isSigningIn } = useAuth();

  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      // Lỗi hoặc user đóng popup Google - đã được xử lý trong AuthContext
    }
  }, [signInWithGoogle, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 sm:backdrop-blur-[4px] z-[5000] flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease]"
      onClick={onClose}
    >
      <div
        className="bg-white border border-notion-border w-full max-w-[420px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[scaleIn_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <span className="text-[0.78rem] font-semibold text-amber-700 tracking-wide uppercase">
              Tính năng cá nhân
            </span>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer transition-colors"
            onClick={onClose}
            title="Đóng (Esc)"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-4 text-center">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-notion-text m-0 mb-1.5">
              {title}
            </h2>
            <p className="text-[0.82rem] text-notion-secondary leading-relaxed m-0">
              {description}
            </p>
          </div>

          {/* Benefits List */}
          <div className="bg-notion-surface-subtle/60 rounded-xl p-3.5 border border-notion-border flex flex-col gap-2.5 text-left">
            <div className="flex items-center gap-2.5 text-[0.8rem] text-notion-text">
              <Cloud size={16} className="text-notion-primary shrink-0" />
              <span>Đồng bộ tức thì lên Cloud Firestore mọi thiết bị</span>
            </div>
            <div className="flex items-center gap-2.5 text-[0.8rem] text-notion-text">
              <Brain size={16} className="text-emerald-600 shrink-0" />
              <span>Lưu chuỗi Streak & Lặp lại ngắt quãng (SRS)</span>
            </div>
            <div className="flex items-center gap-2.5 text-[0.8rem] text-notion-text">
              <Sparkles size={16} className="text-amber-500 shrink-0" />
              <span>Hoàn toàn miễn phí, 1 chạm với Google</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-notion-border-medium hover:border-notion-border-focus rounded-xl text-notion-text text-[0.85rem] font-semibold cursor-pointer shadow-sm hover:bg-notion-hover transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="animate-spin text-notion-primary" size={17} />
                  <span>Đang kết nối Google...</span>
                </>
              ) : (
                <>
                  <svg className="shrink-0 w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.57H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.43l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.57l4.03 3.15c.95-2.83 3.6-4.97 6.72-4.97z"
                    />
                  </svg>
                  <span>Tiếp tục với Google</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-[0.8rem] text-notion-secondary hover:text-notion-text transition-colors cursor-pointer bg-transparent border-none"
            >
              Để sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
