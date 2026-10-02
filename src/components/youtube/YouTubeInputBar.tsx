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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-5 w-full">
      <div className="flex-1 h-11 flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3.5 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 min-w-0">
        <VideoIcon size={18} className="shrink-0 text-red-500" />
        <input
          type="text"
          className="flex-1 border-0 outline-none bg-transparent text-sm sm:text-[0.92rem] text-gray-900 placeholder:text-gray-400"
          placeholder="Dán link YouTube (VD: https://www.youtube.com/watch?v=... hoặc youtu.be/...)"
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
            className="border-0 bg-transparent text-gray-400 cursor-pointer flex items-center justify-center p-1 rounded-full hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
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
          className="h-11 flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-blue-600 text-white border-0 rounded-xl px-5 text-sm font-semibold cursor-pointer transition-all shadow-sm hover:not(:disabled):bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
              <Play size={14} fill="currentColor" />
              <span>Load Video</span>
            </>
          )}
        </button>

        {/* API Key settings button */}
        {onOpenKeySettings && (
          <button
            type="button"
            className={`h-11 flex items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs sm:text-sm font-semibold cursor-pointer transition-all border whitespace-nowrap ${
              hasUserKeys
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 shadow-sm'
            }`}
            onClick={onOpenKeySettings}
            title={hasUserKeys ? 'Bạn đang dùng API key riêng' : 'Cài đặt API key riêng'}
          >
            <KeyRound size={15} className={hasUserKeys ? 'text-emerald-600' : 'text-gray-500'} />
            <span>{hasUserKeys ? 'My Keys' : 'API Key'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
