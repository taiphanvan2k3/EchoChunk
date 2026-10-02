'use client';

import { useState, ChangeEvent } from 'react';
import { ChunkProgress, UserStats } from '@/types';
import { exportBackupJSON, importBackupJSON } from '@/lib/client/storage';
import { soundManager } from '@/lib/client/sound';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { X, Flame, CheckCircle, Download, Upload, BarChart2, ShieldCheck, ArrowLeft } from 'lucide-react';

interface AnalyticsModalProps {
  onClose: () => void;
  stats: UserStats;
  progressMap: Record<string, ChunkProgress>;
  totalChunks: number;
  onReload: () => void;
}

export function AnalyticsModal({
  onClose,
  stats,
  progressMap,
  totalChunks,
  onReload,
}: AnalyticsModalProps) {
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const studiedChunks = Object.keys(progressMap).length;
  const masteredChunks = Object.values(progressMap).filter((p) => p.repetitions >= 3).length;
  const masteryPercentage = Math.round((studiedChunks / totalChunks) * 100) || 0;

  const handleExport = () => {
    soundManager.playSuccess();
    const dataStr = exportBackupJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `echochunk_backup_${new Date().toISOString().split('T')[0]}.json`;
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
          setImportStatus('✅ Khôi phục dữ liệu thành công!');
          soundManager.playSuccess();
          onReload();
        } else {
          setImportStatus('❌ Tệp sao lưu không hợp lệ!');
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
        className="bg-notion-surface sm:border sm:border-notion-border w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-[520px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-gray-100 bg-white/95 backdrop-blur shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 select-none">
              <BarChart2 size={17} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 m-0 leading-tight truncate">
                Tiến Độ &amp; Đồng Bộ
              </h3>
              <p className="text-[0.7rem] text-gray-500 m-0 hidden sm:block">
                Thống kê học tập cá nhân &amp; sao lưu
              </p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 hover:text-gray-900 text-gray-400 border border-gray-200 flex items-center justify-center cursor-pointer transition-colors shrink-0 ml-2"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 sm:pb-6 space-y-5">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <div className="bg-notion-surface-subtle border border-notion-border rounded-lg p-2.5 sm:p-3.5 text-center">
              <Flame className="mx-auto text-notion-orange-text w-5 h-5 sm:w-6 sm:h-6" />
              <div className="text-[1.05rem] sm:text-[1.2rem] font-extrabold text-notion-text my-1">{stats.streakDays} ngày</div>
              <div className="text-[0.68rem] sm:text-[0.72rem] text-notion-secondary leading-tight">Chuỗi học</div>
            </div>

            <div className="bg-notion-surface-subtle border border-notion-border rounded-lg p-2.5 sm:p-3.5 text-center">
              <CheckCircle className="mx-auto text-notion-primary w-5 h-5 sm:w-6 sm:h-6" />
              <div className="text-[1.05rem] sm:text-[1.2rem] font-extrabold text-notion-text my-1">{stats.todayReviewedCount}</div>
              <div className="text-[0.68rem] sm:text-[0.72rem] text-notion-secondary leading-tight">Đã ôn hôm nay</div>
            </div>

            <div className="bg-notion-surface-subtle border border-notion-border rounded-lg p-2.5 sm:p-3.5 text-center">
              <ShieldCheck className="mx-auto text-notion-green-text w-5 h-5 sm:w-6 sm:h-6" />
              <div className="text-[1.05rem] sm:text-[1.2rem] font-extrabold text-notion-text my-1 leading-tight">{masteredChunks} / {studiedChunks}</div>
              <div className="text-[0.68rem] sm:text-[0.72rem] text-notion-secondary leading-tight">Đã thuộc (≥3)</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-[0.82rem] text-notion-secondary mb-1.5">
              <span>Tiến độ bao phủ kho Chunks:</span>
              <span className="font-semibold text-notion-text">{studiedChunks} / {totalChunks} ({masteryPercentage}%)</span>
            </div>
            <div className="h-2 bg-notion-active rounded-full overflow-hidden">
              <div className="h-full bg-notion-primary rounded-full transition-all duration-300" style={{ width: `${masteryPercentage}%` }}></div>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="border-t border-notion-border pt-4">
            <h4 className="text-[0.92rem] font-bold text-notion-text mb-1">Sao Lưu &amp; Khôi Phục (Local-First):</h4>
            <p className="text-[0.78rem] text-notion-muted mb-3.5 leading-relaxed">
              Tiến độ học tập và chuỗi ngày của bạn được lưu an toàn trên trình duyệt. Bạn có thể xuất tệp JSON để đồng bộ giữa các thiết bị.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                className="flex-1 justify-center inline-flex items-center gap-2 py-2.5 px-3.5 rounded-lg border border-notion-border-medium bg-white text-notion-text text-sm font-semibold hover:bg-notion-hover transition-all cursor-pointer shadow-sm"
                onClick={handleExport}
              >
                <Download size={16} />
                <span>Xuất tệp sao lưu (JSON)</span>
              </button>

              <label className="flex-1 justify-center inline-flex items-center gap-2 py-2.5 px-3.5 rounded-lg border border-notion-border-medium bg-white text-notion-text text-sm font-semibold hover:bg-notion-hover transition-all cursor-pointer shadow-sm">
                <Upload size={16} />
                <span>Nhập tệp sao lưu</span>
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
            </div>

            {importStatus && <p className="mt-2.5 text-[0.82rem] text-center font-medium">{importStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
