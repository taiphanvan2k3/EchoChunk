'use client';

import React, { useEffect, useRef, forwardRef } from 'react';
import { YouTubeSentence, YouTubeWord } from '@/types/youtube';
import { Check, Lightbulb, Edit2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// SentenceRow — memoized để tránh re-render không cần thiết.
// Chỉ re-render khi props thực sự thay đổi.
// Với non-active row: nhận currentTime=0 → không bao giờ re-render vì time tick.
// Với active row   : nhận currentTime thật → re-render mỗi 50ms (chỉ 1 dòng duy nhất).
// ─────────────────────────────────────────────────────────────────────────────
interface SentenceRowProps {
  sentence: YouTubeSentence;
  isActive: boolean;
  isCompleted: boolean;
  currentTime: number;
  onSelectSentence: (sentence: YouTubeSentence) => void;
  onToggleComplete?: (sentenceId: string) => void;
}

const SentenceRow = React.memo(
  forwardRef<HTMLDivElement, SentenceRowProps>(function SentenceRow(
    { sentence, isActive, isCompleted, currentTime, onSelectSentence, onToggleComplete },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={`yt-sentence-row${isActive ? ' is-active' : ''}${isCompleted ? ' is-completed' : ''}`}
        onClick={() => onSelectSentence(sentence)}
      >
        {/* Badge số thứ tự hoặc Tích xanh hoàn thành */}
        <div
          className={`yt-sentence-index-badge${isCompleted ? ' completed' : isActive ? ' active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete?.(sentence.id);
          }}
          title={isCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
        >
          {isCompleted ? <Check size={12} strokeWidth={3} /> : sentence.index}
        </div>

        {/* Nội dung câu + Karaoke Word Highlighting */}
        <div className="yt-sentence-content">
          {sentence.words && sentence.words.length > 0 ? (
            <div className="yt-words-wrap">
              {sentence.words.map((w: YouTubeWord, wIdx: number) => {
                const isWordActive = isActive && currentTime >= w.start && currentTime < w.end;
                return (
                  <span
                    key={wIdx}
                    className={`yt-word-token${isWordActive ? ' is-singing' : ''}`}
                  >
                    {w.word}{' '}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="yt-plain-text">{sentence.text}</span>
          )}
        </div>
      </div>
    );
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// SentenceList
// ─────────────────────────────────────────────────────────────────────────────
interface SentenceListProps {
  sentences: YouTubeSentence[];
  currentTime: number;
  activeSentenceId: string | null;
  onSelectSentence: (sentence: YouTubeSentence) => void;
  onToggleComplete?: (sentenceId: string) => void;
  onEditClick?: () => void;
}

export const SentenceList: React.FC<SentenceListProps> = ({
  sentences,
  currentTime,
  activeSentenceId,
  onSelectSentence,
  onToggleComplete,
  onEditClick,
}) => {
  const listContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Tìm câu đang phát từ CUỐI mảng → câu được bắt đầu gần nhất thắng
  // (YouTube srv3 sinh các đoạn chồng thời gian, tìm từ đầu trả về câu cũ)
  const currentPlayingSentence = React.useMemo(() => {
    if (!sentences || sentences.length === 0) return null;

    // Exact match — ưu tiên câu mới nhất đang chứa currentTime
    for (let i = sentences.length - 1; i >= 0; i--) {
      const s = sentences[i];
      if (currentTime >= s.start && currentTime < s.start + s.duration) {
        return s;
      }
    }

    // Gap handling — currentTime nằm giữa hai câu, dùng câu gần nhất phía trước
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (currentTime >= sentences[i].start) {
        return sentences[i];
      }
    }

    return sentences[0];
  }, [sentences, currentTime]);

  const effectiveActiveId =
    currentPlayingSentence?.id || activeSentenceId || sentences[0]?.id || null;

  // Auto-scroll: chỉ cuộn trong khung scroll-area, không giật toàn trang
  useEffect(() => {
    if (activeItemRef.current && listContainerRef.current) {
      const container = listContainerRef.current;
      const item = activeItemRef.current;
      const itemTop = item.offsetTop - container.offsetTop;
      const itemBottom = itemTop + item.clientHeight;
      const scrollTop = container.scrollTop;
      const viewH = container.clientHeight;

      if (itemTop < scrollTop + 30 || itemBottom > scrollTop + viewH - 30) {
        container.scrollTo({
          top: Math.max(0, itemTop - viewH / 2 + item.clientHeight / 2),
          behavior: 'smooth',
        });
      }
    }
  }, [effectiveActiveId]);

  return (
    <div className="yt-sentence-list-card">
      {/* Header */}
      <div className="yt-sentence-list-header">
        <div className="yt-sentence-count-badge">
          <span className="count-number">{sentences.length}</span>
          <span className="count-label">sentences</span>
        </div>

        <button
          type="button"
          className="yt-edit-sentences-btn"
          onClick={onEditClick}
          title="Chỉnh sửa danh sách câu"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
      </div>

      {/* Tip */}
      <div className="yt-sentence-tip-banner">
        <Lightbulb size={14} className="tip-icon" />
        <span>Click any sentence to start shadowing that line.</span>
      </div>

      {/* Scrollable list */}
      <div className="yt-sentences-scroll-area" ref={listContainerRef}>
        {sentences.map((sentence) => {
          const isActive = sentence.id === effectiveActiveId;
          return (
            <SentenceRow
              key={sentence.id}
              // Chỉ gán ref vào active row để auto-scroll trỏ đúng phần tử
              ref={isActive ? activeItemRef : null}
              sentence={sentence}
              isActive={isActive}
              isCompleted={!!sentence.isCompleted}
              // ← Key optimization: non-active rows luôn nhận 0, không bao giờ re-render vì time
              currentTime={isActive ? currentTime : 0}
              onSelectSentence={onSelectSentence}
              onToggleComplete={onToggleComplete}
            />
          );
        })}
      </div>
    </div>
  );
};
