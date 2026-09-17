'use client';

import React from 'react';
import { YouTubeHistoryItem } from '@/types/youtube';
import { YouTubeRecentVideos } from './YouTubeRecentVideos';
import { Sparkles, Mic, BookOpen } from 'lucide-react';

interface YouTubeEmptyStateProps {
  history: YouTubeHistoryItem[];
  onSelectVideo: (url: string) => void;
  onRemoveHistory: (videoId: string) => void;
  isLoading: boolean;
}

export const YouTubeEmptyState: React.FC<YouTubeEmptyStateProps> = ({
  history,
  onSelectVideo,
  onRemoveHistory,
  isLoading,
}) => {
  return (
    <div className="yt-empty-container">
      {/* Danh sách video đã học gần đây */}
      <YouTubeRecentVideos
        history={history}
        onSelectVideo={onSelectVideo}
        onRemoveVideo={onRemoveHistory}
        isLoading={isLoading}
      />

      <div className="yt-empty-state-card">
        <div className="yt-empty-icon-wrap">
          <Sparkles size={28} className="yt-empty-sparkle" />
        </div>
        <h2 className="yt-empty-title">Luyện Phản Xạ Nói Cùng Video YouTube</h2>
        <p className="yt-empty-desc">
          Dán bất kỳ link video tiếng Anh nào bạn yêu thích vào ô tìm kiếm ở trên để hệ thống tự động tải phụ đề
          tương tác, highlight từng từ và bắt đầu luyện cơ miệng.
        </p>

        {/* Gợi ý video mẫu nhanh */}
        <div className="yt-suggestions-box">
          <span className="suggestions-label">Thử nhanh video mẫu:</span>
          <div className="suggestions-chips">
            <button
              type="button"
              className="suggestion-chip"
              onClick={() => onSelectVideo('https://www.youtube.com/watch?v=RYNCAcP1VSE')}
            >
              ✨ Khanh Vy Learn English (EP 408)
            </button>
            <button
              type="button"
              className="suggestion-chip"
              onClick={() => onSelectVideo('https://www.youtube.com/watch?v=xsFgrZdomDQ')}
            >
              🎬 Show and Tell 3 (Party Time)
            </button>
            <button
              type="button"
              className="suggestion-chip"
              onClick={() => onSelectVideo('https://www.youtube.com/watch?v=zMHhO3WNVfY')}
            >
              🍿 Movies with Subtitles
            </button>
          </div>
        </div>
      </div>

      {/* 3 Thẻ tính năng nổi bật phía dưới empty state */}
      <div className="yt-empty-features-grid">
        <div className="yt-feature-card">
          <div className="yt-feature-icon-badge blue">
            <Sparkles size={18} />
          </div>
          <h4 className="yt-feature-title">Karaoke Subtitles</h4>
          <p className="yt-feature-desc">
            Đồng bộ chính xác từng mili-giây, highlight từng từ mượt mà khi người nói phát âm.
          </p>
        </div>

        <div className="yt-feature-card">
          <div className="yt-feature-icon-badge green">
            <Mic size={18} />
          </div>
          <h4 className="yt-feature-title">4 Chế độ Luyện Tập</h4>
          <p className="yt-feature-desc">
            Shadowing nhại giọng, Dictation chép chính tả, đàm thoại AI và bóc tách từ vựng.
          </p>
        </div>

        <div className="yt-feature-card">
          <div className="yt-feature-icon-badge purple">
            <BookOpen size={18} />
          </div>
          <h4 className="yt-feature-title">Ngữ Cảnh Thực Tế</h4>
          <p className="yt-feature-desc">
            Học trực tiếp từ video yêu thích, bắt chước nối âm và ngữ điệu tự nhiên của người bản xứ.
          </p>
        </div>
      </div>
    </div>
  );
};
