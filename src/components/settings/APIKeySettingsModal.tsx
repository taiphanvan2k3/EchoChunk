"use client";

import { useState, useRef, ChangeEvent } from "react";
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
  Upload,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
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

export function APIKeySettingsModal({ isOpen, onClose, storedKeys, onKeysChanged }: Props) {
  useEscapeKey(onClose);
  useBodyScrollLock(isOpen);

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

  const handleRestoreFile = async (e: ChangeEvent<HTMLInputElement>) => {
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
    <div
      className="fixed inset-0 bg-black/50 sm:backdrop-blur-[3px] z-[9000] flex sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-[480px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt API Key"
      >
        {/* Header - Sticky on top */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-gray-100 bg-white/95 backdrop-blur shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 select-none">
              <KeyRound size={17} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0 leading-tight truncate">API Key của bạn</h2>
              <p className="text-[0.7rem] text-gray-500 m-0 hidden sm:block">Quản lý và mã hóa khóa cá nhân an toàn</p>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 hover:text-gray-900 text-gray-400 border border-gray-200 flex items-center justify-center cursor-pointer transition-colors shrink-0 ml-2"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 pb-12 sm:pb-6">

        {/* Security note */}
        <div className="flex gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[0.8rem] text-emerald-800 leading-relaxed">
          <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
          <p>
            Key của bạn được <strong>mã hóa ngay trên thiết bị</strong> trước khi lưu lên đám mây — chúng tôi không thể
            đọc được nó. Hãy giữ file backup để dùng lại trên thiết bị khác.
          </p>
        </div>

        {/* Warning khi đổi thiết bị */}
        {isNewDevice && (
          <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[0.8rem] text-amber-800 leading-relaxed">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p>
              Thiết bị này chưa có encryption key. Keys từ thiết bị cũ không giải mã được ở đây. Hãy{" "}
              <strong>khôi phục từ file backup</strong> bên dưới, hoặc thêm lại keys của bạn.
            </p>
          </div>
        )}

        {/* 🔔 Backup reminder banner — hiện ngay sau khi lưu key mới */}
        {showBackupBanner && (
          <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-blue-700 to-blue-600 rounded-xl p-3.5 text-white animate-[fadeIn_0.25s_ease]">
            <div className="flex items-start gap-2 flex-1 text-[0.85rem] leading-snug">
              <Download size={15} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Tải file backup ngay!</p>
                <p className="text-xs opacity-80 mt-0.5">
                  File này chứa encryption key để khôi phục trên thiết bị khác. Giữ nó an toàn như password.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/50 hover:border-white text-white rounded-lg py-1.5 px-3 text-[0.8rem] font-bold cursor-pointer transition-colors whitespace-nowrap"
                onClick={downloadMasterKeyBackup}
              >
                <Download size={13} />
                Tải backup
              </button>
              <button
                type="button"
                className="bg-white/15 hover:bg-white/25 text-white/80 hover:text-white border-none rounded-md w-[26px] h-[26px] flex items-center justify-center cursor-pointer transition-colors"
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
          <div className="flex flex-col gap-1.5">
            <p className="text-[0.8rem] font-bold text-gray-700 uppercase tracking-wider mb-1">Keys đã lưu ({storedKeys.length})</p>
            {storedKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[0.85rem] font-semibold text-gray-900">{k.label}</span>
                  <span className="text-[0.75rem] text-gray-400 tracking-wider font-mono">••••••••••••••••</span>
                </div>
                <button
                  type="button"
                  className="bg-transparent hover:bg-red-100 text-gray-400 hover:text-red-600 border-none p-1.5 rounded-md cursor-pointer flex items-center transition-colors disabled:opacity-50"
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
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 bg-transparent hover:bg-blue-50 border-1.5 border-dashed border-gray-300 hover:border-blue-600 text-gray-500 hover:text-blue-600 rounded-lg py-2 px-3.5 text-[0.78rem] font-semibold cursor-pointer w-full transition-colors mt-1"
                onClick={downloadMasterKeyBackup}
              >
                <Download size={13} />
                Tải file backup (dùng cho thiết bị mới)
              </button>
            )}
          </div>
        )}

        {/* Add new key form */}
        {!user ? (
          <p className="text-[0.85rem] text-gray-500 text-center my-2">Đăng nhập để lưu API key.</p>
        ) : (
          <div className="flex flex-col gap-2.5 border-t border-gray-100 pt-4">
            <p className="text-[0.8rem] font-bold text-gray-700 uppercase tracking-wider mb-1">Thêm key mới</p>
            <input
              type="text"
              className="w-full py-2 px-3.5 border border-gray-200 focus:border-blue-300 rounded-lg text-[0.85rem] text-gray-900 bg-gray-50 focus:bg-white outline-none transition-colors box-border focus:ring-2 focus:ring-blue-500/20"
              placeholder="Tên gợi nhớ (VD: Account 1)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              maxLength={40}
            />
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                className="w-full py-2 pl-3.5 pr-[2.4rem] border border-gray-200 focus:border-blue-300 rounded-lg text-[0.85rem] text-gray-900 bg-gray-50 focus:bg-white outline-none transition-colors box-border focus:ring-2 focus:ring-blue-500/20 font-mono tracking-wider"
                placeholder="yk_live_..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400 hover:text-gray-700 flex items-center p-1 rounded transition-colors"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Ẩn key" : "Hiện key"}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {errorMsg && <p className="text-[0.8rem] text-red-600 m-0">{errorMsg}</p>}
            {successMsg && (
              <p className="text-[0.8rem] text-emerald-600 m-0 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                {successMsg}
              </p>
            )}

            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-55 disabled:cursor-not-allowed text-white border-none rounded-lg py-2.5 px-4 text-[0.85rem] font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow active:scale-[0.99]"
              disabled={!newKey.trim() || isSaving}
              onClick={handleAdd}
            >
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
        <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
          <p className="text-[0.8rem] font-bold text-gray-700 uppercase tracking-wider mb-1">Khôi phục từ file backup</p>
          <p className="text-[0.8rem] text-gray-500 m-0 leading-relaxed">
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
          <label htmlFor="restore-backup-input" className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 rounded-lg py-2 px-3.5 text-[0.82rem] font-semibold cursor-pointer transition-colors w-fit">
            <Upload size={13} />
            Chọn file backup (.json)
          </label>
          {restoreStatus === "ok" && (
            <p className="text-[0.8rem] text-emerald-600 m-0 flex items-center gap-1.5 mt-1">
              <CheckCircle2 size={14} />
              Khôi phục thành công! Keys của bạn đã sẵn sàng.
            </p>
          )}
          {restoreStatus === "error" && (
            <p className="text-[0.8rem] text-red-600 m-0 mt-1">File không hợp lệ hoặc không phải backup của EchoChunk.</p>
          )}
        </div>

        {/* Footer */}
        <p className="text-[0.77rem] text-gray-400 m-0 border-t border-gray-100 pt-3 leading-relaxed">
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
    </div>
  );
}

