"use client";

import React from "react";
import { Sparkles, Mic, BookOpen } from "lucide-react";

interface YouTubeWelcomeGuideProps {
  onSelectVideo: (url: string) => void;
}

export const YouTubeWelcomeGuide: React.FC<YouTubeWelcomeGuideProps> = ({ onSelectVideo }) => {
  return (
    <div className="yt-welcome-guide">
      {/* Thẻ giới thiệu & video mẫu */}
      <div className="yt-empty-state-card">
        <div className="yt-empty-icon-wrap">
          <Sparkles size={28} className="yt-empty-sparkle" />
        </div>
        <h2 className="yt-empty-title">Luyện Phản Xạ Nói Cùng Video YouTube</h2>
        <p className="yt-empty-desc">
          Dán bất kỳ link video tiếng Anh nào bạn yêu thích vào ô tìm kiếm ở trên để hệ thống tự động tải phụ đề tương
          tác, highlight từng từ và bắt đầu luyện cơ miệng.
        </p>
      </div>
    </div>
  );
};
