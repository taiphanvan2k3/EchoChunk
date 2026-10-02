'use client';

import { Video as VideoIcon, X, Play, Loader2, KeyRound } from 'lucide-react';

interface YouTubeInputBarProps {
  inputUrl: string;
  onChangeUrl: (url: string) => void;
  onLoadVideo: (targetUrl?: string) => void;
  isLoading: boolean;
  hasUserKeys?: boolean;
  onOpenKeySettings?: () => void;
}

export function YouTubeInputBar({
  inputUrl,
  onChangeUrl,
  onLoadVideo,
  isLoading,
  hasUserKeys,
  onOpenKeySettings,
}: YouTubeInputBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-[0.85rem] mb-5 sm:mb-6 w-full">
      <div className="flex-1 flex items-center gap-2 sm:gap-[0.65rem] bg-notion-surface border border-notion-border rounded-lg py-2 sm:py-[0.65rem] px-3 sm:px-4 transition-all duration-200 shadow-sm focus-within:border-notion-primary focus-within:ring-2 focus-within:ring-notion-primary/15 min-w-0">
        <VideoIcon size={18} className="shrink-0 text-notion-red" />
        <input
          type="text"
          className="flex-1 border-0 outline-none bg-transparent text-[0.92rem] text-notion-text placeholder:text-notion-muted"
          placeholder="Dán link YouTube (ví dụ: https://www.youtube.com/watch?v=... hoặc youtu.be/...)"
          value={inputUrl}
          onChange={(e) => onChangeUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading) {
              onLoadVideo();
            }
          }}
        />
        {inputUrl && (
          <button
            type="button"
            className="border-0 bg-transparent text-notion-muted cursor-pointer flex items-center justify-center p-[3px] rounded-full hover:bg-notion-hover hover:text-notion-text transition-colors shrink-0"
            onClick={() => onChangeUrl('')}
            title="Xóa link"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-notion-primary text-white border-0 rounded-lg py-2 sm:py-[0.65rem] px-3.5 sm:px-[1.35rem] text-sm sm:text-[0.92rem] font-semibold cursor-pointer transition-all duration-150 shadow-sm whitespace-nowrap hover:not(:disabled):bg-notion-primary-hover hover:not(:disabled):-translate-y-[1px] disabled:opacity-55 disabled:cursor-not-allowed"
          disabled={!inputUrl.trim() || isLoading}
          onClick={() => onLoadVideo()}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Đang tải...</span>
            </>
          ) : (
            <>
              <Play size={15} fill="currentColor" />
              <span>Load Video</span>
            </>
          )}
        </button>

        {/* API Key settings button */}
        {onOpenKeySettings && (
          <button
            type="button"
            className={`flex items-center justify-center gap-[0.3rem] rounded-lg py-2 sm:py-[0.4rem] px-2.5 sm:px-[0.7rem] text-xs sm:text-[0.78rem] font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap ${
              hasUserKeys
                ? 'border border-notion-green-border bg-notion-green-bg text-notion-green-text'
                : 'bg-notion-hover border border-notion-border text-notion-text hover:bg-notion-blue-bg hover:border-notion-blue-border hover:text-notion-blue-text'
            }`}
            onClick={onOpenKeySettings}
            title={hasUserKeys ? 'Bạn đang dùng API key riêng' : 'Cài đặt API key riêng'}
          >
            <KeyRound size={14} />
            <span>{hasUserKeys ? 'My Keys' : 'API Key'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
