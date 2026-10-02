"use client";

import { memo, forwardRef } from "react";
import { YouTubeSentence, YouTubeWord } from "@/types/youtube";
import { Check } from "lucide-react";

export interface SentenceRowProps {
  sentence: YouTubeSentence;
  isActive: boolean;
  isCompleted: boolean;
  currentTime: number;
  isKaraokeEnabled: boolean;
  onSelectSentence: (sentence: YouTubeSentence) => void;
  onToggleComplete?: (sentenceId: string) => void;
}

export const SentenceRow = memo(
  forwardRef<HTMLDivElement, SentenceRowProps>(function SentenceRow(
    { sentence, isActive, isCompleted, currentTime, isKaraokeEnabled, onSelectSentence, onToggleComplete },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={`flex items-start gap-3.5 py-[0.85rem] px-5 border-b border-notion-border cursor-pointer transition-colors border-l-[3px] ${
          isActive
            ? "bg-notion-blue-bg border-l-notion-primary"
            : "border-l-transparent hover:bg-notion-hover"
        }${isCompleted ? " opacity-90" : ""}`}
        onClick={() => onSelectSentence(sentence)}
      >
        {/* Badge số thứ tự hoặc Tích xanh hoàn thành */}
        <div
          className={`min-w-[24px] h-6 px-1 rounded-md flex items-center justify-center text-[0.72rem] font-semibold shrink-0 mt-0.5 transition-all cursor-pointer ${
            isCompleted
              ? "bg-notion-green text-white border border-notion-green"
              : isActive
              ? "bg-notion-primary text-white border border-notion-primary"
              : "text-notion-secondary bg-notion-surface-subtle border border-notion-border"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete?.(sentence.id);
          }}
          title={isCompleted ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
        >
          {isCompleted ? <Check size={12} strokeWidth={3} /> : sentence.index}
        </div>

        {/* Nội dung câu: Karaoke Word Highlighting (chỉ khi có word-timing chuẩn native) */}
        <div className={`flex-1 text-[0.94rem] leading-[1.58] ${isActive ? "text-notion-text font-medium" : "text-notion-secondary"}`}>
          {isKaraokeEnabled && sentence.words && sentence.words.length > 0 ? (
            <span className="inline">
              {sentence.words.map((w: YouTubeWord, wIdx: number) => {
                const isWordActive = isActive && currentTime >= w.start && currentTime < w.end;
                return (
                  <span
                    key={wIdx}
                    className={`inline px-[0.22rem] py-[0.08rem] rounded transition-colors duration-75 ${
                      isWordActive ? "bg-notion-yellow-bg text-notion-yellow-text shadow-sm font-semibold" : ""
                    }`}
                  >
                    {w.word}{" "}
                  </span>
                );
              })}
            </span>
          ) : (
            <span className="inline">{sentence.text}</span>
          )}
        </div>
      </div>
    );
  })
);

SentenceRow.displayName = "SentenceRow";
