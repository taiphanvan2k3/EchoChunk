'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useYouTubeHistory } from '@/hooks/useYouTubeHistory';
import { youtubeHistoryStore } from '@/stores/youtubeHistoryStore';
import { Play, Trash2, Clock, CheckCircle2, Search, Sparkles, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 6;

interface YouTubeRecentVideosProps {
  onSelectVideo: (url: string) => void;
  onSwitchToExplore?: () => void;
  isLoading?: boolean;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks} tuần trước`;

  return new Date(timestamp).toLocaleDateString('vi-VN');
}

export const YouTubeRecentVideos: React.FC<YouTubeRecentVideosProps> = ({
  onSelectVideo,
  onSwitchToExplore,
  isLoading,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Subscribe this component to the store through useExternalStore
  const historyItems = useYouTubeHistory(user?.uid);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return historyItems;
    const q = searchQuery.toLowerCase();
    return historyItems.filter((item) =>
      item.videoTitle.toLowerCase().includes(q)
    );
  }, [historyItems, searchQuery]);

  const displayedItems = useMemo(() => {
    if (searchQuery.trim()) return filteredItems;
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, searchQuery, visibleCount]);

  const hasMore = !searchQuery.trim() && visibleCount < filteredItems.length;

  // Infinite scroll trigger via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1, rootMargin: '250px' }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore]);

  // Trạng thái khi chưa có video nào trong lịch sử
  if (!historyItems || historyItems.length === 0) {
    return (
      <section className="yt-recent-section" aria-label="Video đã học gần đây">
        <div className="yt-recent-empty-state">
          <div className="yt-recent-empty-icon">
            <Clock size={32} />
          </div>
          <h4 className="yt-recent-empty-title">Chưa có video nào trong lịch sử học</h4>
          <p className="yt-recent-empty-desc">
            Dán link YouTube bất kỳ ở thanh trên để bắt đầu, hoặc khám phá các video phụ đề có sẵn trong thư viện.
          </p>
          {onSwitchToExplore && (
            <button
              type="button"
              className="yt-recent-empty-action-btn"
              onClick={onSwitchToExplore}
            >
              <Sparkles size={15} />
              <span>Khám phá Thư viện gợi ý</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  const handleRemoveVideo = (videoId: string) => {
    youtubeHistoryStore.remove(videoId, user?.uid);
  };

  return (
    <section className="yt-recent-section" aria-label="Video đã học gần đây">
      <div className="yt-recent-header">
        <div className="yt-recent-title-group">
          <Clock size={17} className="text-blue-600" />
          <h3 className="yt-recent-title">Video đã học gần đây</h3>
          <span className="yt-recent-count-badge">{historyItems.length}</span>
        </div>

        {/* Thanh tìm kiếm nhanh video trong lịch sử */}
        <div className="yt-recent-search-wrap">
          <Search size={14} className="yt-recent-search-icon" />
          <input
            type="text"
            className="yt-recent-search-input"
            placeholder="Tìm trong video đã học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="yt-recent-search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="yt-recent-search-empty">
          <p>
            Không tìm thấy video nào khớp với từ khóa &ldquo;<strong>{searchQuery}</strong>&rdquo;.
          </p>
          <button
            type="button"
            className="yt-recent-search-clear"
            onClick={() => setSearchQuery('')}
          >
            Xóa tìm kiếm
          </button>
        </div>
      ) : (
        <>
          <div className="yt-recent-grid">
            {displayedItems.map((item) => {
              const completed = item.completedSentencesCount || 0;
              const total = item.totalSentences || 1;
              const percent = Math.min(100, Math.round((completed / total) * 100));
              const isFinished = completed >= total && total > 0;

              return (
                <div
                  key={item.videoId}
                  className={`yt-recent-card${isLoading ? ' is-disabled' : ''}`}
                  onClick={() => {
                    if (!isLoading) {
                      onSelectVideo(item.videoUrl || `https://www.youtube.com/watch?v=${item.videoId}`);
                    }
                  }}
                >
                  {/* Thumbnail 16:9 với lớp phủ và nút Xóa */}
                  <div className="yt-recent-thumb-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        item.thumbnailUrl ||
                        `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`
                      }
                      alt={item.videoTitle}
                      className="yt-recent-thumb-img"
                      loading="lazy"
                    />
                    <div className="yt-recent-thumb-overlay">
                      <div className="yt-recent-play-circle">
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>

                    {/* Badge số câu trên thumbnail */}
                    <div className="yt-recent-sentence-badge">
                      {item.totalSentences} câu
                    </div>

                    {/* Nút xóa video khỏi lịch sử */}
                    <button
                      type="button"
                      className="yt-recent-delete-btn"
                      title="Xóa khỏi lịch sử"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveVideo(item.videoId);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Thông tin video & tiến độ */}
                  <div className="yt-recent-body">
                    <h4 className="yt-recent-item-title" title={item.videoTitle}>
                      {item.videoTitle}
                    </h4>

                    {/* Thanh tiến độ */}
                    <div className="yt-recent-progress-wrap">
                      <div className="yt-recent-progress-bar">
                        <div
                          className={`yt-recent-progress-fill${isFinished ? ' is-done' : ''}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="yt-recent-progress-meta">
                        <span className="yt-recent-progress-text">
                          {isFinished ? (
                            <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 size={12} /> Đã hoàn thành
                            </span>
                          ) : (
                            `Đã luyện ${completed}/${total} câu`
                          )}
                        </span>
                        <span className="yt-recent-percent-text">{percent}%</span>
                      </div>
                    </div>

                    {/* Footer card: Thời gian và nút hành động */}
                    <div className="yt-recent-footer">
                      <span className="yt-recent-time-text">
                        {formatRelativeTime(item.lastStudiedAt)}
                      </span>
                      <button
                        type="button"
                        className="yt-recent-action-btn"
                        disabled={isLoading}
                      >
                        {isFinished ? 'Ôn lại' : 'Học tiếp'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Infinite Scroll Sentinel / Load More */}
          {hasMore && (
            <div ref={sentinelRef} className="yt-explore-load-more-wrap py-4">
              <button
                type="button"
                className="yt-explore-load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                <span>Xem thêm video ({filteredItems.length - visibleCount} video còn lại)</span>
                <ChevronDown size={15} />
              </button>
            </div>
          )}

          {/* End of list message */}
          {!searchQuery.trim() && !hasMore && filteredItems.length > PAGE_SIZE && (
            <div className="text-center py-6 text-xs font-medium text-gray-500">
              ✨ Đã hiển thị tất cả video đã học gần đây
            </div>
          )}
        </>
      )}
    </section>
  );
};

