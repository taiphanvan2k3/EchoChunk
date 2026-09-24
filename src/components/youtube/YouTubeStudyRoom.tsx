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

export const YouTubeStudyRoom: React.FC = () => {
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
    <div className="yt-study-room-container">
      {/* 1. Breadcrumbs Navigation (Khi đang tải hoặc đã có bài học) */}
      {activeVideoId && (
        <nav className="yt-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" className="yt-breadcrumb-link" title="Về trang chủ">
            Trang chủ
          </Link>
          <ChevronRight size={14} className="yt-breadcrumb-sep" />
          <button
            type="button"
            className="yt-breadcrumb-link"
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
          <ChevronRight size={14} className="yt-breadcrumb-sep" />
          {displayTitle ? (
            <span className="yt-breadcrumb-current" title={displayTitle}>
              {displayTitle}
            </span>
          ) : (
            <span className="yt-skeleton-shimmer inline-block w-48 h-3.5 rounded align-middle" />
          )}
        </nav>
      )}

      {/* 2. Tiêu đề bài học */}
      {activeVideoId && (
        <div className="yt-lesson-header">
          <h1 className="yt-lesson-title">
            Shadowing Practice:{" "}
            {displayTitle ? (
              <span>{displayTitle}</span>
            ) : (
              <span className="yt-skeleton-shimmer inline-block w-72 h-6 rounded-md align-middle" />
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
        <div className="yt-error-banner">
          <AlertCircle size={16} className="error-icon" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4. Trạng thái khám phá & video đã học khi chưa nạp video */}
      {!activeVideoId && !isLoading && (
        <div className="yt-empty-container">
          {/* Segmented Pill Tabs */}
          <div className="yt-study-tabs-bar">
            <div className="yt-study-tabs-group" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "recent"}
                className={`yt-study-tab-btn ${activeTab === "recent" ? "is-active" : ""}`}
                onClick={() => setSelectedTab("recent")}
              >
                <Clock size={16} />
                <span>Video đã học gần đây</span>
                {historyItems.length > 0 && (
                  <span className="yt-study-tab-badge">{historyItems.length}</span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "explore"}
                className={`yt-study-tab-btn ${activeTab === "explore" ? "is-active" : ""}`}
                onClick={() => setSelectedTab("explore")}
              >
                <Sparkles size={16} />
                <span>Thư viện bài học gợi ý</span>
              </button>
            </div>
          </div>

          {/* Tab Content Panel */}
          <div className="yt-study-tab-content" key={activeTab}>
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
        <div className="yt-study-workspace-grid">
          {/* CỘT TRÁI: Video Player + Chế Độ Luyện Tập + Reviews + Tags */}
          <div className="yt-workspace-left-col">
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
          <div className="yt-workspace-right-col">
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
};
