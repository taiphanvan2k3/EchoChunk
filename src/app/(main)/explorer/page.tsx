'use client';

import React from 'react';
import { usePractice } from '@/context/PracticeContext';
import { TopicExplorerMode } from '@/components/TopicExplorerMode';

export default function ExplorerPage() {
  const {
    isClient,
    dynamicTopics,
    allChunks,
    progressMap,
    handleStartPracticeTopic,
    handlePracticeChunk,
    openAddChunk,
    openEditChunk,
    handleDeleteChunk,
  } = usePractice();

  if (!isClient && allChunks.length === 0) {
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
    <div className="mode-view-container">
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
