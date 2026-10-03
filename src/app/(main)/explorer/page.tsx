'use client';

import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import { useIsClient } from '@/hooks/useIsClient';
import { TopicExplorerMode } from '@/components/TopicExplorerMode';

export default function ExplorerPage() {
  const isClient = useIsClient();
  const {
    dynamicTopics,
    allChunks,
    progressMap,
    handleStartPracticeTopic,
    handlePracticeChunk,
    openAddChunk,
    openEditChunk,
    handleDeleteChunk,
  } = usePracticeQueue();

  if (!isClient && allChunks.length === 0) {
    return (
      <div className="flex flex-col gap-5 w-full m-0 p-0">
        <div className="w-full h-20 bg-notion-surface-subtle rounded-xl border border-notion-border animate-pulse" />
        <div className="w-full bg-notion-surface border border-notion-border rounded-xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-5 min-h-[380px] animate-pulse">
          <div className="w-32 h-6 bg-notion-active rounded-md" />
          <div className="w-[45%] h-9 bg-notion-active rounded-md mx-auto" />
          <div className="w-1/4 h-[18px] bg-notion-active rounded mx-auto" />
          <div className="w-full h-28 bg-notion-surface-subtle rounded-lg" />
          <div className="flex gap-3 mt-3">
            <div className="h-12 w-full bg-notion-active rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <TopicExplorerMode
        topics={dynamicTopics}
        chunks={allChunks}
        progressMap={progressMap}
        onStartPracticeTopic={handleStartPracticeTopic}
        onPracticeChunk={handlePracticeChunk}
        onOpenAddChunk={openAddChunk}
        onEditChunk={openEditChunk}
        onDeleteChunk={handleDeleteChunk}
      />
    </div>
  );
}

