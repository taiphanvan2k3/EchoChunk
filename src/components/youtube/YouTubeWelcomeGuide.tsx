"use client";

import { Sparkles } from "lucide-react";

interface YouTubeWelcomeGuideProps {
  onSelectVideo?: (url: string) => void;
}

export function YouTubeWelcomeGuide({ onSelectVideo }: YouTubeWelcomeGuideProps) {
  return (
    <div className="w-full max-w-[840px] mx-auto text-center py-10 px-4" onClick={() => onSelectVideo?.("")}>
      {/* Thẻ giới thiệu & video mẫu */}
      <div className="bg-notion-surface border border-notion-border rounded-2xl p-8 sm:p-10 shadow-sm flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-notion-yellow-bg border border-notion-yellow-border text-notion-yellow-text flex items-center justify-center mb-4">
          <Sparkles size={28} />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-notion-text mb-2.5">
          Luyện Phản Xạ Nói Cùng Video YouTube
        </h2>
        <p className="text-sm sm:text-base text-notion-secondary max-w-lg leading-relaxed">
          Dán bất kỳ link video tiếng Anh nào bạn yêu thích vào ô tìm kiếm ở trên để hệ thống tự động tải phụ đề tương
          tác, highlight từng từ và bắt đầu luyện cơ miệng.
        </p>
      </div>
    </div>
  );
}
