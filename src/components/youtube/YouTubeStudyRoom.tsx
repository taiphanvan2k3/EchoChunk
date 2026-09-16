"use client";

import React, { useState, useCallback, useMemo, useTransition } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { YouTubeLessonData, YouTubeSentence, YouTubeHistoryItem } from "@/types/youtube";
import { getYoutubeTranscriptAction } from "@/server/actions/youtube.actions";
import { useAuth } from "@/context/AuthContext";
import { useIsClient } from "@/hooks/useIsClient";
import {
  getYouTubeHistory,
  saveYouTubeHistoryItem,
  updateYouTubeHistoryProgress,
  removeYouTubeHistoryItem
} from "@/lib/youtube-history";
import { YouTubePlayer } from "./YouTubePlayer";
import { SentenceList } from "./SentenceList";
import { PracticeModeCards } from "./PracticeModeCards";
import { YouTubeRecentVideos } from "./YouTubeRecentVideos";
import {
  Play,
  X,
  Loader2,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Video as VideoIcon,
  Star,
  Mic,
  BookOpen
} from "lucide-react";

export const YouTubeStudyRoom: React.FC = () => {
  const { user } = useAuth();
  const isClient = useIsClient();
  const [inputUrl, setInputUrl] = useState("");
  const [storeVersion, setStoreVersion] = useState(0);

  // Tải danh sách lịch sử video khi client sẵn sàng hoặc khi user thay đổi
  const history = useMemo<YouTubeHistoryItem[]>(() => {
    void storeVersion;
    if (!isClient) return [];
    return getYouTubeHistory(user?.uid);
  }, [isClient, storeVersion, user?.uid]);

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

        // Lưu vào lịch sử học LocalStorage (phân vùng theo User UID)
        saveYouTubeHistoryItem(
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
        setStoreVersion((v) => v + 1);

        // startTransition: React render hàng nghìn câu không-blocking
        // isPending = true trong suốt quá trình → spinner vẫn hiển thị
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

  // Xóa một video khỏi lịch sử học
  const handleRemoveHistory = useCallback(
    (videoId: string) => {
      removeYouTubeHistoryItem(videoId, user?.uid);
      setStoreVersion((v) => v + 1);
    },
    [user?.uid]
  );

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
          updateYouTubeHistoryProgress(currentVideoId, next.size, user?.uid);
          setStoreVersion((v) => v + 1);
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
      <div className="yt-input-bar-wrap">
        <div className="yt-input-capsule">
          <VideoIcon size={18} className="yt-input-icon text-red-500" />
          <input
            type="text"
            className="yt-url-input"
            placeholder="Dán link YouTube (ví dụ: https://www.youtube.com/watch?v=... hoặc youtu.be/...)"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) {
                handleLoadVideo();
              }
            }}
          />
          {inputUrl && (
            <button type="button" className="yt-clear-input-btn" onClick={() => setInputUrl("")} title="Xóa link">
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="yt-load-video-btn"
          disabled={!inputUrl.trim() || isLoading}
          onClick={() => handleLoadVideo()}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Đang tải...</span>
            </>
          ) : (
            <>
              <Play size={15} fill="currentColor" />
              <span>Load Video</span>
            </>
          )}
        </button>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="yt-error-banner">
          <AlertCircle size={16} className="error-icon" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4. Trạng thái khởi đầu (Chưa tải video - Empty State hiện đại & rộng rãi) */}
      {!lessonData && !isLoading && (
        <div className="yt-empty-container">
          {/* Danh sách video đã học gần đây */}
          <YouTubeRecentVideos
            history={history}
            onSelectVideo={(url) => {
              setInputUrl(url);
              handleLoadVideo(url);
            }}
            onRemoveVideo={handleRemoveHistory}
            isLoading={isLoading}
          />

          <div className="yt-empty-state-card">
            <div className="yt-empty-icon-wrap">
              <Sparkles size={28} className="yt-empty-sparkle" />
            </div>
            <h2 className="yt-empty-title">Luyện Phản Xạ Nói Cùng Video YouTube</h2>
            <p className="yt-empty-desc">
              Dán bất kỳ link video tiếng Anh nào bạn yêu thích vào ô tìm kiếm ở trên để hệ thống tự động tải phụ đề
              tương tác, highlight từng từ và bắt đầu luyện cơ miệng.
            </p>

            {/* Gợi ý video mẫu nhanh */}
            <div className="yt-suggestions-box">
              <span className="suggestions-label">Thử nhanh video mẫu:</span>
              <div className="suggestions-chips">
                <button
                  type="button"
                  className="suggestion-chip"
                  onClick={() => {
                    const url = "https://www.youtube.com/watch?v=RYNCAcP1VSE";
                    setInputUrl(url);
                    handleLoadVideo(url);
                  }}
                >
                  ✨ Khanh Vy Learn English (EP 408)
                </button>
                <button
                  type="button"
                  className="suggestion-chip"
                  onClick={() => {
                    const url = "https://www.youtube.com/watch?v=xsFgrZdomDQ";
                    setInputUrl(url);
                    handleLoadVideo(url);
                  }}
                >
                  🎬 Show and Tell 3 (Party Time)
                </button>
                <button
                  type="button"
                  className="suggestion-chip"
                  onClick={() => {
                    const url = "https://www.youtube.com/watch?v=zMHhO3WNVfY";
                    setInputUrl(url);
                    handleLoadVideo(url);
                  }}
                >
                  🍿 Movies with Subtitles
                </button>
              </div>
            </div>
          </div>

          {/* 3 Thẻ tính năng nổi bật phía dưới empty state */}
          <div className="yt-empty-features-grid">
            <div className="yt-feature-card">
              <div className="yt-feature-icon-badge blue">
                <Sparkles size={18} />
              </div>
              <h4 className="yt-feature-title">Karaoke Subtitles</h4>
              <p className="yt-feature-desc">
                Đồng bộ chính xác từng mili-giây, highlight từng từ mượt mà khi người nói phát âm.
              </p>
            </div>

            <div className="yt-feature-card">
              <div className="yt-feature-icon-badge green">
                <Mic size={18} />
              </div>
              <h4 className="yt-feature-title">4 Chế độ Luyện Tập</h4>
              <p className="yt-feature-desc">
                Shadowing nhại giọng, Dictation chép chính tả, đàm thoại AI và bóc tách từ vựng.
              </p>
            </div>

            <div className="yt-feature-card">
              <div className="yt-feature-icon-badge purple">
                <BookOpen size={18} />
              </div>
              <h4 className="yt-feature-title">Ngữ Cảnh Thực Tế</h4>
              <p className="yt-feature-desc">
                Học trực tiếp từ video yêu thích, bắt chước nối âm và ngữ điệu tự nhiên của người bản xứ.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Khối bài học 2 cột khi đã có dữ liệu */}
      {lessonData && (
        <div className="yt-study-workspace-grid">
          {/* CỘT TRÁI: Video Player + 4 Thẻ Chế Độ Luyện Tập + Reviews + Tags */}
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

            {/* Reviews Section (Tái hiện chuẩn Shadowing English) */}
            <div className="yt-reviews-section">
              <div className="yt-reviews-header">
                <div className="yt-reviews-title">
                  <Star size={16} className="text-amber-500 fill-amber-400" />
                  <span>Reviews</span>
                </div>
                <button type="button" className="yt-write-review-btn">
                  Write a review
                </button>
              </div>
              <div className="yt-reviews-card-body">
                <div className="yt-reviews-prompt-title">How was this lesson?</div>
                <div className="yt-reviews-prompt-desc">
                  Share your rating to help other learners find great lessons!
                </div>
              </div>
            </div>

            {/* Practice for tags */}
            <div className="yt-practice-for-wrap">
              <span className="yt-practice-for-label">Practice for:</span>
              <div className="yt-practice-for-tags">
                <span className="yt-tag-pill">University Students</span>
                <span className="yt-tag-pill">Business English</span>
                <span className="yt-tag-pill">Working Adults</span>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Danh Sách Câu Tương Tác Kèm Karaoke Word Highlighting */}
          <div className="yt-workspace-right-col">
            <SentenceList
              sentences={augmentedSentences}
              currentTime={currentTime}
              activeSentenceId={activeSentenceId}
              onSelectSentence={handleSelectSentence}
              onToggleComplete={handleToggleComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
};
