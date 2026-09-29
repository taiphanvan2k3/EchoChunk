'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PracticeMode, UserStats } from '@/types';
import {
  Flame,
  Mic,
  Puzzle,
  Zap,
  BookOpen,
  BarChart3,
  Volume2,
  VolumeX,
  Plus,
  Target,
  Cloud,
  LogOut,
  Loader2,
  Video,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePractice } from '@/context/PracticeContext';

interface NavbarProps {
  currentMode?: PracticeMode;
  onSelectMode?: (mode: PracticeMode) => void;
  stats?: UserStats;
  dueCount?: number;
  unstudiedCount?: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenAnalytics?: () => void;
  onOpenAddChunk?: () => void;
}

export const Navbar: React.FC<NavbarProps> = (props) => {
  const pathname = usePathname();
  const practice = usePractice();
  const { user, loading, isSigningIn, signInWithGoogle, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Use props if passed, otherwise fallback to PracticeContext
  const stats = props.stats ?? practice.userStats;
  const dueCount = props.dueCount ?? practice.reviewDueCount;
  const unstudiedCount = props.unstudiedCount ?? practice.unstudiedCount;
  const soundEnabled = props.soundEnabled ?? practice.soundEnabled;
  const onToggleSound = props.onToggleSound ?? practice.toggleSound;
  const onOpenAnalytics = props.onOpenAnalytics ?? practice.openAnalytics;
  const onOpenAddChunk = props.onOpenAddChunk ?? practice.openAddChunk;

  // Active path detection (supports both Vietnamese rewritten URLs and original paths)
  const isShadowingActive =
    pathname === '/luyen-noi' ||
    pathname === '/luyen-shadowing' ||
    pathname === '/shadowing' ||
    pathname === '/' ||
    props.currentMode === 'shadowing';

  const isBlanksActive =
    pathname === '/dien-tu' ||
    pathname === '/dien-cho-trong' ||
    pathname === '/blanks' ||
    props.currentMode === 'blanks';

  const isReflexActive =
    pathname === '/phan-xa' ||
    pathname === '/luyen-phan-xa' ||
    pathname === '/reflex' ||
    props.currentMode === 'reflex';

  const isExplorerActive =
    pathname === '/kho-tu-vung' ||
    pathname === '/kham-pha' ||
    pathname === '/explorer' ||
    pathname === '/browse' ||
    props.currentMode === 'browse';

  const isYouTubeActive =
    pathname === '/youtube' ||
    pathname === '/hoc-qua-youtube';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        {/* Brand Logo */}
        <Link href="/" className="brand-badge">
          <div className="logo-icon-wrap">
            <svg
              className="logo-audio-wave"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 10v4" />
              <path d="M6 6v12" />
              <path d="M10 3v18" />
              <path d="M14 8v8" />
              <path d="M18 5v14" />
              <path d="M22 10v4" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">EchoChunk</span>
            <span className="brand-tagline">Fluency Engine</span>
          </div>
        </Link>

        {/* Navigation Modes (Pill Segmented Control) */}
        <nav className="nav-tabs" aria-label="Chế độ luyện tập">
          <Link
            href="/luyen-noi"
            className={`nav-tab-btn ${isShadowingActive ? 'active' : ''}`}
            title="Luyện nói nhại (Shadowing) & Chấm điểm phát âm"
          >
            <Mic size={15} className="tab-icon" />
            <span className="tab-label">Shadowing</span>
          </Link>

          <Link
            href="/dien-tu"
            className={`nav-tab-btn ${isBlanksActive ? 'active' : ''}`}
            title="Điền vào chỗ trống & Nhớ lại chủ động"
          >
            <Puzzle size={15} className="tab-icon" />
            <span className="tab-label">Điền từ còn thiếu</span>
          </Link>

          <Link
            href="/phan-xa"
            className={`nav-tab-btn ${isReflexActive ? 'active' : ''}`}
            title="Luyện phản xạ dịch câu Việt sang Anh"
          >
            <Zap size={15} className="tab-icon" />
            <span className="tab-label">Phản xạ</span>
          </Link>

          <Link
            href="/kho-tu-vung"
            className={`nav-tab-btn ${isExplorerActive ? 'active' : ''}`}
            title="Khám phá toàn bộ chủ đề & Kho từ vựng"
          >
            <BookOpen size={15} className="tab-icon" />
            <span className="tab-label">Kho từ vựng</span>
          </Link>

          <Link
            href="/youtube"
            className={`nav-tab-btn ${isYouTubeActive ? 'active' : ''}`}
            title="Luyện nói qua video YouTube tương tác"
          >
            <Video size={15} className="tab-icon text-red-500" />
            <span className="tab-label">YouTube</span>
          </Link>
        </nav>

        {/* Action Widgets */}
        <div className="nav-actions">
          {/* Quick Stats Capsule (Unified Notion Clean Pill) */}
          <div className="stats-capsule" title="Tiến độ học tập hàng ngày">
            {/* Daily Goal */}
            <div
              className="capsule-item"
              title={`Mục tiêu ngày: Đã luyện ${stats.todayReviewedCount}/${stats.dailyGoal} câu (${unstudiedCount} câu sẵn sàng)`}
            >
              <Target size={14} className="capsule-icon goal-icon" />
              <span className="capsule-value">
                {stats.todayReviewedCount}/{stats.dailyGoal}
              </span>
            </div>

            {/* Review Due Badge (only if past reviewed cards are due) */}
            {dueCount > 0 && (
              <>
                <div className="capsule-separator" />
                <div
                  className="capsule-item due-item"
                  title={`${dueCount} câu đã học trước đó và đến lịch ôn tập lặp lại hôm nay (SRS)`}
                >
                  <span className="due-dot" />
                  <span className="capsule-value">{dueCount} cần ôn</span>
                </div>
              </>
            )}

            <div className="capsule-separator" />

            {/* Daily Streak */}
            <div
              className="capsule-item"
              title={`Chuỗi ngày học liên tục: ${stats.streakDays} ngày`}
            >
              <Flame size={14} className="capsule-icon streak-icon" />
              <span className="capsule-value">{stats.streakDays}d</span>
            </div>
          </div>

          <div className="nav-divider" />

          {/* Add Chunk Button */}
          <button
            type="button"
            className="add-chunk-navbar-btn"
            onClick={onOpenAddChunk}
            title="Thêm Speaking Chunk mới vào kho từ vựng"
          >
            <Plus size={15} />
            <span className="add-btn-text">Thêm Chunk</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleSound}
            title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Stats Button */}
          <button
            type="button"
            className="icon-btn"
            onClick={onOpenAnalytics}
            title="Xem thống kê & Quản lý dữ liệu"
          >
            <BarChart3 size={16} />
          </button>

          <div className="nav-divider" />

          {/* Firebase Authentication Button / User Profile */}
          {loading ? (
            <div className="user-avatar-skeleton" title="Đang kiểm tra đăng nhập...">
              <div className="user-avatar-skeleton-circle" />
              <div className="user-avatar-skeleton-text" />
            </div>
          ) : (
            <>
              {!user ? (
                <button
                  type="button"
                  className="google-auth-btn"
                  onClick={signInWithGoogle}
                  disabled={isSigningIn}
                  title="Đăng nhập Google để lưu trữ & đồng bộ đám mây"
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Đang kết nối...</span>
                    </>
                  ) : (
                    <>
                      <svg className="google-icon-svg" width="15" height="15" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span className="google-btn-text">Đăng nhập</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="user-profile-wrap" ref={userMenuRef}>
                  <button
                    type="button"
                    className="user-profile-btn"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    title="Hồ sơ tài khoản & Trạng thái đồng bộ"
                  >
                    {user.photoURL ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="user-avatar-img"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="user-avatar-placeholder">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="user-name-text">
                      {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                    </span>
                    <Cloud size={13} className="cloud-synced-icon" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="user-dropdown-menu">
                      <div className="dropdown-user-info">
                        <div className="dropdown-user-name">{user.displayName || 'Người học'}</div>
                        <div className="dropdown-user-email">{user.email}</div>
                        <div className="dropdown-sync-status">
                          <Cloud size={12} className="cloud-synced-icon" />
                          <span>Đã đồng bộ Cloud Firestore</span>
                        </div>
                      </div>
                      <div className="dropdown-divider" />
                      <button
                        type="button"
                        className="dropdown-logout-btn"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                      >
                        <LogOut size={14} />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
