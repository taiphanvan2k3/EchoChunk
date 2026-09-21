'use client';

import React from 'react';
import { Video as VideoIcon, X, Play, Loader2, KeyRound } from 'lucide-react';

interface YouTubeInputBarProps {
  inputUrl: string;
  onChangeUrl: (url: string) => void;
  onLoadVideo: (targetUrl?: string) => void;
  isLoading: boolean;
  hasUserKeys?: boolean;
  onOpenKeySettings?: () => void;
}

export const YouTubeInputBar: React.FC<YouTubeInputBarProps> = ({
  inputUrl,
  onChangeUrl,
  onLoadVideo,
  isLoading,
  hasUserKeys,
  onOpenKeySettings,
}) => {
  return (
    <div className="yt-input-bar-wrap">
      <div className="yt-input-capsule">
        <VideoIcon size={18} className="yt-input-icon text-red-500" />
        <input
          type="text"
          className="yt-url-input"
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
            className="yt-clear-input-btn"
            onClick={() => onChangeUrl('')}
            title="Xóa link"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <button
        type="button"
        className="yt-load-video-btn"
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
          className={`yt-key-settings-btn${hasUserKeys ? ' has-keys' : ''}`}
          onClick={onOpenKeySettings}
          title={hasUserKeys ? 'Bạn đang dùng API key riêng' : 'Cài đặt API key riêng'}
        >
          <KeyRound size={14} />
          <span className="hidden sm:inline">{hasUserKeys ? 'My Keys' : 'API Key'}</span>
        </button>
      )}
    </div>
  );
};
