'use client';

import React from 'react';
import { usePractice } from '@/context/PracticeContext';
import { AnalyticsModal } from '@/components/AnalyticsModal';
import { ChunkModal } from '@/components/ChunkModal';

export const PracticeModals: React.FC = () => {
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
      {/* Analytics & Data Management Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={closeAnalytics}
        stats={userStats}
        progressMap={progressMap}
        totalChunks={allChunks.length}
        onReload={reloadStore}
      />

      {/* Add / Edit Chunk Modal */}
      <ChunkModal
        isOpen={isChunkModalOpen}
        onClose={closeChunkModal}
        onSave={handleSaveChunk}
        onDelete={handleDeleteChunk}
        chunkToEdit={chunkToEdit}
        existingTopics={dynamicTopics.filter((t) => t.topicId !== 'STUDIED' && t.topicId !== 'ALL')}
      />
    </>
  );
};
