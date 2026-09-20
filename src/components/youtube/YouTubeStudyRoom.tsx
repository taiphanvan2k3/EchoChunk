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
import { PracticeModeCards } from "./PracticeModeCards";
import { YouTubeInputBar } from "./YouTubeInputBar";
import { YouTubeRecentVideos } from "./YouTubeRecentVideos";
import { YouTubeReviewsCard } from "./YouTubeReviewsCard";
import { YouTubeExploreLibrary } from "./YouTubeExploreLibrary";
import { ChevronRight, AlertCircle } from "lucide-react";

export const YouTubeStudyRoom: React.FC = () => {
  const { user } = useAuth();
  const [inputUrl, setInputUrl] = useState("");

  // isFetching: đang chờ server trả lời
  // isPending:  React đang render hàng trăm câu — giữ spinner cho đến khi xong
  const [isFetching, setIsFetching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isLoading = isFetching || isPending;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState<YouTubeLessonData | null>(null);

  // Trạng thái theo dõi thời gian và tương tác
  const [currentTime, setCurrentTime] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | null>(null);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // Hàm xử lý nạp video từ link
  const handleLoadVideo = async (targetUrl?: string) => {
    const url = (targetUrl || inputUrl).trim();
    if (!url) return;

    // flushSync: spinner hiện ngay trước khi network call bắt đầu
    flushSync(() => {
      setIsFetching(true);
      setErrorMessage(null);
    });

    try {
      const res = await getYoutubeTranscriptAction(url);
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
          setActiveSentenceId(data.sentences[0]?.id || null);
          setCompletedIds(new Set());
          setCurrentTime(0);
          setSeekToTime(0);
        });
      } else {
        setErrorMessage(res.error || "Không thể tải phụ đề cho video này.");
      }
    } catch {
      setErrorMessage("Đã xảy ra lỗi kết nối. Vui lòng thử lại.");
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
      {/* 1. Breadcrumbs Navigation (Khi đã có bài học) */}
      {lessonData && (
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
              setErrorMessage(null);
            }}
            title="Quay lại chọn video khác"
          >
            Luyện tập YouTube
          </button>
          <ChevronRight size={14} className="yt-breadcrumb-sep" />
          <span className="yt-breadcrumb-current" title={lessonData.videoTitle}>
            {lessonData.videoTitle}
          </span>
        </nav>
      )}

      {/* 2. Tiêu đề bài học */}
      {lessonData && (
        <div className="yt-lesson-header">
          <h1 className="yt-lesson-title">Shadowing Practice: {lessonData.videoTitle}</h1>
        </div>
      )}

      {/* 3. Thanh nhập URL YouTube */}
      <YouTubeInputBar
        inputUrl={inputUrl}
        onChangeUrl={setInputUrl}
        onLoadVideo={handleLoadVideo}
        isLoading={isLoading}
      />

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="yt-error-banner">
          <AlertCircle size={16} className="error-icon" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4. Trạng thái khám phá & video đã học khi chưa tải bài học */}
      {!lessonData && !isLoading && (
        <div className="yt-empty-container">
          <YouTubeRecentVideos
            onSelectVideo={(url) => {
              setInputUrl(url);
              handleLoadVideo(url);
            }}
            isLoading={isLoading}
          />
          <YouTubeExploreLibrary
            onSelectVideo={(videoId) => {
              const url = `https://www.youtube.com/watch?v=${videoId}`;
              setInputUrl(url);
              handleLoadVideo(url);
            }}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* 5. Khối bài học 2 cột khi đã có dữ liệu */}
      {lessonData && (
        <div className="yt-study-workspace-grid">
          {/* CỘT TRÁI: Video Player + Chế Độ Luyện Tập + Reviews + Tags */}
          <div className="yt-workspace-left-col">
            <YouTubePlayer
              videoId={lessonData.videoId}
              onTimeUpdate={setCurrentTime}
              seekToTime={seekToTime}
              onSeekHandled={() => setSeekToTime(null)}
            />

            <PracticeModeCards
              completedCount={completedIds.size}
              totalCount={lessonData.totalSentences}
              onSelectMode={(mode) => {
                console.log("Selected mode:", mode);
              }}
            />

            <YouTubeReviewsCard />
          </div>

          {/* CỘT PHẢI: Danh Sách Câu Tương Tác Kèm Karaoke Word Highlighting */}
          <div className="yt-workspace-right-col">
            <SentenceList
              sentences={augmentedSentences}
              currentTime={currentTime}
              activeSentenceId={activeSentenceId}
              source={lessonData.source}
              onSelectSentence={handleSelectSentence}
              onToggleComplete={handleToggleComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
};
