'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dataset from '@/data/speaking-chunks.json';
import { ChunksDataset, SpeakingChunk, PracticeMode, SRSRating, ChunkProgress, UserStats, TopicMeta } from '@/types';
import { Navbar } from '@/components/Navbar';
import { TopicFilterBar } from '@/components/TopicFilterBar';
import { ShadowingMode } from '@/components/ShadowingMode';
import { ChunkBlanksMode } from '@/components/ChunkBlanksMode';
import { QuickReflexMode } from '@/components/QuickReflexMode';
import { TopicExplorerMode } from '@/components/TopicExplorerMode';
import { AnalyticsModal } from '@/components/AnalyticsModal';
import { ChunkModal } from '@/components/ChunkModal';
import { calculateNextReview, isDue, sortQueue } from '@/lib/srs';
import {
  loadProgressMap,
  saveProgressMap,
  loadUserStats,
  recordChunkReviewed,
  getMergedChunks,
  saveChunk,
  removeChunk,
} from '@/lib/storage';
import { soundManager } from '@/lib/sound';
import confetti from 'canvas-confetti';

const data = dataset as unknown as ChunksDataset;

export default function HomePage() {
  const [currentMode, setCurrentMode] = useState<PracticeMode>('shadowing');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Chunks State (Merged Base + Custom)
  const [allChunks, setAllChunks] = useState<SpeakingChunk[]>(data.chunks);

  // Storage State
  const [progressMap, setProgressMap] = useState<Record<string, ChunkProgress>>({});
  const [userStats, setUserStats] = useState<UserStats>({
    streakDays: 1,
    lastActiveDate: '',
    todayReviewedCount: 0,
    totalPracticedCount: 0,
    dailyGoal: 20,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // CRUD Modal State
  const [isChunkModalOpen, setIsChunkModalOpen] = useState(false);
  const [chunkToEdit, setChunkToEdit] = useState<SpeakingChunk | null>(null);

  // Active Queue State
  const [queueIndex, setQueueIndex] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Load initial storage & merged chunks on mount
  useEffect(() => {
    const merged = getMergedChunks(data.chunks);
    setAllChunks(merged);
    setProgressMap(loadProgressMap());
    setUserStats(loadUserStats());
  }, []);

  // Compute Dynamic Topics (includes Custom topic if custom chunks exist)
  const dynamicTopics = useMemo<TopicMeta[]>(() => {
    const counts: Record<string, number> = {};
    let customCount = 0;

    allChunks.forEach((c) => {
      counts[c.topicId] = (counts[c.topicId] || 0) + 1;
      if (c.isCustom || c.topicId === 'CUSTOM') {
        customCount += 1;
      }
    });

    const list = data.topics.map((t) => ({
      ...t,
      chunkCount: counts[t.topicId] || 0,
    }));

    if (customCount > 0) {
      list.unshift({
        topicId: 'CUSTOM',
        topicName: 'Từ vựng của tôi',
        icon: '⭐',
        chunkCount: customCount,
      });
    }

    return list;
  }, [allChunks]);

  // Filter chunks based on topic, level, search
  const filteredChunks = useMemo(() => {
    return allChunks.filter((chunk) => {
      if (selectedTopicId === 'CUSTOM') {
        if (!chunk.isCustom && chunk.topicId !== 'CUSTOM') return false;
      } else if (selectedTopicId !== 'ALL' && chunk.topicId !== selectedTopicId) {
        return false;
      }

      if (selectedLevel !== 'ALL' && chunk.level !== selectedLevel) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchChunk = chunk.chunk.toLowerCase().includes(q);
        const matchMeaning = chunk.meaning.toLowerCase().includes(q);
        const matchExample = (chunk.exampleSentence || chunk.cleanExample || '').toLowerCase().includes(q);
        const matchTags = chunk.tags ? chunk.tags.some((t) => t.toLowerCase().includes(q)) : false;
        if (!matchChunk && !matchMeaning && !matchExample && !matchTags) return false;
      }
      return true;
    });
  }, [allChunks, selectedTopicId, selectedLevel, searchQuery]);

  // Sort queue by SRS priority
  const practiceQueue = useMemo(() => {
    const sorted = sortQueue(filteredChunks, progressMap);
    if (shuffleSeed > 0) {
      return [...sorted].sort(() => Math.random() - 0.5);
    }
    return sorted;
  }, [filteredChunks, progressMap, shuffleSeed]);

  // Current active chunk
  const currentChunk = practiceQueue[queueIndex] || practiceQueue[0];

  // Count chunks that were previously reviewed and are due for SRS review today
  const reviewDueCount = useMemo(() => {
    return allChunks.filter((c) => {
      const prog = progressMap[c.id];
      if (!prog || prog.repetitions === 0) return false;
      return new Date(prog.dueDate).getTime() <= Date.now();
    }).length;
  }, [allChunks, progressMap]);

  // Count unstudied chunks in library
  const unstudiedCount = useMemo(() => {
    return allChunks.filter((c) => !progressMap[c.id]).length;
  }, [allChunks, progressMap]);

  // Handle SRS Rating
  const handleRateChunk = useCallback(
    (rating: SRSRating, accuracy: number) => {
      if (!currentChunk) return;

      const currentProg = progressMap[currentChunk.id];
      const updatedProg = calculateNextReview(currentProg, rating, currentChunk.id);

      updatedProg.accuracyHistory = [...(currentProg?.accuracyHistory || []), accuracy];
      updatedProg.bestAccuracy = Math.max(currentProg?.bestAccuracy || 0, accuracy);

      const nextMap = { ...progressMap, [currentChunk.id]: updatedProg };
      setProgressMap(nextMap);
      saveProgressMap(nextMap);

      const updatedStats = recordChunkReviewed(currentChunk.id, accuracy);
      setUserStats(updatedStats);

      if (rating >= 3) {
        soundManager.playSuccess();
      } else {
        soundManager.playClick();
      }

      if (updatedStats.todayReviewedCount === updatedStats.dailyGoal) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      if (queueIndex + 1 < practiceQueue.length) {
        setQueueIndex((prev) => prev + 1);
      } else {
        setQueueIndex(0);
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    },
    [currentChunk, progressMap, queueIndex, practiceQueue.length]
  );

  const handleNext = () => {
    soundManager.playClick();
    if (queueIndex + 1 < practiceQueue.length) {
      setQueueIndex((prev) => prev + 1);
    } else {
      setQueueIndex(0);
    }
  };

  const handleShuffle = () => {
    soundManager.playClick();
    setShuffleSeed((prev) => prev + 1);
    setQueueIndex(0);
  };

  const handleStartPracticeTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setCurrentMode('shadowing');
    setQueueIndex(0);
    soundManager.playSuccess();
  };

  // CRUD Handlers
  const handleOpenAddChunk = () => {
    soundManager.playClick();
    setChunkToEdit(null);
    setIsChunkModalOpen(true);
  };

  const handleOpenEditChunk = (chunk: SpeakingChunk) => {
    soundManager.playClick();
    setChunkToEdit(chunk);
    setIsChunkModalOpen(true);
  };

  const handleSaveChunk = (chunk: SpeakingChunk) => {
    saveChunk(chunk);
    const merged = getMergedChunks(data.chunks);
    setAllChunks(merged);
    setIsChunkModalOpen(false);
  };

  const handleDeleteChunk = (chunkId: string) => {
    removeChunk(chunkId);
    const merged = getMergedChunks(data.chunks);
    setAllChunks(merged);
    if (queueIndex >= merged.length && merged.length > 0) {
      setQueueIndex(0);
    }
    setIsChunkModalOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <Navbar
        currentMode={currentMode}
        onSelectMode={(m) => {
          soundManager.playClick();
          setCurrentMode(m);
        }}
        stats={userStats}
        dueCount={reviewDueCount}
        unstudiedCount={unstudiedCount}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenAnalytics={() => {
          soundManager.playClick();
          setIsAnalyticsOpen(true);
        }}
        onOpenAddChunk={handleOpenAddChunk}
      />

      {/* Main Container */}
      <main className="main-content">
        {/* Filter Controls (shown in practice modes) */}
        {currentMode !== 'browse' && (
          <TopicFilterBar
            topics={dynamicTopics}
            selectedTopicId={selectedTopicId}
            onSelectTopic={(tId) => {
              setSelectedTopicId(tId);
              setQueueIndex(0);
            }}
            selectedLevel={selectedLevel}
            onSelectLevel={(lvl) => {
              setSelectedLevel(lvl);
              setQueueIndex(0);
            }}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setQueueIndex(0);
            }}
            onShuffle={handleShuffle}
            totalFiltered={filteredChunks.length}
            onOpenAddChunk={handleOpenAddChunk}
          />
        )}

        {/* Practice Modes Rendering */}
        <div className="mode-view-container">
          {practiceQueue.length === 0 ? (
            <div className="empty-state-card">
              <span className="empty-icon">🔍</span>
              <h3>Không tìm thấy speaking chunk nào phù hợp</h3>
              <p>Hãy thử xóa từ khóa tìm kiếm hoặc tạo một chunk mới cho chủ đề này.</p>
              <div className="empty-actions-row">
                <button
                  className="action-btn"
                  onClick={() => {
                    setSelectedTopicId('ALL');
                    setSelectedLevel('ALL');
                    setSearchQuery('');
                  }}
                >
                  Đặt lại bộ lọc
                </button>
                <button className="btn-primary" onClick={handleOpenAddChunk}>
                  + Thêm Chunk Mới Ngay
                </button>
              </div>
            </div>
          ) : (
            <>
              {currentMode === 'shadowing' && (
                <ShadowingMode
                  chunk={currentChunk}
                  progress={progressMap[currentChunk.id]}
                  onRate={handleRateChunk}
                  onNext={handleNext}
                  currentIndex={queueIndex}
                  totalInQueue={practiceQueue.length}
                  onEditChunk={handleOpenEditChunk}
                />
              )}

              {currentMode === 'blanks' && (
                <ChunkBlanksMode
                  chunk={currentChunk}
                  onRate={handleRateChunk}
                  currentIndex={queueIndex}
                  totalInQueue={practiceQueue.length}
                  onEditChunk={handleOpenEditChunk}
                />
              )}

              {currentMode === 'reflex' && (
                <QuickReflexMode
                  chunk={currentChunk}
                  onRate={handleRateChunk}
                  currentIndex={queueIndex}
                  totalInQueue={practiceQueue.length}
                  onEditChunk={handleOpenEditChunk}
                />
              )}

              {currentMode === 'browse' && (
                <TopicExplorerMode
                  topics={dynamicTopics}
                  chunks={allChunks}
                  onStartPracticeTopic={handleStartPracticeTopic}
                  onOpenAddChunk={handleOpenAddChunk}
                  onEditChunk={handleOpenEditChunk}
                  onDeleteChunk={handleDeleteChunk}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Analytics & Sync Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        stats={userStats}
        progressMap={progressMap}
        totalChunks={allChunks.length}
        onReload={() => {
          const merged = getMergedChunks(data.chunks);
          setAllChunks(merged);
          setProgressMap(loadProgressMap());
          setUserStats(loadUserStats());
        }}
      />

      {/* Add / Edit Chunk Modal */}
      <ChunkModal
        isOpen={isChunkModalOpen}
        onClose={() => setIsChunkModalOpen(false)}
        onSave={handleSaveChunk}
        onDelete={handleDeleteChunk}
        chunkToEdit={chunkToEdit}
        existingTopics={dynamicTopics}
      />
    </div>
  );
}
