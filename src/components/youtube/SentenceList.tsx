"use client";

import { useEffect, useRef, useMemo } from "react";
import { YouTubeSentence } from "@/types/youtube";
import { Lightbulb, Edit2 } from "lucide-react";
import { SentenceRow } from "./SentenceRow";

// ─────────────────────────────────────────────────────────────────────────────
// SentenceList
// ─────────────────────────────────────────────────────────────────────────────
interface SentenceListProps {
  sentences: YouTubeSentence[];
  currentTime: number;
  activeSentenceId: string | null;
  source?: "native" | "ytranscript";
  onSelectSentence: (sentence: YouTubeSentence) => void;
  onToggleComplete?: (sentenceId: string) => void;
  onEditClick?: () => void;
}

export function SentenceList({
  sentences,
  currentTime,
  activeSentenceId,
  source = "native",
  onSelectSentence,
  onToggleComplete,
  onEditClick
}: SentenceListProps) {
  const listContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Chỉ bật Karaoke tô màu từng từ khi nguồn phụ đề là native YouTube (có mốc từ chuẩn srv3).
  // Nếu là ytranscript.com thì chỉ highlight cả dòng (line highlighting).
  const isKaraokeEnabled = source !== "ytranscript";

  // Tìm câu đang phát từ CUỐI mảng → câu được bắt đầu gần nhất thắng
  // (YouTube srv3 sinh các đoạn chồng thời gian, tìm từ đầu trả về câu cũ)
  const currentPlayingSentence = useMemo(() => {
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

  const effectiveActiveId = currentPlayingSentence?.id || activeSentenceId || sentences[0]?.id || null;

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
          behavior: "smooth"
        });
      }
    }
  }, [effectiveActiveId]);

  return (
    <div className="bg-notion-surface border border-notion-border rounded-xl flex flex-col h-[720px] max-h-[calc(100vh-160px)] min-h-[600px] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="py-[0.85rem] px-5 border-b border-notion-border flex items-center justify-between bg-notion-surface">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-notion-text">{sentences.length}</span>
          <span className="text-[0.82rem] text-notion-secondary font-medium">sentences</span>
          {source === "native" && (
            <span
              className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-notion-green-text bg-notion-green-bg border border-notion-green-border px-2 py-0.5 rounded-full"
              title="Phụ đề lấy trực tiếp từ YouTube (có mốc thời gian từng từ)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-notion-green" />
              Phụ đề lấy trực tiếp từ YouTube
            </span>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 bg-notion-surface border border-notion-border text-notion-secondary rounded-md py-[0.3rem] px-[0.65rem] text-[0.78rem] font-medium cursor-pointer transition-all hover:bg-notion-hover hover:border-notion-border-medium hover:text-notion-text"
          onClick={onEditClick}
          title="Chỉnh sửa danh sách câu"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
      </div>

      {/* Tip */}
      <div className="bg-notion-blue-bg text-notion-blue-text py-[0.55rem] px-5 text-[0.8rem] flex items-center gap-2 border-b border-notion-blue-border font-medium">
        <Lightbulb size={14} className="shrink-0 text-notion-primary" />
        <span>Click any sentence to start shadowing that line.</span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin" ref={listContainerRef}>
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
              isKaraokeEnabled={isKaraokeEnabled}
              onSelectSentence={onSelectSentence}
              onToggleComplete={onToggleComplete}
            />
          );
        })}
      </div>
    </div>
  );
}
