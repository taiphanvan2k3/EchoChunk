'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Play, Search, ChevronDown } from 'lucide-react';
import { TranscribedVideoSummary } from '@/lib/firebase/firestore/youtubeTranscript';

const INITIAL_VISIBLE_COUNT = 6;
const BATCH_SIZE = 6;

interface YouTubeExploreLibraryProps {
  onSelectVideo: (videoId: string) => void;
  isLoading?: boolean;
}

function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="yt-explore-skeleton-card">
          <div className="yt-explore-skeleton-thumb" />
          <div className="yt-explore-skeleton-body">
            <div className="yt-explore-skeleton-line long" />
            <div className="yt-explore-skeleton-line short" />
            <div className="yt-explore-skeleton-line btn" />
          </div>
        </div>
      ))}
    </>
  );
}

export const YouTubeExploreLibrary: React.FC<YouTubeExploreLibraryProps> = ({
  onSelectVideo,
  isLoading,
}) => {
  const [videos, setVideos] = useState<TranscribedVideoSummary[]>([]);
  // Start in fetching state to show skeletons immediately on mount
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/youtube/explore')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success && Array.isArray(json.videos)) {
          setVideos(json.videos);
        }
      })
      .catch(() => {
        // Silently fail — the library simply won't show
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const q = searchQuery.toLowerCase();
    return videos.filter((v) => v.videoTitle.toLowerCase().includes(q));
  }, [videos, searchQuery]);

  const displayedVideos = useMemo(() => {
    if (searchQuery.trim()) return filtered;
    return filtered.slice(0, visibleCount);
  }, [filtered, searchQuery, visibleCount]);

  // Don't render at all if Firestore returned nothing and we're done fetching
  if (!isFetching && videos.length === 0) return null;

  return (
    <section className="yt-explore-section" aria-label="Thư viện bài học gợi ý">
      {/* Header */}
      <div className="yt-explore-header">
        <div>
          <div className="yt-explore-title-group">
            <Sparkles size={17} className="text-blue-600" />
            <h3 className="yt-explore-title">Thư viện bài học gợi ý</h3>
          </div>
          <p className="yt-explore-subtitle">
            Chọn video bất kỳ để bắt đầu luyện nói ngay — phụ đề đã có sẵn, tải tức thì.
          </p>
        </div>
      </div>

      {/* Search input */}
      {!isFetching && videos.length > 0 && (
        <div className="yt-explore-search-wrap">
          <Search size={14} className="yt-explore-search-icon" />
          <input
            type="text"
            className="yt-explore-search-input"
            placeholder="Tìm kiếm video theo tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="yt-explore-search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="yt-explore-grid">
        {isFetching ? (
          <SkeletonCards />
        ) : displayedVideos.length === 0 ? (
          <p className="yt-explore-empty-msg" style={{ gridColumn: '1 / -1' }}>
            Không tìm thấy video phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;. Thử từ khoá khác nhé!
          </p>
        ) : (
          displayedVideos.map((video) => (
            <div
              key={video.videoId}
              className={`yt-explore-card${isLoading ? ' is-disabled' : ''}`}
              onClick={() => {
                if (!isLoading) onSelectVideo(video.videoId);
              }}
            >
              {/* Thumbnail */}
              <div className="yt-explore-thumb-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                  alt={video.videoTitle}
                  className="yt-explore-thumb-img"
                  loading="lazy"
                />
                <div className="yt-explore-thumb-overlay">
                  <div className="yt-explore-play-circle">
                    <Play size={17} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>

                {/* Bottom badges */}
                <div className="yt-explore-badge-row">
                  <span className="yt-explore-sentence-badge">{video.totalSentences} câu</span>
                  {video.source === 'native' && (
                    <span className="yt-explore-native-badge">🟢 YouTube</span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="yt-explore-body">
                <h4 className="yt-explore-item-title" title={video.videoTitle}>
                  {video.videoTitle}
                </h4>

                <button
                  type="button"
                  className="yt-explore-action-btn"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLoading) onSelectVideo(video.videoId);
                  }}
                >
                  Luyện nói ngay →
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load more button */}
      {!searchQuery.trim() && filtered.length > visibleCount && (
        <div className="yt-explore-load-more-wrap">
          <button
            type="button"
            className="yt-explore-load-more-btn"
            onClick={() => setVisibleCount((prev) => prev + BATCH_SIZE)}
          >
            <span>Xem thêm video ({filtered.length - visibleCount} video còn lại)</span>
            <ChevronDown size={15} />
          </button>
        </div>
      )}
    </section>
  );
};
