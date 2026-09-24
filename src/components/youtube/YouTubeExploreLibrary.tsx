"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Sparkles, Play, Search, Loader2 } from "lucide-react";
import { TranscribedVideoSummary } from "@/lib/client/firebase/firestore/youtubeTranscript";

const PAGE_SIZE = 12;

interface YouTubeExploreLibraryProps {
  onSelectVideo: (videoId: string) => void;
  isLoading?: boolean;
}

function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
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

export const YouTubeExploreLibrary: React.FC<YouTubeExploreLibraryProps> = ({ onSelectVideo, isLoading }) => {
  const [videos, setVideos] = useState<TranscribedVideoSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  // 1. Initial Load
  useEffect(() => {
    let cancelled = false;
    isFetchingRef.current = true;

    fetch(`/api/youtube/explore?limit=${PAGE_SIZE}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success && Array.isArray(json.videos)) {
          setVideos(json.videos);
          setNextCursor(json.nextCursor ?? null);
          setHasMore(Boolean(json.hasMore));
        }
      })
      .catch((err) => {
        console.warn("Failed to load initial explore videos:", err);
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitialLoading(false);
          isFetchingRef.current = false;
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Load More (Cursor-based Pagination)
  const loadMoreVideos = useCallback(async () => {
    if (isFetchingRef.current || !hasMore || !nextCursor || isLoadingMore) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoadingMore(true);

      const res = await fetch(`/api/youtube/explore?limit=${PAGE_SIZE}&cursor=${nextCursor}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.videos)) {
        setVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.videoId));
          const newUnique = json.videos.filter((v: TranscribedVideoSummary) => !existingIds.has(v.videoId));
          return [...prev, ...newUnique];
        });

        setNextCursor(json.nextCursor ?? null);
        setHasMore(Boolean(json.hasMore));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn("Failed to load more explore videos:", err);
    } finally {
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [hasMore, nextCursor, isLoadingMore]);

  // 3. Infinite Scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (isInitialLoading || isLoadingMore || !hasMore || searchQuery.trim()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
          loadMoreVideos();
        }
      },
      { threshold: 0.1, rootMargin: "300px" }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [isInitialLoading, isLoadingMore, hasMore, searchQuery, loadMoreVideos]);

  // Client-side search filtering on loaded videos
  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const q = searchQuery.toLowerCase();
    return videos.filter((v) => v.videoTitle.toLowerCase().includes(q));
  }, [videos, searchQuery]);

  // Don't render if Firestore returned nothing and initial fetch is done
  if (!isInitialLoading && videos.length === 0) return null;

  return (
    <section className="yt-explore-section" aria-label="Thư viện bài học gợi ý">
      {/* Header */}
      <div className="yt-explore-header">
        <div>
          <div className="yt-explore-title-group">
            <Sparkles size={17} className="text-blue-600" />
            <h3 className="yt-explore-title">Thư viện bài học gợi ý</h3>
            {videos.length > 0 && (
              <span className="yt-recent-count-badge">{videos.length}</span>
            )}
          </div>
          <p className="yt-explore-subtitle">
            Chọn video bất kỳ để bắt đầu luyện nói ngay — phụ đề đã có sẵn, tải tức thì.
          </p>
        </div>
      </div>

      {/* Search input */}
      {!isInitialLoading && videos.length > 0 && (
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
              onClick={() => setSearchQuery("")}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="yt-explore-grid">
        {isInitialLoading ? (
          <SkeletonCards count={6} />
        ) : filteredVideos.length === 0 ? (
          <p className="yt-explore-empty-msg" style={{ gridColumn: "1 / -1" }}>
            Không tìm thấy video phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;. Thử từ khoá khác nhé!
          </p>
        ) : (
          filteredVideos.map((video) => (
            <div
              key={video.videoId}
              className={`yt-explore-card${isLoading ? " is-disabled" : ""}`}
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
                  {video.source === "native" && <span className="yt-explore-native-badge">🟢 YouTube</span>}
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

      {/* Loading More Indicator / Skeleton row */}
      {isLoadingMore && (
        <div className="yt-explore-grid" style={{ marginTop: "1rem" }}>
          <SkeletonCards count={3} />
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {!searchQuery.trim() && hasMore && (
        <div ref={sentinelRef} className="yt-explore-sentinel py-4 flex justify-center items-center">
          {isLoadingMore ? (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
              <Loader2 size={14} className="animate-spin" />
              <span>Đang tải thêm video...</span>
            </div>
          ) : (
            <button
              type="button"
              className="yt-explore-load-more-btn"
              onClick={loadMoreVideos}
            >
              <span>Xem thêm video</span>
            </button>
          )}
        </div>
      )}

      {/* All caught up notice */}
      {!searchQuery.trim() && !hasMore && videos.length > 0 && !isInitialLoading && (
        <div className="text-center py-6 text-xs font-medium text-gray-500">
          ✨ Bạn đã khám phá hết danh sách video gợi ý
        </div>
      )}
    </section>
  );
};

