"use client";

import { Lightbulb, Edit2, Loader2 } from "lucide-react";

const SKELETON_ITEMS = [
  { width: "75%", hasSecondLine: false },
  { width: "92%", hasSecondLine: true, secondWidth: "48%" },
  { width: "62%", hasSecondLine: false },
  { width: "88%", hasSecondLine: false },
  { width: "52%", hasSecondLine: false },
  { width: "95%", hasSecondLine: true, secondWidth: "65%" },
  { width: "70%", hasSecondLine: false },
  { width: "84%", hasSecondLine: false },
  { width: "45%", hasSecondLine: false },
  { width: "78%", hasSecondLine: true, secondWidth: "40%" },
  { width: "65%", hasSecondLine: false },
  { width: "90%", hasSecondLine: false },
];

export function SentenceListSkeleton() {
  return (
    <div className="bg-notion-surface border border-notion-border rounded-xl flex flex-col h-[720px] max-h-[calc(100vh-160px)] min-h-[600px] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="py-[0.85rem] px-5 border-b border-notion-border flex items-center justify-between bg-notion-surface">
        <div className="flex items-baseline gap-1.5">
          <span className="flex items-center gap-1.5 font-medium text-[0.82rem] text-notion-secondary">
            <Loader2 size={13} className="animate-spin text-notion-primary" />
            <span>Đang tải phụ đề...</span>
          </span>
        </div>

        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 bg-notion-surface border border-notion-border text-notion-secondary rounded-md py-[0.3rem] px-[0.65rem] text-[0.78rem] font-medium opacity-50 cursor-not-allowed"
          title="Đang tải dữ liệu"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
      </div>

      {/* Tip Banner */}
      <div className="bg-notion-surface-subtle text-notion-secondary py-[0.55rem] px-5 text-[0.8rem] flex items-center gap-2 border-b border-notion-border font-medium">
        <Lightbulb size={14} className="shrink-0 text-notion-yellow-text animate-pulse" />
        <span>Đang phân tích lời thoại và tạo mốc Karaoke theo thời gian thực...</span>
      </div>

      {/* Scrollable skeleton list */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {SKELETON_ITEMS.map((item, index) => (
          <div key={index} className="flex items-start gap-3.5 py-[0.85rem] px-5 border-b border-notion-border cursor-default pointer-events-none border-l-[3px] border-l-transparent">
            {/* Badge số thứ tự mờ */}
            <div className="min-w-[24px] h-6 px-1 rounded-md flex items-center justify-center text-[0.7rem] font-medium text-notion-muted bg-notion-hover border border-notion-border shrink-0 mt-0.5 opacity-85">
              {index + 1}
            </div>

            {/* Nội dung câu giả lập */}
            <div className="flex-1">
              <div
                className="h-3.5 rounded-md bg-gradient-to-r from-notion-hover via-notion-active to-notion-hover bg-[length:200%_100%] animate-pulse"
                style={{
                  width: item.width,
                  animationDelay: `${(index % 6) * 0.1}s`,
                }}
              />
              {item.hasSecondLine && (
                <div
                  className="mt-1.5 h-3 rounded-md bg-gradient-to-r from-notion-hover via-notion-active to-notion-hover bg-[length:200%_100%] animate-pulse"
                  style={{
                    width: item.secondWidth,
                    animationDelay: `${(index % 6) * 0.1 + 0.05}s`,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
