'use client';

import React from 'react';
import { PracticeMode, UserStats } from '@/types';
import { Flame, Mic, Puzzle, Zap, BookOpen, BarChart3, Volume2, VolumeX, Sparkles, Plus, Target } from 'lucide-react';

interface NavbarProps {
  currentMode: PracticeMode;
  onSelectMode: (mode: PracticeMode) => void;
  stats: UserStats;
  dueCount: number;
  unstudiedCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAnalytics: () => void;
  onOpenAddChunk: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onSelectMode,
  stats,
  dueCount,
  unstudiedCount,
  soundEnabled,
  onToggleSound,
  onOpenAnalytics,
  onOpenAddChunk,
}) => {
  return (
    <header className="navbar-container">
      <div className="navbar-content">
        {/* Brand Logo */}
        <div className="brand-badge" onClick={() => onSelectMode('shadowing')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon-wrap">
            <Sparkles className="logo-icon" size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-name">EchoChunk</span>
            <span className="brand-tagline">Fluency Practice Engine</span>
          </div>
        </div>

        {/* Navigation Modes */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${currentMode === 'shadowing' ? 'active' : ''}`}
            onClick={() => onSelectMode('shadowing')}
            title="Luyện nói nhại (Shadowing) & Chấm điểm phát âm"
          >
            <Mic size={18} />
            <span className="tab-label">Shadowing</span>
          </button>

          <button
            className={`nav-tab-btn ${currentMode === 'blanks' ? 'active' : ''}`}
            onClick={() => onSelectMode('blanks')}
            title="Điền vào chỗ trống & Nhớ lại chủ động"
          >
            <Puzzle size={18} />
            <span className="tab-label">Chunk Blanks</span>
          </button>

          <button
            className={`nav-tab-btn ${currentMode === 'reflex' ? 'active' : ''}`}
            onClick={() => onSelectMode('reflex')}
            title="Luyện phản xạ dịch từ tiếng Việt sang tiếng Anh (Nói hoặc Gõ)"
          >
            <Zap size={18} />
            <span className="tab-label">Dịch Việt ➔ Anh</span>
          </button>

          <button
            className={`nav-tab-btn ${currentMode === 'browse' ? 'active' : ''}`}
            onClick={() => onSelectMode('browse')}
            title="Khám phá toàn bộ chủ đề & Thư viện Chunks"
          >
            <BookOpen size={18} />
            <span className="tab-label">Explorer</span>
          </button>
        </nav>

        {/* Action Widgets */}
        <div className="nav-actions">
          {/* Add Chunk Button */}
          <button
            className="add-chunk-navbar-btn"
            onClick={onOpenAddChunk}
            title="Thêm Speaking Chunk mới vào kho từ vựng"
          >
            <Plus size={16} />
            <span className="add-btn-text">Thêm Chunk</span>
          </button>

          {/* Daily Goal Badge */}
          <div
            className="daily-goal-badge"
            title={`Mục tiêu mỗi ngày: Đã luyện ${stats.todayReviewedCount}/${stats.dailyGoal} câu hôm nay (${unstudiedCount} câu mới sẵn sàng trong kho)`}
          >
            <Target size={15} />
            <span>{stats.todayReviewedCount}/{stats.dailyGoal} hôm nay</span>
          </div>

          {/* Review Due Badge (only if past reviewed cards are due) */}
          {dueCount > 0 && (
            <div className="due-badge" title={`${dueCount} câu đã học trước đó và đến lịch ôn tập lặp lại hôm nay (SRS)`}>
              <span className="due-dot"></span>
              <span>{dueCount} cần ôn</span>
            </div>
          )}

          {/* Daily Streak */}
          <div className="streak-badge" title={`Chuỗi ngày học liên tục: ${stats.streakDays} ngày`}>
            <Flame className="streak-icon" size={18} />
            <span className="streak-count">{stats.streakDays}d</span>
          </div>

          {/* Sound Toggle */}
          <button
            className="icon-btn"
            onClick={onToggleSound}
            title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Stats Button */}
          <button
            className="icon-btn stats-btn"
            onClick={onOpenAnalytics}
            title="Xem thống kê & Quản lý dữ liệu"
          >
            <BarChart3 size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
