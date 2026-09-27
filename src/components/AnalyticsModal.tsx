'use client';

import React, { useState } from 'react';
import { ChunkProgress, UserStats } from '@/types';
import { exportBackupJSON, importBackupJSON } from '@/lib/client/storage';
import { soundManager } from '@/lib/client/sound';
import { X, Flame, CheckCircle, Download, Upload, BarChart2, ShieldCheck } from 'lucide-react';

interface AnalyticsModalProps {
  onClose: () => void;
  stats: UserStats;
  progressMap: Record<string, ChunkProgress>;
  totalChunks: number;
  onReload: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  onClose,
  stats,
  progressMap,
  totalChunks,
  onReload,
}) => {
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <BarChart2 className="modal-icon" size={22} />
            <h3 className="modal-title">Tiến Độ & Đồng Bộ Dữ Liệu</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="modal-stats-grid">
          <div className="stat-card">
            <Flame className="stat-card-icon streak" size={24} />
            <div className="stat-card-val">{stats.streakDays} ngày</div>
            <div className="stat-card-label">Chuỗi học liên tục</div>
          </div>

          <div className="stat-card">
            <CheckCircle className="stat-card-icon count" size={24} />
            <div className="stat-card-val">{stats.todayReviewedCount}</div>
            <div className="stat-card-label">Đã ôn hôm nay</div>
          </div>

          <div className="stat-card">
            <ShieldCheck className="stat-card-icon master" size={24} />
            <div className="stat-card-val">{masteredChunks} / {studiedChunks}</div>
            <div className="stat-card-label">Đã thuộc vững (≥ 3 lần)</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-label-row">
            <span>Tiến độ bao phủ kho Chunks:</span>
            <span className="progress-perc">{studiedChunks} / {totalChunks} ({masteryPercentage}%)</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${masteryPercentage}%` }}></div>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="backup-section">
          <h4 className="backup-title">Sao Lưu & Khôi Phục (Local-First):</h4>
          <p className="backup-desc">
            Tiến độ học tập và chuỗi ngày của bạn được lưu an toàn trên trình duyệt. Bạn có thể xuất tệp JSON để đồng bộ giữa các máy tính.
          </p>

          <div className="backup-actions-row">
            <button className="action-btn backup-btn" onClick={handleExport}>
              <Download size={16} />
              <span>Xuất tệp sao lưu (JSON)</span>
            </button>

            <label className="action-btn restore-btn">
              <Upload size={16} />
              <span>Nhập tệp sao lưu</span>
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          </div>

          {importStatus && <p className="import-status-text">{importStatus}</p>}
        </div>
      </div>
    </div>
  );
};
