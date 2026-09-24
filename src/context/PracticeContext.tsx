'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { useIsClient } from '@/hooks/useIsClient';
import dataset from '@/data/speaking-chunks.json';
import {
  ChunksDataset,
  SpeakingChunk,
  SRSRating,
  ChunkProgress,
  UserStats,
  TopicMeta,
} from '@/types';
import { calculateNextReview, sortQueue, shuffleWithSeed } from '@/lib/shared/srs';
import {
  loadProgressMap,
  saveProgressMap,
  loadUserStats,
  saveUserStats,
  loadCustomChunks,
  saveCustomChunks,
  recordChunkReviewed,
  getMergedChunks,
  saveChunk,
  removeChunk,
  clearGuestStorage,
} from '@/lib/client/storage';
import { useAuth } from '@/context/AuthContext';
import {
  syncChunkProgress,
  syncUserStats,
  syncCustomChunk,
  deleteCustomChunk,
  batchMergeLocalToCloud,
  fetchUserProgressMap,
  fetchUserStats,
  fetchCustomChunks,
} from '@/lib/client/firebase/firestore';
import { soundManager } from '@/lib/client/sound';
import confetti from 'canvas-confetti';

const data = dataset as unknown as ChunksDataset;

interface PracticeContextType {
  isClient: boolean;
  allChunks: SpeakingChunk[];
  progressMap: Record<string, ChunkProgress>;
  userStats: UserStats;
  todayTimestamp: number;
  soundEnabled: boolean;
  toggleSound: () => void;
  // Filters
  selectedTopicId: string;
  setSelectedTopicId: (topicId: string) => void;
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  // Queue & Practice
  practiceQueue: SpeakingChunk[];
  currentChunk: SpeakingChunk | undefined;
  queueIndex: number;
  setQueueIndex: React.Dispatch<React.SetStateAction<number>>;
  shuffleSeed: number;
  setShuffleSeed: React.Dispatch<React.SetStateAction<number>>;

  dynamicTopics: TopicMeta[];
  reviewDueCount: number;
  unstudiedCount: number;
  handleRateChunk: (rating: SRSRating, accuracy: number) => void;
  handleNext: () => void;
  handleShuffle: () => void;
  handleStartPracticeTopic: (topicId: string) => void;
  handlePracticeChunk: (chunk: SpeakingChunk, topicIdOverride?: string) => void;
  // Modals
  isAnalyticsOpen: boolean;
  openAnalytics: () => void;
  closeAnalytics: () => void;
  isChunkModalOpen: boolean;
  openAddChunk: () => void;
  openEditChunk: (chunk: SpeakingChunk) => void;
  closeChunkModal: () => void;
  chunkToEdit: SpeakingChunk | null;
  handleSaveChunk: (chunk: SpeakingChunk) => void;
  handleDeleteChunk: (chunkId: string) => void;
  reloadStore: () => void;
}

const PracticeContext = createContext<PracticeContextType | undefined>(undefined);

import { InitialPracticeData } from '@/lib/server/practiceData';

