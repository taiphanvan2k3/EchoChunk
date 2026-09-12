'use client';

import React from 'react';
import { usePractice } from '@/context/PracticeContext';
import { TopicFilterBar } from '@/components/TopicFilterBar';
import { ShadowingMode } from '@/components/ShadowingMode';
import { SearchX, RotateCcw, Plus } from 'lucide-react';
import { soundManager } from '@/lib/sound';

export default function ShadowingPage() {
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
    progressMap,
    handleRateChunk,
    handleNext,
    handleShuffle,
    queueIndex,
  } = usePractice();

  if (!isClient) {
    return (
      <div className="notion-skeleton-container">
        <div className="skeleton-filter-bar" />
        <div className="notion-skeleton-card">
          <div className="skeleton-line skeleton-badge" />
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-ipa" />
          <div className="skeleton-box skeleton-sentence" />
          <div className="skeleton-row">
            <div className="skeleton-actions" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopicFilterBar
        topics={dynamicTopics}
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

      <div className="mode-view-container">
        {practiceQueue.length === 0 || !currentChunk ? (
          <div className="notion-empty-state">
            <div className="empty-state-icon-badge">
              <SearchX size={30} className="empty-state-icon" />
            </div>
            <h3 className="empty-state-title">Không tìm thấy chunk nào phù hợp</h3>
            <p className="empty-state-desc">
              Không có cụm từ nào khớp với bộ lọc hoặc từ khóa hiện tại. Hãy thử đặt lại bộ lọc để xem toàn bộ kho từ vựng hoặc tạo một chunk mới cho chủ đề này.
            </p>
            <div className="empty-state-actions">
              <button
                type="button"
                className="notion-btn-secondary"
                onClick={resetFilters}
              >
                <RotateCcw size={15} />
                <span>Đặt lại bộ lọc</span>
              </button>
              <button
                type="button"
                className="notion-btn-primary"
                onClick={openAddChunk}
              >
                <Plus size={15} />
                <span>Tạo Chunk Mới Ngay</span>
              </button>
            </div>
          </div>
        ) : (
          <ShadowingMode
            chunk={currentChunk}
            progress={progressMap[currentChunk.id]}
            onRate={handleRateChunk}
            onNext={handleNext}
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
