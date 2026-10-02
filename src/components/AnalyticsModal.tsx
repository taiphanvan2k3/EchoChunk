"use client";

import { useState, ChangeEvent } from "react";
import { ChunkProgress, UserStats } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { exportBackupJSON, importBackupJSON } from "@/lib/client/storage";
import { soundManager } from "@/lib/client/sound";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  X,
  Flame,
  CheckCircle2,
  Download,
  Upload,
  BarChart3,
  ShieldCheck,
  BookOpen,
  Sparkles,
  AlertCircle,
  Cloud,
  CloudOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AnalyticsModalProps {
  onClose: () => void;
  stats: UserStats;
  progressMap: Record<string, ChunkProgress>;
  totalChunks: number;
  onReload: () => void;
}

export function AnalyticsModal({ onClose, stats, progressMap, totalChunks, onReload }: AnalyticsModalProps) {
  const { user } = useAuth();
  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const studiedChunks = Object.keys(progressMap).length;
  const masteredChunks = Object.values(progressMap).filter((p) => p.repetitions >= 3).length;
  const learningChunks = Math.max(0, studiedChunks - masteredChunks);
  const unlearnedChunks = Math.max(0, totalChunks - studiedChunks);
  const masteryPercentage = Math.round((studiedChunks / totalChunks) * 100) || 0;

  const handleExport = () => {
    soundManager.playSuccess();
    const dataStr = exportBackupJSON();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `echochunk_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importBackupJSON(content);
        if (ok) {
          setImportStatus({
            type: "success",
            message: "Khôi phục dữ liệu thành công! Tiến độ đã được nạp lại.",
          });
          soundManager.playSuccess();
          onReload();
        } else {
          setImportStatus({
            type: "error",
            message: "Tệp sao lưu không hợp lệ hoặc bị lỗi định dạng!",
          });
          soundManager.playError();
        }
      }
    };
    reader.readAsText(file);
  };

  useEscapeKey(onClose);
  useBodyScrollLock();

  return (
    <div
      className="fixed inset-0 bg-black/50 sm:backdrop-blur-[4px] z-[5000] flex sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white sm:border sm:border-gray-200/90 w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-[520px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Tiến độ học tập và thống kê cá nhân"
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-gray-100 bg-white/95 backdrop-blur shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <BarChart3 size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0 leading-tight truncate">
                Tiến Độ Học Tập
              </h2>
              <p className="text-[0.72rem] text-gray-500 m-0 hidden sm:block">
                Thống kê chuỗi ngày, độ ghi nhớ &amp; bài học
              </p>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 hover:text-gray-900 text-gray-400 border border-gray-200 flex items-center justify-center cursor-pointer transition-colors shrink-0 ml-2"
            onClick={onClose}
            title="Đóng (Esc)"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 sm:pb-6 space-y-4">
          {/* Cloud Sync Status Banner */}
          {user ? (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-900 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Cloud size={14} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-950">Đồng bộ Đám Mây</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <p className="text-[0.7rem] text-emerald-800/90 truncate m-0">
                    {user.email || user.displayName}
                  </p>
                </div>
              </div>
              <span className="text-[0.65rem] bg-emerald-100/90 text-emerald-800 font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2">
                Tự động lưu
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <CloudOff size={14} />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-amber-950">Chế độ Khách (Lưu trên máy này)</span>
                  <p className="text-[0.7rem] text-amber-800/90 truncate m-0">
                    Đăng nhập tài khoản để tự động lưu vĩnh viễn
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3 Hero Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {/* Card 1: Streak */}
            <div className="bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent border border-amber-200/80 rounded-xl p-3 sm:p-4 flex flex-col items-center text-center transition-all hover:border-amber-300">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1.5 shadow-xs">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-500 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight leading-none mb-1">
                {stats.streakDays}
                <span className="text-[0.7rem] sm:text-xs font-semibold text-amber-700 ml-0.5">ngày</span>
              </div>
              <div className="text-[0.72rem] sm:text-xs font-medium text-amber-900/80 leading-tight">
                Chuỗi học
              </div>
              <div className="mt-2 text-[0.62rem] sm:text-[0.68rem] px-1.5 py-0.5 rounded-md bg-amber-100/80 text-amber-800 font-semibold whitespace-nowrap">
                {stats.streakDays > 0 ? "🔥 Giữ lửa" : "Bắt đầu ngay"}
              </div>
            </div>

            {/* Card 2: Today Reviewed */}
            <div className="bg-gradient-to-b from-sky-500/10 via-blue-500/5 to-transparent border border-sky-200/80 rounded-xl p-3 sm:p-4 flex flex-col items-center text-center transition-all hover:border-sky-300">
              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mb-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-sky-950 tracking-tight leading-none mb-1">
                {stats.todayReviewedCount}
                <span className="text-[0.7rem] sm:text-xs font-semibold text-sky-700 ml-0.5">câu</span>
              </div>
              <div className="text-[0.72rem] sm:text-xs font-medium text-sky-900/80 leading-tight">
                Đã ôn hôm nay
              </div>
              <div className="mt-2 text-[0.62rem] sm:text-[0.68rem] px-1.5 py-0.5 rounded-md bg-sky-100/80 text-sky-800 font-semibold whitespace-nowrap">
                Mục tiêu {stats.dailyGoal || 20}
              </div>
            </div>

            {/* Card 3: Mastered */}
            <div className="bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/80 rounded-xl p-3 sm:p-4 flex flex-col items-center text-center transition-all hover:border-emerald-300">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1.5 shadow-xs">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight leading-none mb-1">
                {masteredChunks}
                <span className="text-[0.7rem] sm:text-xs font-semibold text-emerald-700 ml-0.5">câu</span>
              </div>
              <div className="text-[0.72rem] sm:text-xs font-medium text-emerald-900/80 leading-tight">
                Đã thuộc lòng
              </div>
              <div className="mt-2 text-[0.62rem] sm:text-[0.68rem] px-1.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 font-semibold whitespace-nowrap">
                Ôn ≥ 3 lần
              </div>
            </div>
          </div>

          {/* Progress & Breakdown Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <BookOpen size={15} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                    Độ phủ kho Chunks
                  </h3>
                  <p className="text-[0.72rem] text-gray-500 leading-tight mt-0.5">
                    {studiedChunks} đã tiếp cận / {totalChunks} tổng số câu
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                <Sparkles size={12} className="text-blue-500" />
                <span>{masteryPercentage}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 bg-gray-200/80 rounded-full p-0.5 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(masteryPercentage, 2))}%` }}
              />
            </div>

            {/* 3 Categories Breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-200/60">
              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white border border-gray-200/60 shadow-xs">
                <div className="flex items-center gap-1 text-[0.68rem] text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Thuộc lòng</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5">
                  {masteredChunks} câu
                </span>
              </div>

              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white border border-gray-200/60 shadow-xs">
                <div className="flex items-center gap-1 text-[0.68rem] text-amber-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Đang ôn</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5">
                  {learningChunks} câu
                </span>
              </div>

              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white border border-gray-200/60 shadow-xs">
                <div className="flex items-center gap-1 text-[0.68rem] text-gray-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                  <span>Chưa học</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5">
                  {unlearnedChunks} câu
                </span>
              </div>
            </div>
          </div>

          {/* Collapsible Backup & Restore (Tùy chọn sao lưu dự phòng cá nhân) */}
          <div className="border border-gray-200/80 rounded-xl overflow-hidden bg-gray-50/50">
            <button
              type="button"
              onClick={() => setShowBackupOptions((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 transition-colors cursor-pointer"
            >
              <span>Tùy chọn tải sao lưu offline (JSON dự phòng)</span>
              {showBackupOptions ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showBackupOptions && (
              <div className="p-3.5 pt-1 border-t border-gray-200/60 bg-white space-y-3 animate-[fadeIn_0.15s_ease]">
                <p className="text-[0.72rem] text-gray-500 m-0 leading-relaxed">
                  {user
                    ? "Dữ liệu của bạn đã được tự động lưu lên đám mây theo tài khoản Google. Bạn chỉ cần tải file JSON nếu muốn giữ một bản sao lưu ngoại tuyến trên máy tính."
                    : "Bạn đang ở chế độ Khách. Bạn có thể xuất file JSON để lưu giữ tiến độ nếu chưa muốn đăng nhập tài khoản."}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    <Download size={14} className="text-blue-600" />
                    <span>Xuất file JSON</span>
                  </button>

                  <label className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs">
                    <Upload size={14} className="text-purple-600" />
                    <span>Nạp file JSON</span>
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>

                {importStatus && (
                  <div
                    className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs font-medium ${
                      importStatus.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {importStatus.type === "success" ? (
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle size={15} className="text-rose-600 shrink-0" />
                    )}
                    <span>{importStatus.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


