"use client";

import React, { useState, useCallback, useTransition } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { YouTubeLessonData, YouTubeSentence } from "@/types/youtube";
import { getYoutubeTranscriptAction } from "@/server/actions/youtube.actions";
import { useAuth } from "@/context/AuthContext";
import { youtubeHistoryStore } from "@/stores/youtubeHistoryStore";
import { YouTubePlayer } from "./YouTubePlayer";
import { SentenceList } from "./SentenceList";
import { SentenceListSkeleton } from "./SentenceListSkeleton";
import { PracticeModeCards } from "./PracticeModeCards";
import { YouTubeInputBar } from "./YouTubeInputBar";
import { YouTubeRecentVideos } from "./YouTubeRecentVideos";
import { YouTubeReviewsCard } from "./YouTubeReviewsCard";
import { YouTubeExploreLibrary } from "./YouTubeExploreLibrary";
import { APIKeySettingsModal } from "@/components/settings/APIKeySettingsModal";
import { useUserYTKeys } from "@/hooks/useUserYTKeys";
import { useYouTubeHistory } from "@/hooks/useYouTubeHistory";
import { extractVideoId } from "@/lib/shared/youtube";
import { ChevronRight, AlertCircle, Clock, Sparkles } from "lucide-react";

export function YouTubeStudyRoom() {
  const { user } = useAuth();
  const historyItems = useYouTubeHistory(user?.uid);
  const [selectedTab, setSelectedTab] = useState<'recent' | 'explore' | null>(null);
  const activeTab = selectedTab ?? (historyItems.length > 0 ? 'recent' : 'explore');

  const [inputUrl, setInputUrl] = useState("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const { decryptedKeys, storedKeys, reload: reloadKeys } = useUserYTKeys();

  // isFetching: đang chờ server trả lời
  // isPending:  React đang render hàng trăm câu — giữ spinner cho đến khi xong
  const [isFetching, setIsFetching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isLoading = isFetching || isPending;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState<YouTubeLessonData | null>(null);

  // ID của video đang tải (dùng để show ngay YouTube Player + Skeleton trước khi phụ đề sẵn sàng)
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);

  // Trạng thái theo dõi thời gian và tương tác
  const [currentTime, setCurrentTime] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | null>(null);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // Video ID và tiêu đề hiển thị (kể cả khi đang tải)
  const activeVideoId = lessonData?.videoId || loadingVideoId;
  const displayTitle = lessonData?.videoTitle || previewTitle;

  // Hàm xử lý nạp video từ link
  const handleLoadVideo = async (targetUrl?: string) => {
    const url = (targetUrl || inputUrl).trim();
    if (!url) return;

    const parsedVideoId = extractVideoId(url);
    if (!parsedVideoId) {
      setErrorMessage("Đường dẫn YouTube không hợp lệ. Vui lòng kiểm tra lại link video.");
      return;
    }

    // flushSync: hiển thị ngay giao diện học với video player và skeleton transcript
    flushSync(() => {
      setIsFetching(true);
      setErrorMessage(null);
      setLoadingVideoId(parsedVideoId);
      if (lessonData?.videoId !== parsedVideoId) {
        setPreviewTitle(null);
      }
    });

    // Thử lấy tiêu đề video cực nhanh qua YouTube oEmbed công khai (không cần API key)
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${parsedVideoId}&format=json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((oembedData) => {
        if (oembedData?.title) {
          setPreviewTitle(oembedData.title);
        }
      })
      .catch(() => {});

    try {
      const res = await getYoutubeTranscriptAction(url, decryptedKeys);
      if (res.success && res.data) {
        const data = res.data;

        // Lưu vào lịch sử học LocalStorage & Firestore (nếu đã đăng nhập)
        youtubeHistoryStore.save(
          {
            videoId: data.videoId,
            videoUrl: url,
            videoTitle: data.videoTitle,
            thumbnailUrl: `https://i.ytimg.com/vi/${data.videoId}/mqdefault.jpg`,
            totalSentences: data.totalSentences,
            completedSentencesCount: 0
          },
          user?.uid
        );

        // startTransition: React render hàng nghìn câu không-blocking
        startTransition(() => {
          setLessonData(data);
          setLoadingVideoId(null);
          setPreviewTitle(null);
          setActiveSentenceId(data.sentences[0]?.id || null);
          setCompletedIds(new Set());
          setCurrentTime(0);
          setSeekToTime(0);
        });
      } else {
        setErrorMessage(res.error || "Không thể tải phụ đề cho video này.");
        setLoadingVideoId(null);
        setPreviewTitle(null);
      }
    } catch {
      setErrorMessage("Đã xảy ra lỗi kết nối. Vui lòng thử lại.");
      setLoadingVideoId(null);
      setPreviewTitle(null);
    } finally {
      setIsFetching(false);
    }
  };

  // Bấm vào 1 câu trong danh sách để nhảy video
  const handleSelectSentence = useCallback((sentence: YouTubeSentence) => {
    setActiveSentenceId(sentence.id);
    setCurrentTime(sentence.start);
    setSeekToTime(sentence.start);
  }, []);

  // Đánh dấu hoàn thành câu & cập nhật tiến độ vào lịch sử
  const currentVideoId = lessonData?.videoId;
  const handleToggleComplete = useCallback(
    (sentenceId: string) => {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (next.has(sentenceId)) {
          next.delete(sentenceId);
        } else {
          next.add(sentenceId);
        }

        if (currentVideoId) {
          youtubeHistoryStore.updateProgress(currentVideoId, next.size, user?.uid);
        }

        return next;
      });
    },
    [currentVideoId, user?.uid]
  );

  // Cập nhật sentences kèm trạng thái hoàn thành
  const augmentedSentences = lessonData
    ? lessonData.sentences.map((s) => ({
        ...s,
        isCompleted: completedIds.has(s.id)
      }))
    : [];

  return (
    <div className="yt-study-room-container w-full max-w-[1400px] mx-auto pt-2 pb-14">
      {/* 1. Breadcrumbs Navigation (Khi đang tải hoặc đã có bài học) */}
      {activeVideoId && (
        <nav className="flex items-center gap-1.5 text-[0.84rem] text-gray-500 mb-2.5" aria-label="Breadcrumb">
          <Link
            href="/"
            className="text-gray-500 hover:text-blue-600 hover:underline transition-colors cursor-pointer bg-transparent border-none p-0 inline-flex items-center text-inherit font-inherit"
            title="Về trang chủ"
          >
            Trang chủ
          </Link>
          <ChevronRight size={14} className="opacity-45 text-gray-400 shrink-0" />
          <button
            type="button"
            className="text-gray-500 hover:text-blue-600 hover:underline transition-colors cursor-pointer bg-transparent border-none p-0 inline-flex items-center text-inherit font-inherit"
            onClick={() => {
              setLessonData(null);
              setLoadingVideoId(null);
              setPreviewTitle(null);
              setErrorMessage(null);
            }}
            title="Quay lại chọn video khác"
          >
            Luyện tập YouTube
          </button>
          <ChevronRight size={14} className="opacity-45 text-gray-400 shrink-0" />
          {displayTitle ? (
            <span className="text-gray-900 font-medium max-w-[540px] truncate" title={displayTitle}>
              {displayTitle}
            </span>
          ) : (
            <span className="animate-pulse bg-gray-200 inline-block w-48 h-3.5 rounded align-middle" />
          )}
        </nav>
      )}

      {/* 2. Tiêu đề bài học */}
      {activeVideoId && (
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-gray-900 leading-[1.35] tracking-tight m-0">
            Shadowing Practice:{" "}
            {displayTitle ? (
              <span>{displayTitle}</span>
            ) : (
              <span className="animate-pulse bg-gray-200 inline-block w-72 h-6 rounded-md align-middle" />
            )}
          </h1>
        </div>
      )}

      {/* Input bar + settings button */}
      <YouTubeInputBar
        inputUrl={inputUrl}
        onChangeUrl={setInputUrl}
        onLoadVideo={handleLoadVideo}
        isLoading={isLoading}
        hasUserKeys={storedKeys.length > 0}
        onOpenKeySettings={() => setIsKeyModalOpen(true)}
      />

      {/* API Key Settings Modal */}
      <APIKeySettingsModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        storedKeys={storedKeys}
        onKeysChanged={reloadKeys}
      />

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 py-3 px-[1.15rem] rounded-lg text-[0.88rem] mb-6">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4. Trạng thái khám phá & video đã học khi chưa nạp video */}
      {!activeVideoId && !isLoading && (
        <div className="w-full">
          {/* Modern Underline Tab Navigation */}
          <div className="flex items-center justify-between border-b border-gray-200 mb-6 w-full">
            <div className="flex items-center gap-3 sm:gap-6 -mb-px" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "recent"}
                className={`inline-flex items-center gap-2 pb-3 pt-1 px-1 sm:px-1.5 text-sm font-semibold border-b-2 transition-all cursor-pointer select-none ${
                  activeTab === "recent"
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                }`}
                onClick={() => setSelectedTab("recent")}
              >
                <Clock size={16} className="shrink-0" />
                <span>Video đã học</span>
                {historyItems.length > 0 && (
                  <span
                    className={`text-[0.72rem] font-bold px-2 py-0.5 rounded-full leading-tight shrink-0 transition-colors ${
                      activeTab === "recent"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {historyItems.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "explore"}
                className={`inline-flex items-center gap-2 pb-3 pt-1 px-1 sm:px-1.5 text-sm font-semibold border-b-2 transition-all cursor-pointer select-none ${
                  activeTab === "explore"
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                }`}
                onClick={() => setSelectedTab("explore")}
              >
                <Sparkles size={16} className="shrink-0" />
                <span>Kho bài học gợi ý</span>
              </button>
            </div>
          </div>

          {/* Tab Content Panel */}
          <div className="animate-[fadeIn_0.22s_ease-out]" key={activeTab}>
            {activeTab === "recent" && (
              <YouTubeRecentVideos
                onSelectVideo={(url) => {
                  setInputUrl(url);
                  handleLoadVideo(url);
                }}
                onSwitchToExplore={() => setSelectedTab("explore")}
                isLoading={isLoading}
              />
            )}

            {activeTab === "explore" && (
              <YouTubeExploreLibrary
                onSelectVideo={(videoId) => {
                  const url = `https://www.youtube.com/watch?v=${videoId}`;
                  setInputUrl(url);
                  handleLoadVideo(url);
                }}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      )}

      {/* 5. Khối bài học 2 cột khi có video (kể cả đang tải transcript hay đã tải xong) */}
      {activeVideoId && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.28fr)_minmax(0,1fr)] gap-7 items-start">
          {/* CỘT TRÁI: Video Player + Chế Độ Luyện Tập + Reviews + Tags */}
          <div className="flex flex-col gap-5">
            <YouTubePlayer
              videoId={activeVideoId}
              onTimeUpdate={setCurrentTime}
              seekToTime={seekToTime}
              onSeekHandled={() => setSeekToTime(null)}
            />

            <PracticeModeCards
              completedCount={completedIds.size}
              totalCount={lessonData?.totalSentences || 0}
              isLoading={!lessonData}
              onSelectMode={(mode) => {
                console.log("Selected mode:", mode);
              }}
            />

            <YouTubeReviewsCard />
          </div>

          {/* CỘT PHẢI: Danh Sách Câu (hoặc Skeleton khi đang load transcript) */}
          <div className="w-full">
            {lessonData ? (
              <SentenceList
                sentences={augmentedSentences}
                currentTime={currentTime}
                activeSentenceId={activeSentenceId}
                source={lessonData.source}
                onSelectSentence={handleSelectSentence}
                onToggleComplete={handleToggleComplete}
              />
            ) : (
              <SentenceListSkeleton />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