export const PracticeProvider: React.FC<{
  initialData?: InitialPracticeData;
  children: React.ReactNode;
}> = ({ initialData, children }) => {
  const router = useRouter();
  const { user } = useAuth();
  const isClient = useIsClient();

  const [selectedTopicId, setSelectedTopicId] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [storeVersion, setStoreVersion] = useState(0);
  const [todayTimestamp] = useState(() => Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Queue state
  const [queueIndex, setQueueIndex] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Modals state
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isChunkModalOpen, setIsChunkModalOpen] = useState(false);
  const [chunkToEdit, setChunkToEdit] = useState<SpeakingChunk | null>(null);

  // Data loaded from storage or SSR initialData (partitioned by current user's UID)
  const allChunks = useMemo<SpeakingChunk[]>(() => {
    void storeVersion;
    if (!isClient) return initialData?.allChunks ?? data.chunks;
    return getMergedChunks(data.chunks, user?.uid);
  }, [isClient, storeVersion, user?.uid, initialData]);

  const progressMap = useMemo<Record<string, ChunkProgress>>(() => {
    void storeVersion;
    if (!isClient) return initialData?.progressMap ?? {};
    const local = loadProgressMap(user?.uid);
    if (Object.keys(local).length > 0) return local;
    return initialData?.progressMap ?? {};
  }, [isClient, storeVersion, user?.uid, initialData]);

  const userStats = useMemo<UserStats>(() => {
    void storeVersion;
    if (!isClient) {
      return (
        initialData?.userStats ?? {
          streakDays: 1,
          lastActiveDate: '',
          todayReviewedCount: 0,
          totalPracticedCount: 0,
          dailyGoal: 20,
        }
      );
    }
 
    const local = loadUserStats(user?.uid);
    if (local.totalPracticedCount > 0) return local;
    return initialData?.userStats ?? local;
  }, [isClient, storeVersion, user?.uid, initialData]);

  // Cloud Sync: Handle user login, logout, and guest data merge
  useEffect(() => {
    if (!isClient) return;

    let isMounted = true;

    async function syncUserData() {
      if (!user) {
        // User logged out: trigger re-render so UI switches to Guest partition
        setStoreVersion((v) => v + 1);
        return;
      }

      // Check if there is actual GUEST data created on this device before logging in
      const guestCustom = loadCustomChunks(null);
      const guestProgress = loadProgressMap(null);
      const guestStats = loadUserStats(null);
      const hasGuestData =
        guestCustom.length > 0 ||
        Object.values(guestProgress).some((p: ChunkProgress) => p.repetitions > 0) ||
        guestStats.totalPracticedCount > 0;

      if (hasGuestData) {
        // First-time guest sign-in: merge guest data into this account's cloud
        const { mergedProgress, mergedStats, mergedCustomChunks } = await batchMergeLocalToCloud(
          user.uid,
          guestProgress,
          guestStats,
          guestCustom
        );

        // Wipe guest storage clean so subsequent logouts/logins won't duplicate or leak guest data
        clearGuestStorage();

        if (isMounted) {
          saveProgressMap(mergedProgress, user.uid);
          saveUserStats(mergedStats, user.uid);
          saveCustomChunks(mergedCustomChunks, user.uid);
          setStoreVersion((v) => v + 1);
        }
      } else {
        // Normal login / account switch: fetch this user's OWN cloud data
        // Kiểm tra LocalStorage: Nếu thiết bị đã có sẵn danh sách customChunks, dùng luôn và KHÔNG gọi Cloud (0 Read)
        const existingLocalCustom = loadCustomChunks(user.uid);
        const shouldFetchCustomFromCloud = existingLocalCustom.length === 0;

        const [cloudProgress, cloudStats, cloudCustom] = await Promise.all([
          fetchUserProgressMap(user.uid),
          fetchUserStats(user.uid),
          shouldFetchCustomFromCloud ? fetchCustomChunks(user.uid) : Promise.resolve(null),
        ]);

        if (isMounted) {
          saveProgressMap(cloudProgress, user.uid);
          if (cloudStats) saveUserStats(cloudStats, user.uid);
          if (cloudCustom !== null) {
            saveCustomChunks(cloudCustom, user.uid);
          }
          setStoreVersion((v) => v + 1);
        }
      }
    }

    syncUserData();

    return () => {
      isMounted = false;
    };
  }, [isClient, user?.uid]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedTopicId('ALL');
    setSelectedLevel('ALL');
    setSearchQuery('');
    setShuffleSeed(0);
    setQueueIndex(0);
  }, []);

  // Compute Dynamic Topics
  const dynamicTopics = useMemo<TopicMeta[]>(() => {
    // Khi đang SSR hoặc trước khi client hydrate xong, dùng trực tiếp dynamicTopics từ server để tránh nhảy layout
    if (!isClient && initialData?.dynamicTopics && initialData.dynamicTopics.length > 0) {
      return initialData.dynamicTopics;
    }

    const counts: Record<string, number> = {};
    let customCount = 0;

    allChunks.forEach((c) => {
      counts[c.topicId] = (counts[c.topicId] || 0) + 1;
      if (c.isCustom || c.topicId === 'CUSTOM') {
        customCount += 1;
      }
    });

    if (customCount === 0) {
      customCount = userStats.customChunksCount ?? initialData?.userStats?.customChunksCount ?? 0;
    }

    const studiedCount = Object.values(progressMap).filter(
      (p) => p && p.repetitions > 0
    ).length;

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
  }, [isClient, initialData, allChunks, progressMap, userStats.customChunksCount]);

  // Filter chunks
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

  const practiceQueue = useMemo(() => {
    const sorted = sortQueue(filteredChunks, progressMap);
    if (shuffleSeed > 0) {
      return shuffleWithSeed(sorted, shuffleSeed);
    }
    return sorted;
  }, [filteredChunks, progressMap, shuffleSeed]);

  const currentChunk = practiceQueue[queueIndex] || practiceQueue[0];

  // Chunk Anchoring: Ghi nhớ ID của chunk người dùng đang xem để tránh bị nhảy từ khi queue re-sort ngầm
  const activeChunkIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentChunk) {
      activeChunkIdRef.current = currentChunk.id;
    }
  }, [currentChunk]);

  // Nếu queue thay đổi thứ tự do background sync, tìm lại vị trí của từ hiện tại để không giật đổi từ vựng
  useEffect(() => {
    if (activeChunkIdRef.current && practiceQueue.length > 0) {
      const existingIdx = practiceQueue.findIndex((c: SpeakingChunk) => c.id === activeChunkIdRef.current);
      if (existingIdx !== -1 && existingIdx !== queueIndex) {
        setQueueIndex(existingIdx);
      }
    }
  }, [practiceQueue, queueIndex]);

  const reviewDueCount = useMemo(() => {
    if (!isClient && initialData?.reviewDueCount !== undefined) {
      return initialData.reviewDueCount;
    }

    return Object.values(progressMap).filter((prog) => {
      if (!prog || prog.repetitions === 0) return false;
      return new Date(prog.dueDate).getTime() <= todayTimestamp;
    }).length;
  }, [isClient, initialData, progressMap, todayTimestamp]);

  const unstudiedCount = useMemo(() => {
    if (!isClient && initialData?.unstudiedCount !== undefined) {
      return initialData.unstudiedCount;
    }

    return allChunks.filter((c) => !progressMap[c.id]).length;
  }, [isClient, initialData, allChunks, progressMap]);

  // Handle SRS Rating
  const handleRateChunk = useCallback(
    (rating: SRSRating, accuracy: number) => {
      if (!currentChunk) return;

      const currentProg = progressMap[currentChunk.id];
      const updatedProg = calculateNextReview(currentProg, rating, currentChunk.id);

      updatedProg.accuracyHistory = [...(currentProg?.accuracyHistory || []), accuracy];
      updatedProg.bestAccuracy = Math.max(currentProg?.bestAccuracy || 0, accuracy);

      const nextMap = { ...progressMap, [currentChunk.id]: updatedProg };
      saveProgressMap(nextMap, user?.uid);

      const updatedStats = recordChunkReviewed(currentChunk.id, accuracy, user?.uid);
      setStoreVersion((v) => v + 1);

      if (user) {
        syncChunkProgress(user.uid, currentChunk.id, updatedProg);
        syncUserStats(user.uid, updatedStats);
      }

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
    [currentChunk, progressMap, queueIndex, practiceQueue.length, user]
  );

  const handleNext = useCallback(() => {
    soundManager.playClick();
    if (queueIndex + 1 < practiceQueue.length) {
      setQueueIndex((prev) => prev + 1);
    } else {
      setQueueIndex(0);
    }
  }, [queueIndex, practiceQueue.length]);

  const handleShuffle = useCallback(() => {
    soundManager.playClick();
    setShuffleSeed((prev) => prev + 1);
    setQueueIndex(0);
  }, []);

  const handleStartPracticeTopic = useCallback(
    (topicId: string) => {
      setSelectedTopicId(topicId);
      setSelectedLevel('ALL');
      setSearchQuery('');
      setShuffleSeed(0);
      setQueueIndex(0);
      soundManager.playSuccess();
      router.push('/shadowing');
    },
    [router]
  );

  const handlePracticeChunk = useCallback(
    (chunk: SpeakingChunk, topicIdOverride?: string) => {
      const targetTopicId = topicIdOverride || chunk.topicId;
      setSelectedTopicId(targetTopicId);
      setSelectedLevel('ALL');
      setSearchQuery('');
      setShuffleSeed(0);

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
      const idx = sortedCandidates.findIndex((c: SpeakingChunk) => c.id === chunk.id);
      if (idx >= 0) {
        setQueueIndex(idx);
      } else {
        setQueueIndex(0);
      }
      soundManager.playSuccess();
      router.push('/shadowing');
    },
    [allChunks, progressMap, router]
  );

  const openAnalytics = useCallback(() => {
    soundManager.playClick();
    setIsAnalyticsOpen(true);
  }, []);

  const closeAnalytics = useCallback(() => {
    setIsAnalyticsOpen(false);
  }, []);

  const openAddChunk = useCallback(() => {
    soundManager.playClick();
    setChunkToEdit(null);
    setIsChunkModalOpen(true);
  }, []);

  const openEditChunk = useCallback((chunk: SpeakingChunk) => {
    soundManager.playClick();
    setChunkToEdit(chunk);
    setIsChunkModalOpen(true);
  }, []);

  const closeChunkModal = useCallback(() => {
    setIsChunkModalOpen(false);
  }, []);

  const handleSaveChunk = useCallback(
    (chunk: SpeakingChunk) => {
      const chunkWithUser: SpeakingChunk = {
        ...chunk,
        userId: user ? user.uid : 'guest',
      };

      const existingChunks = loadCustomChunks(user?.uid);
      const isNew = !existingChunks.some((c) => c.id === chunk.id);

      saveChunk(chunkWithUser, user?.uid);
      setStoreVersion((v) => v + 1);
      if (user) {
        syncCustomChunk(user.uid, chunkWithUser);

        if (isNew) {
          const updatedStats = {
            ...userStats,
            customChunksCount: (userStats.customChunksCount ?? existingChunks.length) + 1,
          };

          saveUserStats(updatedStats, user.uid);
          syncUserStats(user.uid, updatedStats);
        }
      }
      setIsChunkModalOpen(false);
    },
    [user, userStats]
  );

  const handleDeleteChunk = useCallback(
    (chunkId: string) => {
      const existingChunks = loadCustomChunks(user?.uid);

      removeChunk(chunkId, user?.uid);
      setStoreVersion((v) => v + 1);
      if (queueIndex > 0) {
        setQueueIndex(0);
      }
      if (user) {
        deleteCustomChunk(user.uid, chunkId);

        const updatedStats = {
          ...userStats,
          customChunksCount: Math.max(0, (userStats.customChunksCount ?? existingChunks.length) - 1),
        };

        saveUserStats(updatedStats, user.uid);
        syncUserStats(user.uid, updatedStats);
      }
      setIsChunkModalOpen(false);
    },
    [queueIndex, user, userStats]
  );

  const reloadStore = useCallback(() => {
    setStoreVersion((v) => v + 1);
  }, []);

  const value = useMemo<PracticeContextType>(
    () => ({
      isClient,
      allChunks,
      progressMap,
      userStats,
      todayTimestamp,
      soundEnabled,
      toggleSound,
      selectedTopicId,
      setSelectedTopicId,
      selectedLevel,
      setSelectedLevel,
      searchQuery,
      setSearchQuery,
      resetFilters,
      practiceQueue,
      currentChunk,
      queueIndex,
      setQueueIndex,
      shuffleSeed,
      setShuffleSeed,
      dynamicTopics,
      reviewDueCount,
      unstudiedCount,
      handleRateChunk,
      handleNext,
      handleShuffle,
      handleStartPracticeTopic,
      handlePracticeChunk,
      isAnalyticsOpen,
      openAnalytics,
      closeAnalytics,
      isChunkModalOpen,
      openAddChunk,
      openEditChunk,
      closeChunkModal,
      chunkToEdit,
      handleSaveChunk,
      handleDeleteChunk,
      reloadStore,
    }),
    [
      isClient,
      allChunks,
      progressMap,
      userStats,
      todayTimestamp,
      soundEnabled,
      toggleSound,
      selectedTopicId,
      selectedLevel,
      searchQuery,
      resetFilters,
      practiceQueue,
      currentChunk,
      queueIndex,
      shuffleSeed,
      setShuffleSeed,

      dynamicTopics,
      reviewDueCount,
      unstudiedCount,
      handleRateChunk,
      handleNext,
      handleShuffle,
      handleStartPracticeTopic,
      handlePracticeChunk,
      isAnalyticsOpen,
      openAnalytics,
      closeAnalytics,
      isChunkModalOpen,
      openAddChunk,
      openEditChunk,
      closeChunkModal,
      chunkToEdit,
      handleSaveChunk,
      handleDeleteChunk,
      reloadStore,
    ]
  );

  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>;
};

export function usePractice(): PracticeContextType {
  const context = useContext(PracticeContext);
  if (!context) {
    throw new Error('usePractice must be used within a PracticeProvider');
  }
  return context;
}
