"use client";

import React from "react";
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

export const SentenceListSkeleton: React.FC = () => {
  return (
    <div className="yt-sentence-list-card yt-sentence-skeleton-card">
      {/* Header */}
      <div className="yt-sentence-list-header">
        <div className="yt-sentence-count-badge">
          <span className="count-label flex items-center gap-1.5 font-medium text-slate-500">
            <Loader2 size={13} className="animate-spin text-blue-600" />
            <span>Đang tải phụ đề...</span>
          </span>
        </div>

        <button
          type="button"
          disabled
          className="yt-edit-sentences-btn opacity-50 cursor-not-allowed"
          title="Đang tải dữ liệu"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
      </div>

      {/* Tip Banner */}
      <div className="yt-sentence-tip-banner yt-sentence-tip-skeleton">
        <Lightbulb size={14} className="tip-icon text-amber-500 animate-pulse" />
        <span>Đang phân tích lời thoại và tạo mốc Karaoke theo thời gian thực...</span>
      </div>

      {/* Scrollable skeleton list */}
      <div className="yt-sentences-scroll-area">
        {SKELETON_ITEMS.map((item, index) => (
          <div key={index} className="yt-sentence-row is-skeleton">
            {/* Badge số thứ tự mờ */}
            <div className="yt-sentence-index-badge skeleton">
              {index + 1}
            </div>

            {/* Nội dung câu giả lập */}
            <div className="yt-sentence-content">
              <div
                className="yt-skeleton-line"
                style={{
                  width: item.width,
                  animationDelay: `${(index % 6) * 0.1}s`,
                }}
              />
              {item.hasSecondLine && (
                <div
                  className="yt-skeleton-line second-line"
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
};
