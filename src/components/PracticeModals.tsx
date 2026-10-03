'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  useModalStore,
  useProgressStore,
  useProgressStoreApi,
  useChunkStore,
  useChunkStoreApi
} from '@/stores';
import { useAuth } from '@/context/AuthContext';
import { saveChunkWithSync, deleteChunkWithSync } from '@/lib/client/chunkActions';
import dataset from '@/data/speaking-chunks.json';
import { ChunksDataset } from '@/types';

const data = dataset as unknown as ChunksDataset;

const AnalyticsModal = dynamic(
  () => import('@/components/AnalyticsModal').then((mod) => mod.AnalyticsModal),
  { ssr: false }
);

const ChunkModal = dynamic(
  () => import('@/components/ChunkModal').then((mod) => mod.ChunkModal),
  { ssr: false }
);

const AuthPromptModal = dynamic(
  () => import('@/components/AuthPromptModal').then((mod) => mod.AuthPromptModal),
  { ssr: false }
);

export function PracticeModals() {
  const { user } = useAuth();
  const chunkStoreApi = useChunkStoreApi();
  const progressStoreApi = useProgressStoreApi();

  // Modal Store
  const isAnalyticsOpen = useModalStore((s) => s.isAnalyticsOpen);
  const closeAnalytics = useModalStore((s) => s.closeAnalytics);
  const isChunkModalOpen = useModalStore((s) => s.isChunkModalOpen);
  const closeChunkModal = useModalStore((s) => s.closeChunkModal);
  const isAuthPromptOpen = useModalStore((s) => s.isAuthPromptOpen);
  const closeAuthPrompt = useModalStore((s) => s.closeAuthPrompt);
  const openAddChunkAfterAuth = useModalStore((s) => s.openAddChunkAfterAuth);
  const chunkToEdit = useModalStore((s) => s.chunkToEdit);

  // Progress & Chunks Stores
  const userStats = useProgressStore((s) => s.userStats);
  const progressMap = useProgressStore((s) => s.progressMap);
  const allChunks = useChunkStore((s) => s.allChunks);

  return (
    <>
      {/* Analytics Modal */}
      {isAnalyticsOpen && (
        <AnalyticsModal
          onClose={closeAnalytics}
          stats={userStats}
          progressMap={progressMap}
          totalChunks={allChunks.length}
        />
      )}

      {/* Add / Edit Chunk Modal */}
      {isChunkModalOpen && (
        <ChunkModal
          onClose={closeChunkModal}
          onSave={(chunk) => saveChunkWithSync(chunk, user, chunkStoreApi, progressStoreApi)}
          onDelete={(chunkId) => deleteChunkWithSync(chunkId, user, chunkStoreApi, progressStoreApi)}
          chunkToEdit={chunkToEdit}
          existingTopics={data.topics.filter((t) => t.topicId !== 'STUDIED' && t.topicId !== 'ALL')}
        />
      )}


      {/* Auth Prompt Modal */}
      {isAuthPromptOpen && (
        <AuthPromptModal
          onClose={closeAuthPrompt}
          onSuccess={openAddChunkAfterAuth}
        />
      )}
    </>
  );
}
