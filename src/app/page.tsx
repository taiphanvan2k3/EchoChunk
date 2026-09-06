'use client';

import React, { useState, useMemo, useCallback, useSyncExternalStore } from 'react';
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
import { calculateNextReview, sortQueue, shuffleWithSeed } from '@/lib/srs';
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
import { SearchX, RotateCcw, Plus } from 'lucide-react';

const data = dataset as unknown as ChunksDataset;

// Client hydration subscriber using official React useSyncExternalStore to eliminate hydration mismatch & cascading setState
const emptySubscribe = () => () => {};

export default function HomePage() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [currentMode, setCurrentMode] = useState<PracticeMode>('shadowing');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Version counter to trigger re-computation when user modifies/reviews chunks
  const [storeVersion, setStoreVersion] = useState(0);

  // Stable timestamp initialized once during mount (satisfies React purity rules)
  const [todayTimestamp] = useState(() => Date.now());

  // Storage State derived synchronously upon client hydration
  const allChunks = useMemo<SpeakingChunk[]>(() => {
    void storeVersion;
    if (!isClient) return data.chunks;
    return getMergedChunks(data.chunks);
  }, [isClient, storeVersion]);

  const progressMap = useMemo<Record<string, ChunkProgress>>(() => {
    void storeVersion;
    if (!isClient) return {};
    return loadProgressMap();
  }, [isClient, storeVersion]);

  const userStats = useMemo<UserStats>(() => {
    void storeVersion;
    if (!isClient) {
      return {
        streakDays: 1,
        lastActiveDate: '',
        todayReviewedCount: 0,
        totalPracticedCount: 0,
        dailyGoal: 20,
      };
    }
    return loadUserStats();
  }, [isClient, storeVersion]);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // CRUD Modal State
  const [isChunkModalOpen, setIsChunkModalOpen] = useState(false);
  const [chunkToEdit, setChunkToEdit] = useState<SpeakingChunk | null>(null);

  // Active Queue State
  const [queueIndex, setQueueIndex] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Compute Dynamic Topics (includes Custom topic if custom chunks exist)
  const dynamicTopics = useMemo<TopicMeta[]>(() => {
    const counts: Record<string, number> = {};
    let customCount = 0;
    let studiedCount = 0;

    allChunks.forEach((c) => {
      counts[c.topicId] = (counts[c.topicId] || 0) + 1;
      if (c.isCustom || c.topicId === 'CUSTOM') {
        customCount += 1;
      }
      if (progressMap[c.id] && progressMap[c.id].repetitions > 0) {
        studiedCount += 1;
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

    if (studiedCount > 0) {
      list.unshift({
        topicId: 'STUDIED',
        topicName: 'Đã luyện tập',
        icon: '🧠',
        chunkCount: studiedCount,
      });
    }

    return list;
  }, [allChunks, progressMap]);

  // Filter chunks based on topic, level, search
  const filteredChunks = useMemo(() => {
    return allChunks.filter((chunk) => {
      if (selectedTopicId === 'STUDIED') {
        const prog = progressMap[chunk.id];
        if (!prog || prog.repetitions === 0) return false;
      } else if (selectedTopicId === 'CUSTOM') {
        if (!chunk.isCustom && chunk.topicId !== 'CUSTOM') return false;
      } else if (selectedTopicId !== 'ALL' && chunk.topicId !== selectedTopicId) {
        return false;
      }

      if (selectedLevel !== 'ALL') {
        const lvl = chunk.level || '';
        if (!lvl.includes(selectedLevel)) return false;
      }

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
  }, [allChunks, selectedTopicId, selectedLevel, searchQuery, progressMap]);

  // Sort queue by SRS priority or Fisher-Yates shuffle
  const practiceQueue = useMemo(() => {
    const sorted = sortQueue(filteredChunks, progressMap);
    if (shuffleSeed > 0) {
      return shuffleWithSeed(sorted, shuffleSeed);
    }
    return sorted;
  }, [filteredChunks, progressMap, shuffleSeed]);

  const currentChunk = practiceQueue[queueIndex] || practiceQueue[0];

  // Count past reviewed chunks that are overdue for review today
  const reviewDueCount = useMemo(() => {
    return allChunks.filter((c) => {
      const prog = progressMap[c.id];
      if (!prog || prog.repetitions === 0) return false;
      return new Date(prog.dueDate).getTime() <= todayTimestamp;
    }).length;
  }, [allChunks, progressMap, todayTimestamp]);

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
      saveProgressMap(nextMap);

      const updatedStats = recordChunkReviewed(currentChunk.id, accuracy);
      setStoreVersion((v) => v + 1);

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
    setSelectedLevel('ALL');
    setSearchQuery('');
    setShuffleSeed(0);
    setCurrentMode('shadowing');
    setQueueIndex(0);
    soundManager.playSuccess();
  };

  const handlePracticeChunk = (chunk: SpeakingChunk, topicIdOverride?: string) => {
    const targetTopicId = topicIdOverride || chunk.topicId;
    setSelectedTopicId(targetTopicId);
    setSelectedLevel('ALL');
    setSearchQuery('');
    setShuffleSeed(0);
    setCurrentMode('shadowing');

    // Compute target candidate list to locate correct index immediately
    const candidateList = allChunks.filter((c) => {
      if (targetTopicId === 'STUDIED') {
        return progressMap[c.id] && progressMap[c.id].repetitions > 0;
      }
      if (targetTopicId === 'CUSTOM') {
        return c.isCustom || c.topicId === 'CUSTOM';
      }
      if (targetTopicId !== 'ALL') {
        return c.topicId === targetTopicId;
      }
      return true;
    });

    const sortedCandidates = sortQueue(candidateList, progressMap);
    const idx = sortedCandidates.findIndex((c) => c.id === chunk.id);
    if (idx >= 0) {
      setQueueIndex(idx);
    } else {
      setQueueIndex(0);
    }
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
    setStoreVersion((v) => v + 1);
    setIsChunkModalOpen(false);
  };

  const handleDeleteChunk = (chunkId: string) => {
    removeChunk(chunkId);
    setStoreVersion((v) => v + 1);
    if (queueIndex > 0) {
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
        {!isClient ? (
          /* Smooth Notion Skeleton View during initial server/client hydration phase */
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
        ) : (
          <>
            {/* Filter Controls (shown in practice modes) */}
            {currentMode !== 'browse' && (
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
                onOpenAddChunk={handleOpenAddChunk}
              />
            )}

            {/* Practice Modes Rendering */}
            <div className="mode-view-container">
              {practiceQueue.length === 0 ? (
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
                      onClick={() => {
                        setSelectedTopicId('ALL');
                        setSelectedLevel('ALL');
                        setSearchQuery('');
                      }}
                    >
                      <RotateCcw size={15} />
                      <span>Đặt lại bộ lọc</span>
                    </button>
                    <button
                      type="button"
                      className="notion-btn-primary"
                      onClick={handleOpenAddChunk}
                    >
                      <Plus size={15} />
                      <span>Tạo Chunk Mới Ngay</span>
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
                      onShuffle={handleShuffle}
                      currentIndex={queueIndex}
                      totalInQueue={practiceQueue.length}
                      onEditChunk={handleOpenEditChunk}
                    />
                  )}

                  {currentMode === 'blanks' && (
                    <ChunkBlanksMode
                      chunk={currentChunk}
                      onRate={handleRateChunk}
                      onShuffle={handleShuffle}
                      currentIndex={queueIndex}
                      totalInQueue={practiceQueue.length}
                      onEditChunk={handleOpenEditChunk}
                    />
                  )}

                  {currentMode === 'reflex' && (
                    <QuickReflexMode
                      chunk={currentChunk}
                      onRate={handleRateChunk}
                      onShuffle={handleShuffle}
                      currentIndex={queueIndex}
                      totalInQueue={practiceQueue.length}
                      onEditChunk={handleOpenEditChunk}
                    />
                  )}

                  {currentMode === 'browse' && (
                    <TopicExplorerMode
                      topics={dynamicTopics}
                      chunks={allChunks}
                      progressMap={progressMap}
                      onStartPracticeTopic={handleStartPracticeTopic}
                      onPracticeChunk={handlePracticeChunk}
                      onOpenAddChunk={handleOpenAddChunk}
                      onEditChunk={handleOpenEditChunk}
                      onDeleteChunk={handleDeleteChunk}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Analytics & Sync Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        stats={userStats}
        progressMap={progressMap}
        totalChunks={allChunks.length}
        onReload={() => {
          setStoreVersion((v) => v + 1);
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
