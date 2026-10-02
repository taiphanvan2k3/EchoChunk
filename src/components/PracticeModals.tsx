'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePractice } from '@/context/PracticeContext';

const AnalyticsModal = dynamic(
  () => import('@/components/AnalyticsModal').then((mod) => mod.AnalyticsModal),
  { ssr: false }
);

const ChunkModal = dynamic(
  () => import('@/components/ChunkModal').then((mod) => mod.ChunkModal),
  { ssr: false }
);

export function PracticeModals() {
  const {
    isAnalyticsOpen,
    closeAnalytics,
    userStats,
    progressMap,
    allChunks,
    reloadStore,
    isChunkModalOpen,
    closeChunkModal,
    handleSaveChunk,
    handleDeleteChunk,
    chunkToEdit,
    dynamicTopics,
  } = usePractice();

  return (
    <>
      {/* Analytics & Data Management Modal - Nạp lười khi người dùng bấm mở */}
      {isAnalyticsOpen && (
        <AnalyticsModal
          onClose={closeAnalytics}
          stats={userStats}
          progressMap={progressMap}
          totalChunks={allChunks.length}
          onReload={reloadStore}
        />
      )}

      {/* Add / Edit Chunk Modal - Nạp lười khi người dùng bấm mở */}
      {isChunkModalOpen && (
        <ChunkModal
          onClose={closeChunkModal}
          onSave={handleSaveChunk}
          onDelete={handleDeleteChunk}
          chunkToEdit={chunkToEdit}
          existingTopics={dynamicTopics.filter((t) => t.topicId !== 'STUDIED' && t.topicId !== 'ALL')}
        />
      )}
    </>
  );
}
