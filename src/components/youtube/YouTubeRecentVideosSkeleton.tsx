'use client';

import { Clock } from 'lucide-react';

interface YouTubeRecentVideosSkeletonProps {
  count?: number;
}

export function YouTubeRecentVideosSkeleton({ count = 6 }: YouTubeRecentVideosSkeletonProps) {
  return (
    <section
      className="bg-notion-surface border border-notion-border rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm"
      aria-label="Đang tải video đã học gần đây"
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-[1.15rem] gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Clock size={17} className="text-notion-muted" />
          <div className="h-5 w-36 rounded bg-gradient-to-r from-notion-hover via-notion-active to-notion-hover bg-[length:200%_100%] animate-pulse" />
          <div className="w-7 h-5 rounded-full bg-notion-hover animate-pulse" />
        </div>

        {/* Thanh tìm kiếm skeleton */}
        <div className="w-full sm:w-[260px] h-[34px] rounded-full bg-notion-hover animate-pulse" />
      </div>

      <div className="grid grid-cols-1 min-[580px]:grid-cols-2 md:grid-cols-3 gap-[1.15rem]">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-notion-surface border border-notion-border rounded-xl overflow-hidden flex flex-col shadow-sm"
          >
            {/* Thumbnail skeleton 16:9 */}
            <div className="w-full aspect-video bg-gradient-to-r from-notion-hover via-notion-active to-notion-hover bg-[length:200%_100%] animate-pulse" />

            {/* Content skeleton */}
            <div className="p-4 flex flex-col flex-1 gap-2.5">
              <div className="h-4 w-[90%] rounded bg-gradient-to-r from-notion-hover via-notion-active to-notion-hover bg-[length:200%_100%] animate-pulse" />
              <div className="h-3 w-[60%] rounded bg-gradient-to-r from-notion-hover via-notion-active to-notion-hover bg-[length:200%_100%] animate-pulse" />

              {/* Progress bar skeleton */}
              <div className="w-full h-[5px] mt-2 bg-notion-hover rounded-full overflow-hidden" />

              <div className="flex justify-between items-center mt-1">
                <div className="h-3 w-16 rounded bg-notion-hover animate-pulse" />
                <div className="h-3 w-20 rounded bg-notion-hover animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
