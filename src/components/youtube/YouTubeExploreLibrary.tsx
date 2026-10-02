"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Sparkles, Play, Search, Loader2 } from "lucide-react";
import { TranscribedVideoSummary } from "@/lib/client/firebase/firestore/youtubeTranscript";
import { YouTubeExploreSkeleton } from "./YouTubeExploreSkeleton";

const PAGE_SIZE = 12;

interface YouTubeExploreLibraryProps {
  onSelectVideo: (videoId: string) => void;
  isLoading?: boolean;
}

export function YouTubeExploreLibrary({ onSelectVideo, isLoading }: YouTubeExploreLibraryProps) {
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
    <section className="bg-notion-surface border border-notion-border rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm" aria-label="Thư viện bài học gợi ý">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-[1.15rem]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-notion-primary" />
            <h3 className="text-[1.05rem] font-bold text-notion-text m-0">Thư viện bài học gợi ý</h3>
            {videos.length > 0 && (
              <span className="bg-notion-blue-bg text-notion-blue-text text-[0.76rem] font-bold py-[0.15rem] px-[0.55rem] rounded-full">{videos.length}</span>
            )}
          </div>
          <p className="text-[0.82rem] text-notion-secondary mt-[0.2rem] mb-0">
            Chọn video bất kỳ để bắt đầu luyện nói ngay — phụ đề đã có sẵn, tải tức thì.
          </p>
        </div>
      </div>

      {/* Search input */}
      {!isInitialLoading && videos.length > 0 && (
        <div className="relative mb-[1.1rem]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-muted pointer-events-none" />
          <input
            type="text"
            className="w-full py-[0.55rem] pr-9 pl-9 border border-notion-border rounded-full text-[0.85rem] text-notion-text bg-notion-surface-subtle outline-none transition-all duration-150 box-border focus:border-notion-primary focus:bg-white focus:ring-2 focus:ring-notion-primary/10"
            placeholder="Tìm kiếm video theo tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-0 text-notion-muted text-xs cursor-pointer p-0.5 hover:text-notion-text"
              onClick={() => setSearchQuery("")}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 min-[580px]:grid-cols-2 md:grid-cols-3 gap-[1.1rem]">
        {isInitialLoading ? (
          <YouTubeExploreSkeleton count={6} />
        ) : filteredVideos.length === 0 ? (
          <p className="col-span-full text-center py-10 px-4 text-notion-muted text-[0.9rem] m-0">
            Không tìm thấy video phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;. Thử từ khoá khác nhé!
          </p>
        ) : (
          filteredVideos.map((video) => (
            <div
              key={video.videoId}
              className={`group bg-notion-surface border border-notion-border rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 shadow-sm hover:border-notion-blue-border hover:-translate-y-0.5 hover:shadow-md${
                isLoading ? " opacity-60 pointer-events-none" : ""
              }`}
              onClick={() => {
                if (!isLoading) onSelectVideo(video.videoId);
              }}
            >
              {/* Thumbnail */}
              <div className="relative w-full aspect-video bg-black overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                  alt={video.videoTitle}
                  className="w-full h-full object-cover transition-transform duration-250 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-[38px] h-[38px] rounded-full bg-notion-primary text-white flex items-center justify-center shadow-md scale-90 group-hover:scale-100 transition-transform duration-200">
                    <Play size={17} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>

                {/* Bottom badges */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                  <span className="bg-black/75 text-white text-[0.7rem] font-semibold py-[0.2rem] px-2 rounded backdrop-blur-[4px]">{video.totalSentences} câu</span>
                  {video.source === "native" && <span className="bg-notion-green-bg border border-notion-green-border text-notion-green-text text-[0.68rem] font-bold py-[0.15rem] px-1.5 rounded">🟢 YouTube</span>}
                </div>
              </div>

              {/* Body */}
              <div className="p-3.5 flex flex-col flex-1 gap-2.5">
                <h4 className="text-[0.88rem] font-bold text-notion-text leading-[1.4] m-0 line-clamp-2 min-h-[2.5em]" title={video.videoTitle}>
                  {video.videoTitle}
                </h4>

                <button
                  type="button"
                  className="mt-auto w-full py-2 px-3 rounded-lg bg-notion-blue-bg text-notion-blue-text border border-notion-blue-border text-xs font-semibold flex items-center justify-center transition-colors duration-150 hover:bg-notion-primary hover:text-white hover:border-notion-primary cursor-pointer"
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
        <div className="grid grid-cols-1 min-[580px]:grid-cols-2 md:grid-cols-3 gap-[1.1rem] mt-4">
          <YouTubeExploreSkeleton count={3} />
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {!searchQuery.trim() && hasMore && (
        <div ref={sentinelRef} className="py-4 flex justify-center items-center">
          {isLoadingMore ? (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-notion-primary bg-notion-blue-bg px-4 py-2 rounded-full">
              <Loader2 size={14} className="animate-spin" />
              <span>Đang tải thêm video...</span>
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-[0.45rem] py-[0.55rem] px-[1.4rem] bg-notion-surface border border-notion-border-medium rounded-full text-[0.85rem] font-semibold text-notion-primary cursor-pointer shadow-sm transition-all duration-200 hover:bg-notion-blue-bg hover:border-notion-blue-border hover:-translate-y-[1px]"
              onClick={loadMoreVideos}
            >
              <span>Xem thêm video</span>
            </button>
          )}
        </div>
      )}

      {/* All caught up notice */}
      {!searchQuery.trim() && !hasMore && videos.length > 0 && !isInitialLoading && (
        <div className="text-center py-6 text-xs font-medium text-notion-muted">
          ✨ Bạn đã khám phá hết danh sách video gợi ý
        </div>
      )}
    </section>
  );
}
