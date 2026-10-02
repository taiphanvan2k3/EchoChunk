"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PracticeMode, UserStats } from "@/types";
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
  Bell,
  Settings
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePractice } from "@/context/PracticeContext";
import { NotificationSettingsModal } from "@/components/settings/NotificationSettingsModal";
import { initNotificationLifecycle } from "@/lib/client/notifications";

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

export function Navbar(props: NavbarProps) {
  const pathname = usePathname();
  const practice = usePractice();
  const { user, loading, isSigningIn, signInWithGoogle, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initNotificationLifecycle();
  }, []);

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
    pathname === "/luyen-noi" ||
    pathname === "/luyen-shadowing" ||
    pathname === "/shadowing" ||
    pathname === "/" ||
    props.currentMode === "shadowing";

  const isBlanksActive =
    pathname === "/dien-tu" ||
    pathname === "/dien-cho-trong" ||
    pathname === "/blanks" ||
    props.currentMode === "blanks";

  const isReflexActive =
    pathname === "/phan-xa" ||
    pathname === "/luyen-phan-xa" ||
    pathname === "/reflex" ||
    props.currentMode === "reflex";

  const isExplorerActive =
    pathname === "/kho-tu-vung" ||
    pathname === "/kham-pha" ||
    pathname === "/explorer" ||
    pathname === "/browse" ||
    props.currentMode === "browse";

  const isYouTubeActive = pathname === "/youtube" || pathname === "/hoc-qua-youtube";

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-[100] backdrop-blur-[20px] bg-white/85 border-b border-notion-border px-2 min-[360px]:px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] transition-all duration-200">
        <div className="w-full max-w-[1380px] mx-auto flex flex-col lg:grid lg:grid-cols-[auto_1fr_auto] xl:grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2.5 lg:gap-4">
          {/* Top Row on Mobile & Tablet: Logo (Left) + Action Widgets with Avatar (Right) */}
          <div className="flex items-center justify-between w-full lg:contents">
            {/* Brand Logo */}
            <Link
              href="/"
              className="lg:order-1 justify-self-start inline-flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-2.5 shrink-0 select-none no-underline cursor-pointer transition-opacity duration-150 hover:opacity-85"
            >
              <div className="w-7 h-7 min-[360px]:w-6 min-[360px]:h-6 sm:w-8 sm:h-8 rounded-[6px] sm:rounded-[9px] bg-gradient-to-br from-notion-primary to-notion-primary-hover flex items-center justify-center text-white shadow-[0_2px_8px_rgba(35,131,226,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] shrink-0">
                <svg
                  className="text-white w-4 h-4 min-[360px]:w-3.5 min-[360px]:h-3.5 sm:w-4 sm:h-4"
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
              <div className="flex flex-col leading-[1.15]">
                <span className="text-[0.82rem] min-[360px]:text-[0.92rem] sm:text-[1.05rem] font-bold tracking-[-0.025em] text-notion-text">
                  EchoChunk
                </span>
                <span className="text-[0.62rem] text-notion-muted uppercase tracking-[0.06em] font-semibold hidden xl:inline">
                  Fluency Engine
                </span>
              </div>
            </Link>

            {/* Action Widgets */}
            <div className="lg:order-3 justify-self-end inline-flex items-center gap-0.5 min-[360px]:gap-1 sm:gap-1.5 shrink-0">
              {/* Quick Stats Capsule (Shown on desktop xl+ where width is abundant) */}
              <div
                className="hidden xl:inline-flex items-center h-[32px] sm:h-[34px] bg-notion-surface-subtle border border-notion-border rounded-full px-2.5 sm:px-3 gap-[0.45rem] sm:gap-[0.55rem] text-[0.8rem] select-none transition-all duration-150 hover:bg-notion-hover hover:border-notion-border-medium"
                title="Tiến độ học tập hàng ngày"
              >
                {/* Daily Goal */}
                <div
                  className="inline-flex items-center gap-1.5 font-semibold text-notion-secondary whitespace-nowrap"
                  title={`Mục tiêu ngày: Đã luyện ${stats.todayReviewedCount}/${stats.dailyGoal} câu (${unstudiedCount} câu sẵn sàng)`}
                >
                  <Target size={14} className="text-notion-primary" />
                  <span className="font-mono text-[0.78rem] font-semibold">
                    {stats.todayReviewedCount}/{stats.dailyGoal}
                  </span>
                </div>

                {/* Review Due Badge (only if past reviewed cards are due) */}
                {dueCount > 0 && (
                  <>
                    <div className="w-px h-3 bg-notion-border shrink-0" />
                    <div
                      className="inline-flex items-center gap-1.5 font-semibold text-notion-green-text whitespace-nowrap"
                      title={`${dueCount} câu đã học trước đó và đến lịch ôn tập lặp lại hôm nay (SRS)`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-notion-green shadow-[0_0_0_2px_rgba(15,123,108,0.2)] shrink-0" />
                      <span className="font-mono text-[0.78rem] font-semibold">{dueCount} cần ôn</span>
                    </div>
                  </>
                )}

                <div className="w-px h-3 bg-notion-border shrink-0" />

                {/* Daily Streak */}
                <div
                  className="inline-flex items-center gap-1.5 font-semibold text-notion-secondary whitespace-nowrap"
                  title={`Chuỗi ngày học liên tục: ${stats.streakDays} ngày`}
                >
                  <Flame size={14} className="text-notion-orange-text" />
                  <span className="font-mono text-[0.78rem] font-semibold">{stats.streakDays}d</span>
                </div>
              </div>

              <div className="w-px h-[18px] bg-notion-border shrink-0 mx-[0.1rem] hidden xl:block" />

              {/* Add Chunk Button */}
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 h-[27px] w-[27px] min-[360px]:h-[30px] min-[360px]:w-[30px] sm:w-auto sm:h-[34px] px-0 sm:px-2.5 xl:px-3.5 bg-notion-blue-bg border border-notion-blue-border rounded-lg text-notion-blue-text text-[0.82rem] font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap hover:bg-notion-primary hover:border-notion-primary hover:text-white hover:shadow-[0_2px_8px_rgba(35,131,226,0.25)] active:translate-y-0 shrink-0"
                onClick={onOpenAddChunk}
                title="Thêm Speaking Chunk mới vào kho từ vựng"
              >
                <Plus size={14} className="sm:w-[15px] sm:h-[15px]" />
                <span className="whitespace-nowrap tracking-[-0.01em] hidden xl:inline">Thêm Chunk</span>
              </button>

              {/* Sound Toggle */}
              <button
                type="button"
                className="w-[27px] h-[27px] min-[360px]:w-[30px] min-[360px]:h-[30px] sm:w-[34px] sm:h-[34px] inline-flex items-center justify-center bg-notion-surface-subtle border border-notion-border rounded-full text-notion-secondary cursor-pointer transition-all duration-150 shrink-0 hover:bg-notion-hover hover:text-notion-text hover:border-notion-border-medium hover:-translate-y-px active:translate-y-0"
                onClick={onToggleSound}
                title={soundEnabled ? "Tắt âm thanh hiệu ứng" : "Bật âm thanh hiệu ứng"}
              >
                {soundEnabled ? (
                  <Volume2 size={13} className="min-[360px]:w-[14px] min-[360px]:h-[14px] sm:w-[15px] sm:h-[15px]" />
                ) : (
                  <VolumeX size={13} className="min-[360px]:w-[14px] min-[360px]:h-[14px] sm:w-[15px] sm:h-[15px]" />
                )}
              </button>

              <div className="w-px h-[14px] sm:h-[18px] bg-notion-border shrink-0 mx-[0.02rem] min-[360px]:mx-[0.05rem] sm:mx-[0.1rem]" />

              {/* Firebase Authentication Button / User Profile & Settings Menu */}
              {loading ? (
                <div
                  className="inline-flex items-center gap-[0.35rem] sm:gap-[0.45rem] h-[27px] min-[360px]:h-[30px] sm:h-[34px] pl-1 pr-2 sm:pl-1.5 sm:pr-2.5 bg-notion-surface-subtle border border-notion-border rounded-full relative overflow-hidden shrink-0 animate-pulse"
                  title="Đang kiểm tra đăng nhập..."
                >
                  <div className="w-[19px] h-[19px] min-[360px]:w-[22px] min-[360px]:h-[22px] sm:w-[24px] sm:h-[24px] rounded-full bg-notion-hover shrink-0" />
                  <div className="w-10 h-3 bg-notion-hover rounded shrink-0 hidden sm:block" />
                </div>
              ) : (
                <>
                  {!user ? (
                    <div className="relative shrink-0 flex items-center gap-1 sm:gap-1.5" ref={userMenuRef}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 sm:gap-1.5 h-[27px] min-[360px]:h-[30px] sm:h-[34px] px-1.5 min-[360px]:px-2 sm:px-3.5 bg-white border border-notion-border-medium rounded-full text-notion-text text-[0.74rem] min-[360px]:text-[0.78rem] sm:text-[0.82rem] font-semibold cursor-pointer transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.04)] whitespace-nowrap shrink-0 hover:not(:disabled):bg-notion-hover hover:not(:disabled):border-notion-border-focus hover:not(:disabled):-translate-y-px active:not(:disabled):translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                        onClick={signInWithGoogle}
                        disabled={isSigningIn}
                        title="Đăng nhập Google để lưu trữ & đồng bộ đám mây"
                      >
                        {isSigningIn ? (
                          <>
                            <Loader2 className="animate-spin" size={13} />
                            <span className="hidden sm:inline lg:hidden xl:inline">Đang kết nối...</span>
                          </>
                        ) : (
                          <>
                            <svg className="shrink-0 w-3.5 h-3.5 sm:w-[15px] sm:h-[15px]" viewBox="0 0 24 24">
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
                            <span className="tracking-[-0.01em] whitespace-nowrap hidden sm:inline lg:hidden xl:inline">
                              Đăng nhập
                            </span>
                          </>
                        )}
                      </button>

                      {/* Settings / Menu button for guest */}
                      <button
                        type="button"
                        className="w-[27px] h-[27px] min-[360px]:w-[30px] min-[360px]:h-[30px] sm:w-[34px] sm:h-[34px] inline-flex items-center justify-center bg-notion-surface-subtle border border-notion-border rounded-full text-notion-secondary cursor-pointer transition-all duration-150 shrink-0 hover:bg-notion-hover hover:text-notion-text hover:border-notion-border-medium hover:-translate-y-px active:translate-y-0"
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        title="Cài đặt & Tiện ích"
                      >
                        <Settings size={13} className="min-[360px]:w-[14px] min-[360px]:h-[14px] sm:w-[15px] sm:h-[15px]" />
                      </button>

                      {isUserMenuOpen && (
                        <div className="absolute top-[calc(100%+8px)] right-0 w-[275px] max-w-[calc(100vw-20px)] bg-white border border-notion-border rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-2 z-[200] flex flex-col gap-1 animate-fadeIn">
                          <div className="px-2.5 py-1.5 flex flex-col gap-0.5">
                            <div className="text-[0.82rem] font-bold text-notion-text">Cài đặt & Tiện ích</div>
                            <div className="text-[0.72rem] text-notion-secondary">
                              Quản lý tiến độ học tập và thông báo nhắc nhở
                            </div>
                          </div>
                          <div className="h-px bg-notion-border my-0.5" />

                          <button
                            type="button"
                            className="flex items-center gap-2.5 px-2.5 py-2 border-none bg-transparent text-notion-text text-[0.8rem] font-medium rounded-lg cursor-pointer transition-all duration-150 hover:bg-notion-hover w-full text-left"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenAnalytics?.();
                            }}
                          >
                            <BarChart3 size={15} className="text-notion-primary shrink-0" />
                            <span className="whitespace-nowrap">Thống kê & Quản lý dữ liệu</span>
                          </button>

                          <button
                            type="button"
                            className="flex items-center gap-2.5 px-2.5 py-2 border-none bg-transparent text-notion-text text-[0.8rem] font-medium rounded-lg cursor-pointer transition-all duration-150 hover:bg-notion-hover w-full text-left"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsNotificationModalOpen(true);
                            }}
                          >
                            <Bell size={15} className="text-notion-primary shrink-0" />
                            <span className="whitespace-nowrap">Cài đặt nhắc nhở học tập</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative shrink-0" ref={userMenuRef}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-[0.25rem] min-[360px]:gap-[0.35rem] sm:gap-[0.45rem] h-[27px] min-[360px]:h-[30px] sm:h-[34px] pl-0.5 min-[360px]:pl-1 sm:pl-1.5 pr-1 min-[360px]:pr-1.5 sm:pr-2.5 bg-white border border-notion-border rounded-full cursor-pointer transition-all duration-150 text-notion-text shadow-[0_1px_2px_rgba(0,0,0,0.04)] whitespace-nowrap hover:bg-notion-hover hover:border-notion-border-medium hover:-translate-y-px"
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        title="Hồ sơ tài khoản & Cài đặt"
                      >
                        {user.photoURL ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={user.photoURL}
                            alt={user.displayName || "User"}
                            className="w-[20px] h-[20px] min-[360px]:w-[22px] min-[360px]:h-[22px] sm:w-[26px] sm:h-[26px] rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-[20px] h-[20px] min-[360px]:w-[22px] min-[360px]:h-[22px] sm:w-[26px] sm:h-[26px] rounded-full bg-notion-hover text-notion-text flex items-center justify-center text-[0.68rem] min-[360px]:text-[0.72rem] sm:text-[0.75rem] font-bold shrink-0">
                            {(user.displayName || user.email || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-[0.78rem] sm:text-[0.82rem] font-semibold max-w-[70px] sm:max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap hidden sm:inline lg:hidden xl:inline">
                          {user.displayName?.split(" ")[0] || user.email?.split("@")[0]}
                        </span>
                        <Cloud size={11} className="min-[360px]:w-[13px] min-[360px]:h-[13px] text-notion-green-text shrink-0" />
                      </button>

                      {isUserMenuOpen && (
                        <div className="absolute top-[calc(100%+8px)] right-0 w-[275px] max-w-[calc(100vw-20px)] bg-white border border-notion-border rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-2 z-[200] flex flex-col gap-1 animate-fadeIn">
                          <div className="flex flex-col gap-0.5 px-2 py-1.5">
                            <div className="text-[0.85rem] font-bold text-notion-text">
                              {user.displayName || "Người học"}
                            </div>
                            <div className="text-[0.74rem] text-notion-secondary overflow-hidden text-ellipsis whitespace-nowrap">
                              {user.email}
                            </div>
                            <div className="flex items-center gap-1.5 text-[0.72rem] text-notion-green-text font-semibold mt-1.5 bg-notion-green-bg px-2 py-1 rounded-md">
                              <Cloud size={12} className="text-notion-green-text shrink-0" />
                              <span className="whitespace-nowrap">Đã đồng bộ Cloud Firestore</span>
                            </div>
                          </div>
                          <div className="h-px bg-notion-border my-0.5" />

                          {/* Thống kê & Quản lý dữ liệu */}
                          <button
                            type="button"
                            className="flex items-center gap-2.5 px-2.5 py-2 border-none bg-transparent text-notion-text text-[0.8rem] font-medium rounded-lg cursor-pointer transition-all duration-150 hover:bg-notion-hover w-full text-left"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenAnalytics?.();
                            }}
                          >
                            <BarChart3 size={15} className="text-notion-primary shrink-0" />
                            <span className="whitespace-nowrap">Thống kê & Quản lý dữ liệu</span>
                          </button>

                          {/* Nhắc nhở học tập */}
                          <button
                            type="button"
                            className="flex items-center gap-2.5 px-2.5 py-2 border-none bg-transparent text-notion-text text-[0.8rem] font-medium rounded-lg cursor-pointer transition-all duration-150 hover:bg-notion-hover w-full text-left"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsNotificationModalOpen(true);
                            }}
                          >
                            <Bell size={15} className="text-notion-primary shrink-0" />
                            <span className="whitespace-nowrap">Cài đặt nhắc nhở học tập</span>
                          </button>

                          <div className="h-px bg-notion-border my-0.5" />

                          {/* Đăng xuất */}
                          <button
                            type="button"
                            className="flex items-center gap-2.5 px-2.5 py-2 border-none bg-transparent text-notion-red-text text-[0.8rem] font-semibold rounded-lg cursor-pointer transition-all duration-150 hover:bg-notion-red-bg w-full text-left"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              logout();
                            }}
                          >
                            <LogOut size={15} className="shrink-0" />
                            <span className="whitespace-nowrap">Đăng xuất</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {/* End of Top Row on Mobile */}

          {/* Navigation Modes (Row 2 on Mobile & Tablet, Center column on Desktop) */}
          <nav
            className="lg:order-2 justify-self-center w-full sm:w-auto inline-flex items-center justify-between sm:justify-center bg-notion-surface-subtle p-1 sm:p-[3px] rounded-xl sm:rounded-full border border-notion-border gap-0.5 sm:gap-1 shrink-0"
            aria-label="Chế độ luyện tập"
          >
            <Link
              href="/luyen-noi"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-[0.38rem] rounded-lg sm:rounded-full border border-transparent text-[0.82rem] font-medium cursor-pointer transition-all duration-[180ms] shrink-0 no-underline whitespace-nowrap ${
                isShadowingActive
                  ? "text-notion-text bg-white font-semibold shadow-sm"
                  : "bg-transparent text-notion-secondary hover:text-notion-text hover:bg-white/60"
              }`}
              title="Luyện nói nhại (Shadowing) & Chấm điểm phát âm"
            >
              <Mic
                size={15}
                className={`transition-opacity duration-150 ${isShadowingActive ? "opacity-100 text-notion-primary" : "opacity-70"}`}
              />
              <span className="whitespace-nowrap text-[0.82rem] tracking-[-0.01em] hidden sm:inline">Shadowing</span>
            </Link>

            <Link
              href="/dien-tu"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-[0.38rem] rounded-lg sm:rounded-full border border-transparent text-[0.82rem] font-medium cursor-pointer transition-all duration-[180ms] shrink-0 no-underline whitespace-nowrap ${
                isBlanksActive
                  ? "text-notion-text bg-white font-semibold shadow-sm"
                  : "bg-transparent text-notion-secondary hover:text-notion-text hover:bg-white/60"
              }`}
              title="Điền vào chỗ trống & Nhớ lại chủ động"
            >
              <Puzzle
                size={15}
                className={`transition-opacity duration-150 ${isBlanksActive ? "opacity-100 text-notion-primary" : "opacity-70"}`}
              />
              <span className="whitespace-nowrap text-[0.82rem] tracking-[-0.01em] hidden sm:inline">Điền từ</span>
            </Link>

            <Link
              href="/phan-xa"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-[0.38rem] rounded-lg sm:rounded-full border border-transparent text-[0.82rem] font-medium cursor-pointer transition-all duration-[180ms] shrink-0 no-underline whitespace-nowrap ${
                isReflexActive
                  ? "text-notion-text bg-white font-semibold shadow-sm"
                  : "bg-transparent text-notion-secondary hover:text-notion-text hover:bg-white/60"
              }`}
              title="Luyện phản xạ dịch câu Việt sang Anh"
            >
              <Zap
                size={15}
                className={`transition-opacity duration-150 ${isReflexActive ? "opacity-100 text-notion-primary" : "opacity-70"}`}
              />
              <span className="whitespace-nowrap text-[0.82rem] tracking-[-0.01em] hidden sm:inline">Phản xạ</span>
            </Link>

            <Link
              href="/kho-tu-vung"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-[0.38rem] rounded-lg sm:rounded-full border border-transparent text-[0.82rem] font-medium cursor-pointer transition-all duration-[180ms] shrink-0 no-underline whitespace-nowrap ${
                isExplorerActive
                  ? "text-notion-text bg-white font-semibold shadow-sm"
                  : "bg-transparent text-notion-secondary hover:text-notion-text hover:bg-white/60"
              }`}
              title="Khám phá toàn bộ chủ đề & Kho từ vựng"
            >
              <BookOpen
                size={15}
                className={`transition-opacity duration-150 ${isExplorerActive ? "opacity-100 text-notion-primary" : "opacity-70"}`}
              />
              <span className="whitespace-nowrap text-[0.82rem] tracking-[-0.01em] hidden sm:inline">Kho từ vựng</span>
            </Link>

            <Link
              href="/youtube"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-[0.38rem] rounded-lg sm:rounded-full border border-transparent text-[0.82rem] font-medium cursor-pointer transition-all duration-[180ms] shrink-0 no-underline whitespace-nowrap ${
                isYouTubeActive
                  ? "text-notion-text bg-white font-semibold shadow-sm"
                  : "bg-transparent text-notion-secondary hover:text-notion-text hover:bg-white/60"
              }`}
              title="Luyện nói qua video YouTube tương tác"
            >
              <Video size={15} className="tab-icon text-notion-red" />
              <span className="whitespace-nowrap text-[0.82rem] tracking-[-0.01em] hidden sm:inline">YouTube</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Notification Settings Modal */}
      {isNotificationModalOpen && (
        <NotificationSettingsModal onClose={() => setIsNotificationModalOpen(false)} />
      )}
    </>
  );
}
