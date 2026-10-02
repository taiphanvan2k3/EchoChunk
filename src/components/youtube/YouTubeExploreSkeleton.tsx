'use client';

interface YouTubeExploreSkeletonProps {
  count?: number;
}

export function YouTubeExploreSkeleton({ count = 6 }: YouTubeExploreSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-notion-surface border border-notion-border rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="w-full aspect-video bg-gradient-to-r from-notion-hover via-notion-active to-notion-hover bg-[length:200%_100%] animate-pulse" />
          <div className="p-3.5 flex flex-col gap-2">
            <div className="h-3 w-[90%] rounded bg-gradient-to-r from-notion-hover via-notion-active to-notion-hover bg-[length:200%_100%] animate-pulse" />
            <div className="h-3 w-[55%] rounded bg-gradient-to-r from-notion-hover via-notion-active to-notion-hover bg-[length:200%_100%] animate-pulse" />
            <div className="h-8 w-full mt-2 rounded-lg bg-gradient-to-r from-notion-hover via-notion-active to-notion-hover bg-[length:200%_100%] animate-pulse" />
          </div>
        </div>
      ))}
    </>
  );
}
