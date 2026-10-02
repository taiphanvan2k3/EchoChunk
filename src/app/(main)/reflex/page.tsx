'use client';

import { usePractice } from '@/context/PracticeContext';
import { TopicFilterBar } from '@/components/TopicFilterBar';
import { QuickReflexMode } from '@/components/QuickReflexMode';
import { SearchX, RotateCcw, Plus } from 'lucide-react';
import { soundManager } from '@/lib/client/sound';

export default function ReflexPage() {
  const {
    isClient,
    dynamicTopics,
    selectedTopicId,
    setSelectedTopicId,
    selectedLevel,
    setSelectedLevel,
    searchQuery,
    setSearchQuery,
    setShuffleSeed,
    setQueueIndex,
    openAddChunk,
    openEditChunk,
    resetFilters,
    practiceQueue,
    currentChunk,
    handleRateChunk,
    handleShuffle,
    queueIndex,
    totalChunksCount,
  } = usePractice();

  if (!isClient && !currentChunk) {
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
    <>
      <TopicFilterBar
        topics={dynamicTopics}
        totalChunksCount={totalChunksCount}
        selectedTopicId={selectedTopicId}
        onSelectTopic={(tId) => {
          soundManager.playClick();
          setSelectedTopicId(tId);
          setShuffleSeed(0);
          setQueueIndex(0);
        }}
        selectedLevel={selectedLevel}
        onSelectLevel={(lvl) => {
          soundManager.playClick();
          setSelectedLevel(lvl);
          setShuffleSeed(0);
          setQueueIndex(0);
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setQueueIndex(0);
        }}
        onOpenAddChunk={openAddChunk}
      />

      <div className="w-full">
        {practiceQueue.length === 0 || !currentChunk ? (
          <div className="flex flex-col items-center justify-center text-center bg-notion-surface border border-notion-border rounded-2xl p-10 sm:p-14 max-w-[520px] mx-auto my-6 sm:mb-12 shadow-[0_4px_20px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="w-[68px] h-[68px] rounded-full bg-notion-surface-subtle border border-notion-border flex items-center justify-center mb-5">
              <SearchX size={30} className="text-notion-secondary" />
            </div>
            <h3 className="text-lg font-bold text-notion-text mb-2 tracking-tight">Không tìm thấy chunk nào phù hợp</h3>
            <p className="text-sm text-notion-secondary leading-relaxed max-w-[420px] mb-7">
              Không có cụm từ nào khớp với bộ lọc hoặc từ khóa hiện tại. Hãy thử đặt lại bộ lọc để xem toàn bộ kho từ vựng hoặc tạo một chunk mới cho chủ đề này.
            </p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                type="button"
                className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-notion-btn-secondary hover:bg-notion-btn-secondary-hover border border-notion-btn-secondary-border text-notion-text text-sm font-semibold transition-colors cursor-pointer"
                onClick={resetFilters}
              >
                <RotateCcw size={15} />
                <span>Đặt lại bộ lọc</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-notion-primary hover:bg-notion-primary-hover text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                onClick={openAddChunk}
              >
                <Plus size={15} />
                <span>Tạo Chunk Mới Ngay</span>
              </button>
            </div>
          </div>
        ) : (
          <QuickReflexMode
            chunk={currentChunk}
            onRate={handleRateChunk}
            onShuffle={handleShuffle}
            currentIndex={queueIndex}
            totalInQueue={practiceQueue.length}
            onEditChunk={openEditChunk}
          />
        )}
      </div>
    </>
  );
}
