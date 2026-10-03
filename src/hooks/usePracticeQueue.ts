"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  useChunkStore,
  useChunkStoreApi,
  useProgressStore,
  useProgressStoreApi,
  useSessionStore,
  useModalStore
} from "@/stores";
import { SpeakingChunk, SRSRating, TopicMeta } from "@/types";
import { sortQueue, shuffleWithSeed } from "@/lib/shared/srs";
import { isUserOwnedChunk } from "@/lib/shared/chunkClassification";
import { syncChunkProgress, syncUserStats } from "@/lib/client/firebase/firestore";
import { saveChunkWithSync, deleteChunkWithSync } from "@/lib/client/chunkActions";
import dataset from "@/data/speaking-chunks.json";
import { ChunksDataset } from "@/types";
import { soundManager } from "@/lib/client/sound";
import confetti from "canvas-confetti";

const data = dataset as unknown as ChunksDataset;

export function usePracticeQueue() {
  const router = useRouter();
  const { user } = useAuth();

  const chunkStoreApi = useChunkStoreApi();
  const progressStoreApi = useProgressStoreApi();

  const allChunks = useChunkStore((s) => s.allChunks);
  const progressMap = useProgressStore((s) => s.progressMap);
  const userStats = useProgressStore((s) => s.userStats);
  const todayTimestamp = useProgressStore((s) => s.todayTimestamp);
  const rateChunkAction = useProgressStore((s) => s.rateChunk);

  const selectedTopicId = useSessionStore((s) => s.selectedTopicId);
  const setSelectedTopicId = useSessionStore((s) => s.setSelectedTopicId);
  const selectedLevel = useSessionStore((s) => s.selectedLevel);
  const setSelectedLevel = useSessionStore((s) => s.setSelectedLevel);
  const searchQuery = useSessionStore((s) => s.searchQuery);
  const setSearchQuery = useSessionStore((s) => s.setSearchQuery);
  const queueIndex = useSessionStore((s) => s.queueIndex);
  const setQueueIndex = useSessionStore((s) => s.setQueueIndex);
  const shuffleSeed = useSessionStore((s) => s.shuffleSeed);
  const setShuffleSeed = useSessionStore((s) => s.setShuffleSeed);
  const resetFilters = useSessionStore((s) => s.resetFilters);

  const openAddChunk = useCallback(() => {
    useModalStore.getState().openAddChunk(user);
  }, [user]);

  const openEditChunk = useCallback(
    (chunk: SpeakingChunk) => {
      useModalStore.getState().openEditChunk(chunk, user);
    },
    [user]
  );

  const dynamicTopics = useMemo<TopicMeta[]>(() => {
    const counts: Record<string, number> = {};
    let customCount = 0;

    allChunks.forEach((c) => {
      if (c.topicId && c.topicId !== "CUSTOM" && c.topicId !== "STUDIED") {
        counts[c.topicId] = (counts[c.topicId] || 0) + 1;
      }
      if (isUserOwnedChunk(c)) {
        customCount += 1;
      }
    });

    if (customCount === 0) {
      customCount = userStats.customChunksCount ?? 0;
    }

    const studiedCount = Object.values(progressMap).filter((p) => p && p.repetitions > 0).length;

    const list = data.topics.map((t) => ({
      ...t,
      chunkCount: counts[t.topicId] || 0
    }));

    if (customCount > 0) {
      list.unshift({
        topicId: "CUSTOM",
        topicName: "Từ vựng của tôi",
        icon: "⭐",
        chunkCount: customCount
      });
    }

    if (studiedCount > 0) {
      list.unshift({
        topicId: "STUDIED",
        topicName: "Đã luyện tập",
        icon: "🧠",
        chunkCount: studiedCount
      });
    }

    return list;
  }, [allChunks, progressMap, userStats.customChunksCount]);

  const filteredChunks = useMemo(() => {
    return allChunks.filter((chunk) => {
      if (selectedTopicId === "STUDIED") {
        const prog = progressMap[chunk.id];
        if (!prog || prog.repetitions === 0) return false;
      } else if (selectedTopicId === "CUSTOM") {
        if (!isUserOwnedChunk(chunk)) return false;
      } else if (selectedTopicId !== "ALL" && chunk.topicId !== selectedTopicId) {
        return false;
      }

      if (selectedLevel !== "ALL") {
        const lvl = chunk.level || "";
        if (!lvl.includes(selectedLevel)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchChunk = chunk.chunk.toLowerCase().includes(q);
        const matchMeaning = chunk.meaning.toLowerCase().includes(q);
        const matchExample = (chunk.exampleSentence || chunk.cleanExample || "").toLowerCase().includes(q);
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

  const activeChunkIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentChunk) {
      activeChunkIdRef.current = currentChunk.id;
    }
  }, [currentChunk]);

  useEffect(() => {
    if (activeChunkIdRef.current && practiceQueue.length > 0) {
      const existingIdx = practiceQueue.findIndex((c: SpeakingChunk) => c.id === activeChunkIdRef.current);
      if (existingIdx !== -1 && existingIdx !== queueIndex) {
        setQueueIndex(existingIdx);
      }
    }
  }, [practiceQueue, queueIndex, setQueueIndex]);

  const reviewDueCount = useMemo(() => {
    return Object.values(progressMap).filter((prog) => {
      if (!prog || prog.repetitions === 0) return false;
      return new Date(prog.dueDate).getTime() <= todayTimestamp;
    }).length;
  }, [progressMap, todayTimestamp]);

  const unstudiedCount = useMemo(() => {
    return allChunks.filter((c) => !progressMap[c.id]).length;
  }, [allChunks, progressMap]);

  const totalChunksCount = useMemo(() => {
    return allChunks.length;
  }, [allChunks.length]);

  const handleRateChunk = useCallback(
    (rating: SRSRating, accuracy: number) => {
      if (!currentChunk) return;
      const { nextProg, updatedStats } = rateChunkAction(currentChunk.id, rating, accuracy);

      if (user) {
        syncChunkProgress(user.uid, currentChunk.id, nextProg);
        syncUserStats(user.uid, updatedStats);
      }

      if (queueIndex + 1 < practiceQueue.length) {
        setQueueIndex((prev) => prev + 1);
      } else {
        setQueueIndex(0);
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    },
    [currentChunk, user, queueIndex, practiceQueue.length, setQueueIndex, rateChunkAction]
  );

  const handleNext = useCallback(() => {
    soundManager.playClick();
    if (queueIndex + 1 < practiceQueue.length) {
      setQueueIndex((prev) => prev + 1);
    } else {
      setQueueIndex(0);
    }
  }, [queueIndex, practiceQueue.length, setQueueIndex]);

  const handleShuffle = useCallback(() => {
    soundManager.playClick();
    setShuffleSeed((prev) => prev + 1);
    setQueueIndex(0);
  }, [setShuffleSeed, setQueueIndex]);

  const handleStartPracticeTopic = useCallback(
    (topicId: string) => {
      setSelectedTopicId(topicId);
      setSelectedLevel("ALL");
      setSearchQuery("");
      setShuffleSeed(0);
      setQueueIndex(0);
      soundManager.playSuccess();
      router.push("/shadowing");
    },
    [router, setSelectedTopicId, setSelectedLevel, setSearchQuery, setShuffleSeed, setQueueIndex]
  );

  const handlePracticeChunk = useCallback(
    (chunk: SpeakingChunk, topicIdOverride?: string) => {
      const targetTopicId = topicIdOverride || chunk.topicId;
      setSelectedTopicId(targetTopicId);
      setSelectedLevel("ALL");
      setSearchQuery("");
      setShuffleSeed(0);

      const candidateList = allChunks.filter((c) => {
        if (targetTopicId === "STUDIED") {
          return progressMap[c.id] && progressMap[c.id].repetitions > 0;
        }
        if (targetTopicId === "CUSTOM") {
          return isUserOwnedChunk(c);
        }
        if (targetTopicId !== "ALL") {
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
      router.push("/shadowing");
    },
    [allChunks, progressMap, router, setSelectedTopicId, setSelectedLevel, setSearchQuery, setShuffleSeed, setQueueIndex]
  );

  const handleSaveChunk = useCallback(
    (chunk: SpeakingChunk) => {
      saveChunkWithSync(chunk, user, chunkStoreApi, progressStoreApi);
    },
    [user, chunkStoreApi, progressStoreApi]
  );

  const handleDeleteChunk = useCallback(
    (chunkId: string) => {
      deleteChunkWithSync(chunkId, user, chunkStoreApi, progressStoreApi);
    },
    [user, chunkStoreApi, progressStoreApi]
  );

  return {
    allChunks,
    progressMap,
    userStats,
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
    totalChunksCount,
    handleRateChunk,
    handleNext,
    handleShuffle,
    handleStartPracticeTopic,
    handlePracticeChunk,
    openAddChunk,
    openEditChunk,
    handleSaveChunk,
    handleDeleteChunk
  };
}
