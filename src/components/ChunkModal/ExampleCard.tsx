"use client";

import { useState } from "react";
import {
  Volume2,
  Trash2,
  Wand2,
  Highlighter,
  Sparkles,
  Eraser,
  MessageSquare,
  AlertTriangle,
  Eye,
  Edit3
} from "lucide-react";
import { formatMarkdown } from "@/lib/shared/formatMarkdown";
import { ModalExampleItem } from "@/hooks/useChunkEditor";

interface ExampleCardProps {
  ex: ModalExampleItem;
  index: number;
  totalCount: number;
  chunkText: string;
  showWarning: boolean;
  textareaRef: (el: HTMLTextAreaElement | null) => void;
  onSentenceChange: (index: number, val: string) => void;
  onIpaChange: (index: number, val: string) => void;
  onForceIpa: (index: number) => void;
  onTranslationChange: (index: number, val: string) => void;
  onContextChange: (index: number, val: string) => void;
  onRemove: (index: number) => void;
  onTestAudio: (text: string) => void;
  onToggleHighlight: (index: number) => void;
  onAutoHighlight: (index: number) => void;
  onClearHighlight: (index: number) => void;
}

export function ExampleCard({
  ex,
  index,
  totalCount,
  chunkText,
  showWarning,
  textareaRef,
  onSentenceChange,
  onIpaChange,
  onForceIpa,
  onTranslationChange,
  onContextChange,
  onRemove,
  onTestAudio,
  onToggleHighlight,
  onAutoHighlight,
  onClearHighlight
}: ExampleCardProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  return (
    <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all">
      {/* Card Header: Badge + Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
          <MessageSquare size={13} className="shrink-0" />
          <span>Câu ví dụ #{index + 1}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-gray-200 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
            onClick={() => onTestAudio(ex.sentence)}
            title="Nghe thử phát âm câu ví dụ này"
          >
            <Volume2 size={13} />
            <span>Nghe thử</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 transition-colors cursor-pointer"
            onClick={() => setActiveTab(activeTab === "edit" ? "preview" : "edit")}
            title={activeTab === "edit" ? "Xem trước câu khi học" : "Chuyển sang soạn thảo"}
          >
            {activeTab === "edit" ? (
              <>
                <Eye size={13} />
                <span className="hidden sm:inline">Xem trước</span>
              </>
            ) : (
              <>
                <Edit3 size={13} />
                <span className="hidden sm:inline">Soạn thảo</span>
              </>
            )}
          </button>

          {totalCount > 1 && (
            <button
              type="button"
              className="inline-flex items-center text-xs font-semibold text-red-500 hover:text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg p-1 transition-colors cursor-pointer"
              onClick={() => onRemove(index)}
              title="Xóa câu ví dụ này"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Sentence Editor or Preview */}
      {activeTab === "edit" ? (
        <div className="bg-white border border-gray-200 focus-within:border-blue-500 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent border-0 p-3 text-sm text-gray-900 leading-relaxed placeholder:text-gray-400 outline-none resize-none min-h-[72px]"
            rows={2}
            placeholder={`Ví dụ #${index + 1}: Nhập câu ví dụ tiếng Anh... (bấm Enter để xuống dòng nếu hội thoại)`}
            value={ex.sentence}
            onChange={(e) => onSentenceChange(index, e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
                e.preventDefault();
                onToggleHighlight(index);
              }
            }}
          />

          {/* Highlight Toolbar */}
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 px-2.5 py-1.5 gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.75rem] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-colors cursor-pointer"
                onClick={() => onToggleHighlight(index)}
                title="Bôi đen chữ rồi bấm (hoặc Ctrl+B) để highlight cụm từ"
              >
                <Highlighter size={12} />
                <span>Highlight cụm</span>
                <kbd className="hidden sm:inline font-mono text-[0.62rem] opacity-70 ml-0.5">Ctrl+B</kbd>
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.75rem] font-medium bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 transition-colors cursor-pointer disabled:opacity-40"
                onClick={() => onAutoHighlight(index)}
                disabled={!chunkText.trim()}
                title={
                  chunkText.trim()
                    ? `Tự động tìm và bôi đậm cụm "${chunkText}" trong câu`
                    : "Cần nhập cụm từ trước"
                }
              >
                <Sparkles size={12} />
                <span>Tự tìm cụm</span>
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.75rem] font-medium bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 transition-colors cursor-pointer"
                onClick={() => onClearHighlight(index)}
                title="Xóa toàn bộ ký tự highlight"
              >
                <Eraser size={12} />
                <span className="hidden sm:inline">Bỏ highlight</span>
              </button>
            </div>
            <span className="text-[0.7rem] text-gray-400 hidden sm:inline select-none">
              Enter để xuống dòng
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-white rounded-lg border border-gray-200 font-serif text-[0.95rem] leading-relaxed text-gray-900 whitespace-pre-line min-h-[64px] flex items-center">
          {ex.sentence.trim() ? (
            <div>&ldquo;{formatMarkdown(ex.sentence)}&rdquo;</div>
          ) : (
            <span className="text-gray-400 text-xs italic">Chưa có nội dung câu ví dụ để xem trước.</span>
          )}
        </div>
      )}

      {/* Sentence IPA */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-600">
          Phiên âm IPA câu ví dụ:
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 bg-white border border-gray-200 focus:border-blue-500 rounded-lg h-9 px-3 font-ipa text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-400 transition-all"
            placeholder="Tự động sinh khi gõ câu... (hoặc tự chỉnh sửa)"
            value={ex.sentenceIpa}
            onChange={(e) => onIpaChange(index, e.target.value)}
          />
          {ex.sentence.trim() && (
            <button
              type="button"
              onClick={() => onForceIpa(index)}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
              title="Tự động đồng bộ lại phiên âm IPA cho câu ví dụ này"
            >
              <Wand2 size={13} />
              <span>Tạo lại IPA</span>
            </button>
          )}
        </div>
      </div>

      {/* Translation */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-600">
          Dịch nghĩa tiếng Việt:
        </label>
        <textarea
          rows={2}
          className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg p-2.5 text-sm text-gray-900 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-400 transition-all resize-y min-h-[52px]"
          placeholder="Dịch nghĩa câu ví dụ (hỗ trợ bấm Enter xuống dòng)..."
          value={ex.translation}
          onChange={(e) => onTranslationChange(index, e.target.value)}
        />
      </div>

      {/* Context Note */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">
          Ghi chú ngữ cảnh (tùy chọn):
        </label>
        <textarea
          rows={2}
          className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg p-2.5 text-sm text-gray-900 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-400 transition-all resize-y min-h-[52px]"
          placeholder="VD: Dùng trong email công việc hoặc khi trao đổi ngắn... (hỗ trợ bấm Enter xuống dòng)"
          value={ex.context}
          onChange={(e) => onContextChange(index, e.target.value)}
        />
      </div>

      {/* Chunk-in-sentence Warning */}
      {showWarning && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
          <span>
            Gợi ý: Câu ví dụ nên chứa cụm từ <strong>&quot;{chunkText}&quot;</strong> để các bài tập phản xạ hoạt động chuẩn xác nhất.
          </span>
        </div>
      )}
    </div>
  );
}
