'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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

export function YouTubeRecentVideos({
  onSelectVideo,
  onSwitchToExplore,
  isLoading,
}: YouTubeRecentVideosProps) {
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
      <section className="bg-notion-surface border border-notion-border rounded-2xl p-6 shadow-sm" aria-label="Video đã học gần đây">
        <div className="text-center py-12 px-6 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-notion-surface-subtle text-notion-muted flex items-center justify-center">
            <Clock size={32} />
          </div>
          <h4 className="text-[1.05rem] font-bold text-notion-text m-0">Chưa có video nào trong lịch sử học</h4>
          <p className="text-[0.88rem] text-notion-secondary max-w-[420px] mx-auto leading-relaxed m-0">
            Dán link YouTube bất kỳ ở thanh trên để bắt đầu, hoặc khám phá các video phụ đề có sẵn trong thư viện.
          </p>
          {onSwitchToExplore && (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-[0.45rem] py-[0.55rem] px-5 bg-notion-primary text-white border-0 rounded-full text-[0.85rem] font-semibold cursor-pointer transition-all duration-150 shadow-sm hover:bg-notion-primary-hover hover:-translate-y-[1px]"
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
    <section className="bg-notion-surface border border-notion-border rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm" aria-label="Video đã học gần đây">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-[1.15rem] gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Clock size={17} className="text-notion-primary" />
          <h3 className="text-[1.05rem] font-bold text-notion-text m-0">Video đã học gần đây</h3>
          <span className="bg-notion-blue-bg text-notion-blue-text text-[0.76rem] font-bold py-[0.15rem] px-[0.55rem] rounded-full">{historyItems.length}</span>
        </div>

        {/* Thanh tìm kiếm nhanh video trong lịch sử */}
        <div className="relative w-full sm:w-[260px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-muted pointer-events-none" />
          <input
            type="text"
            className="w-full py-[0.45rem] pr-7 pl-9 border border-notion-border rounded-full text-[0.82rem] text-notion-text bg-notion-surface-subtle outline-none transition-all duration-150 box-border focus:border-notion-primary focus:bg-white focus:ring-2 focus:ring-notion-primary/10"
            placeholder="Tìm trong video đã học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-0 text-notion-muted text-xs cursor-pointer p-0.5 hover:text-notion-text"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-10 px-4 text-notion-secondary text-[0.9rem]">
          <p className="m-0">
            Không tìm thấy video nào khớp với từ khóa &ldquo;<strong>{searchQuery}</strong>&rdquo;.
          </p>
          <button
            type="button"
            className="mt-2 bg-transparent border border-notion-border-medium rounded-md py-[0.35rem] px-[0.85rem] text-[0.8rem] font-semibold text-notion-primary cursor-pointer transition-all duration-150 hover:bg-notion-blue-bg hover:border-notion-blue-border"
            onClick={() => setSearchQuery('')}
          >
            Xóa tìm kiếm
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 min-[580px]:grid-cols-2 md:grid-cols-3 gap-[1.15rem]">
            {displayedItems.map((item) => {
              const completed = item.completedSentencesCount || 0;
              const total = item.totalSentences || 1;
              const percent = Math.min(100, Math.round((completed / total) * 100));
              const isFinished = completed >= total && total > 0;

              return (
                <div
                  key={item.videoId}
                  className={`group bg-notion-surface border border-notion-border rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 shadow-sm hover:border-notion-blue-border hover:-translate-y-0.5 hover:shadow-md${
                    isLoading ? ' opacity-60 pointer-events-none' : ''
                  }`}
                  onClick={() => {
                    if (!isLoading) {
                      onSelectVideo(item.videoUrl || `https://www.youtube.com/watch?v=${item.videoId}`);
                    }
                  }}
                >
                  {/* Thumbnail 16:9 với lớp phủ và nút Xóa */}
                  <div className="relative w-full aspect-video bg-black overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        item.thumbnailUrl ||
                        `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`
                      }
                      alt={item.videoTitle}
                      className="w-full h-full object-cover transition-transform duration-250 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-[38px] h-[38px] rounded-full bg-notion-primary text-white flex items-center justify-center shadow-md scale-90 group-hover:scale-100 transition-transform duration-200">
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>

                    {/* Badge số câu trên thumbnail */}
                    <div className="absolute bottom-2 left-2 bg-black/75 text-white text-[0.7rem] font-semibold py-[0.2rem] px-2 rounded backdrop-blur-[4px]">
                      {item.totalSentences} câu
                    </div>

                    {/* Nút xóa video khỏi lịch sử */}
                    <button
                      type="button"
                      className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/65 text-white border-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-150 backdrop-blur-[4px] hover:bg-notion-red hover:scale-110"
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
                  <div className="p-4 flex flex-col flex-1 gap-2.5">
                    <h4 className="text-[0.88rem] font-bold text-notion-text leading-[1.4] m-0 line-clamp-2 min-h-[2.5em]" title={item.videoTitle}>
                      {item.videoTitle}
                    </h4>

                    {/* Thanh tiến độ */}
                    <div className="flex flex-col gap-[0.3rem]">
                      <div className="w-full h-[5px] bg-notion-hover rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isFinished ? 'bg-notion-green' : 'bg-notion-primary'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[0.74rem] text-notion-secondary">
                        <span>
                          {isFinished ? (
                            <span className="text-notion-green-text font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 size={12} /> Đã hoàn thành
                            </span>
                          ) : (
                            `Đã luyện ${completed}/${total} câu`
                          )}
                        </span>
                        <span className="font-semibold text-notion-text">{percent}%</span>
                      </div>
                    </div>

                    {/* Footer card: Thời gian và nút hành động */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-notion-border">
                      <span className="text-[0.74rem] text-notion-muted">
                        {formatRelativeTime(item.lastStudiedAt)}
                      </span>
                      <button
                        type="button"
                        className="bg-notion-blue-bg text-notion-blue-text border border-notion-blue-border rounded-md py-[0.25rem] px-[0.65rem] text-[0.76rem] font-semibold cursor-pointer transition-all duration-150 hover:bg-notion-primary hover:text-white hover:border-notion-primary"
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
            <div ref={sentinelRef} className="flex justify-center py-4">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-5 bg-notion-surface border border-notion-border rounded-full text-xs font-semibold text-notion-secondary shadow-sm hover:bg-notion-hover hover:text-notion-text hover:border-notion-border-medium transition-all cursor-pointer"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                <span>Xem thêm video ({filteredItems.length - visibleCount} video còn lại)</span>
                <ChevronDown size={15} />
              </button>
            </div>
          )}

          {/* End of list message */}
          {!searchQuery.trim() && !hasMore && filteredItems.length > PAGE_SIZE && (
            <div className="text-center py-6 text-xs font-medium text-notion-muted">
              ✨ Đã hiển thị tất cả video đã học gần đây
            </div>
          )}
        </>
      )}
    </section>
  );
}
