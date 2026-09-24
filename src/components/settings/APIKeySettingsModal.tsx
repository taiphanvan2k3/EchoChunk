"use client";

import React, { useState, useRef } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Download,
  Upload
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  encryptApiKey,
  hasMasterKey,
  downloadMasterKeyBackup,
  importMasterKeyBackup
} from "@/lib/client/crypto/apiKeyEncryption";
import { saveUserYTKey, deleteUserYTKey, StoredYTKey } from "@/lib/client/firebase/firestore/userYTKeys";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  storedKeys: StoredYTKey[];
  onKeysChanged: () => void;
}

export const APIKeySettingsModal: React.FC<Props> = ({ isOpen, onClose, storedKeys, onKeysChanged }) => {
  const { user } = useAuth();
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showBackupBanner, setShowBackupBanner] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "ok" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isNewDevice = !hasMasterKey() && storedKeys.length > 0;

  const handleAdd = async () => {
    if (!user?.uid) return;
    const key = newKey.trim();
    const label = newLabel.trim() || `API Key ${storedKeys.length + 1}`;
    if (!key) return;

    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const encrypted = await encryptApiKey(key);
      await saveUserYTKey(user.uid, label, encrypted);
      setNewKey("");
      setNewLabel("");
      setSuccessMsg("Đã lưu key thành công!");
      setShowBackupBanner(true); // ← nhắc download backup
      onKeysChanged();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      setErrorMsg("Lỗi khi lưu key. Vui lòng thử lại.");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!user?.uid) return;
    setDeletingId(keyId);
    try {
      await deleteUserYTKey(user.uid, keyId);
      onKeysChanged();
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await importMasterKeyBackup(file);
    setRestoreStatus(ok ? "ok" : "error");
    if (ok) onKeysChanged(); // re-decrypt with restored key
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setRestoreStatus("idle"), 4000);
  };

  return (
    <div className="yt-key-modal-backdrop" onClick={onClose}>
      <div
        className="yt-key-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt API Key"
      >
        {/* Header */}
        <div className="yt-key-modal-header">
          <div className="yt-key-modal-title-row">
            <KeyRound size={18} className="text-blue-600" />
            <h2 className="yt-key-modal-title">API Key của bạn</h2>
          </div>
          <button className="yt-key-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Security note */}
        <div className="yt-key-security-note">
          <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
          <p>
            Key của bạn được <strong>mã hóa ngay trên thiết bị</strong> trước khi lưu lên đám mây — chúng tôi không thể
            đọc được nó. Hãy giữ file backup để dùng lại trên thiết bị khác.
          </p>
        </div>

        {/* Warning khi đổi thiết bị */}
        {isNewDevice && (
          <div className="yt-key-device-warn">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p>
              Thiết bị này chưa có encryption key. Keys từ thiết bị cũ không giải mã được ở đây. Hãy{" "}
              <strong>khôi phục từ file backup</strong> bên dưới, hoặc thêm lại keys của bạn.
            </p>
          </div>
        )}

        {/* 🔔 Backup reminder banner — hiện ngay sau khi lưu key mới */}
        {showBackupBanner && (
          <div className="yt-key-backup-banner">
            <div className="yt-key-backup-banner-text">
              <Download size={15} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Tải file backup ngay!</p>
                <p className="text-xs opacity-80 mt-0.5">
                  File này chứa encryption key để khôi phục trên thiết bị khác. Giữ nó an toàn như password.
                </p>
              </div>
            </div>
            <div className="yt-key-backup-actions">
              <button type="button" className="yt-key-backup-download-btn" onClick={downloadMasterKeyBackup}>
                <Download size={13} />
                Tải backup
              </button>
              <button
                type="button"
                className="yt-key-backup-dismiss"
                onClick={() => setShowBackupBanner(false)}
                aria-label="Bỏ qua"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Existing keys list */}
        {storedKeys.length > 0 && (
          <div className="yt-key-list">
            <p className="yt-key-list-heading">Keys đã lưu ({storedKeys.length})</p>
            {storedKeys.map((k) => (
              <div key={k.id} className="yt-key-list-item">
                <div className="yt-key-item-info">
                  <span className="yt-key-item-label">{k.label}</span>
                  <span className="yt-key-item-masked">••••••••••••••••</span>
                </div>
                <button
                  className="yt-key-delete-btn"
                  onClick={() => handleDelete(k.id)}
                  disabled={deletingId === k.id}
                  aria-label={`Xóa ${k.label}`}
                >
                  {deletingId === k.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}

            {/* Download backup button khi đã có keys */}
            {!showBackupBanner && (
              <button type="button" className="yt-key-backup-btn" onClick={downloadMasterKeyBackup}>
                <Download size={13} />
                Tải file backup (dùng cho thiết bị mới)
              </button>
            )}
          </div>
        )}

        {/* Add new key form */}
        {!user ? (
          <p className="yt-key-login-msg">Đăng nhập để lưu API key.</p>
        ) : (
          <div className="yt-key-add-form">
            <p className="yt-key-list-heading">Thêm key mới</p>
            <input
              type="text"
              className="yt-key-input"
              placeholder="Tên gợi nhớ (VD: Account 1)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              maxLength={40}
            />
            <div className="yt-key-secret-wrap">
              <input
                type={showKey ? "text" : "password"}
                className="yt-key-input"
                placeholder="yk_live_..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
              <button
                type="button"
                className="yt-key-show-btn"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Ẩn key" : "Hiện key"}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {errorMsg && <p className="yt-key-error">{errorMsg}</p>}
            {successMsg && (
              <p className="yt-key-success">
                <CheckCircle2 size={14} />
                {successMsg}
              </p>
            )}

            <button type="button" className="yt-key-save-btn" disabled={!newKey.trim() || isSaving} onClick={handleAdd}>
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Đang mã hóa &amp; lưu...
                </>
              ) : (
                <>
                  <Plus size={14} /> Thêm key
                </>
              )}
            </button>
          </div>
        )}

        {/* Restore from backup */}
        <div className="yt-key-restore-section">
          <p className="yt-key-list-heading">Khôi phục từ file backup</p>
          <p className="yt-key-restore-desc">
            Nếu bạn đang dùng thiết bị mới, hãy upload file backup để giải mã lại các key đã lưu.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            id="restore-backup-input"
            onChange={handleRestoreFile}
          />
          <label htmlFor="restore-backup-input" className="yt-key-restore-btn">
            <Upload size={13} />
            Chọn file backup (.json)
          </label>
          {restoreStatus === "ok" && (
            <p className="yt-key-success mt-1">
              <CheckCircle2 size={14} />
              Khôi phục thành công! Keys của bạn đã sẵn sàng.
            </p>
          )}
          {restoreStatus === "error" && (
            <p className="yt-key-error mt-1">File không hợp lệ hoặc không phải backup của EchoChunk.</p>
          )}
        </div>

        {/* Footer */}
        <p className="yt-key-footer-hint">
          Lấy API key miễn phí tại{" "}
          <a
            href="https://ytranscript.com/developers"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            ytranscript.com
          </a>{" "}
          → API Access → Free (50 req/tháng/account)
        </p>
      </div>
    </div>
  );
};
