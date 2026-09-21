"use client";

import React from "react";
import { Volume2, Trash2, Wand2, Highlighter, Sparkles, Eraser, MessageSquare, AlertTriangle } from "lucide-react";
import { formatMarkdown } from "@/lib/formatMarkdown";
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

export const ExampleCard: React.FC<ExampleCardProps> = ({
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
}) => {
  return (
    <div className="notion-callout-editor notion-example-item-card">
      {/* Card header */}
      <div className="callout-editor-header">
        <div className="callout-label-row">
          <MessageSquare size={15} className="callout-icon" />
          <span className="callout-title">Câu ví dụ thực tế #{index + 1}</span>
        </div>
        <div className="callout-actions-row">
          <button
            type="button"
            className="callout-listen-btn"
            onClick={() => onTestAudio(ex.sentence)}
            title="Nghe thử phát âm câu ví dụ này"
          >
            <Volume2 size={14} />
            <span>Nghe thử</span>
          </button>
          {totalCount > 1 && (
            <button
              type="button"
              className="callout-remove-btn"
              onClick={() => onRemove(index)}
              title="Xóa câu ví dụ này"
            >
              <Trash2 size={14} />
              <span>Xóa</span>
            </button>
          )}
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="example-editor-toolbar">
        <div className="editor-toolbar-actions">
          <button
            type="button"
            className="editor-toolbar-btn highlight"
            onClick={() => onToggleHighlight(index)}
            title="Bôi đen chữ rồi bấm (hoặc bấm phím tắt Ctrl+B) để highlight cụm từ"
          >
            <Highlighter size={13} />
            <span>Highlight cụm</span>
            <kbd className="toolbar-kbd">Ctrl+B</kbd>
          </button>

          <button
            type="button"
            className="editor-toolbar-btn auto"
            onClick={() => onAutoHighlight(index)}
            disabled={!chunkText.trim()}
            title={
              chunkText.trim()
                ? `Tự động tìm và bôi đậm cụm "${chunkText}" trong câu`
                : "Cần nhập cụm từ trước"
            }
          >
            <Sparkles size={13} />
            <span>Tự tìm cụm</span>
          </button>

          <button
            type="button"
            className="editor-toolbar-btn clear"
            onClick={() => onClearHighlight(index)}
            title="Xóa toàn bộ ký tự định dạng (** hoặc `)"
          >
            <Eraser size={13} />
            <span>Bỏ highlight</span>
          </button>
        </div>
        <span className="editor-toolbar-hint">Enter để xuống dòng</span>
      </div>

      {/* Main sentence textarea */}
      <textarea
        ref={textareaRef}
        className="notion-callout-textarea"
        rows={3}
        placeholder={`Ví dụ #${index + 1}: Bấm Enter thoải mái để xuống dòng (hỗ trợ câu hội thoại nhiều người)...`}
        value={ex.sentence}
        onChange={(e) => onSentenceChange(index, e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            onToggleHighlight(index);
          }
        }}
      />

      {/* Live preview */}
      {ex.sentence.trim() && (
        <div className="example-live-preview">
          <div className="preview-label-row">
            <span className="preview-label">👁️ Xem trước câu:</span>
            <span className="preview-hint">Cụm được bôi đậm sẽ hiển thị thế này khi học</span>
          </div>
          <div className="preview-bubble">&ldquo;{formatMarkdown(ex.sentence)}&rdquo;</div>
        </div>
      )}

      {/* Sentence IPA row */}
      <div className="callout-sentence-ipa-row">
        <div className="callout-sentence-ipa-label">
          <span>🔤</span>
          <span>Phiên âm IPA câu ví dụ (tự sinh khi gõ):</span>
        </div>
        <div className="callout-sentence-ipa-input-wrap">
          <input
            type="text"
            className="notion-inline-input callout-sentence-ipa-input flex-1"
            placeholder="Tự động sinh khi gõ câu ví dụ... (hoặc tự chỉnh sửa)"
            value={ex.sentenceIpa}
            onChange={(e) => onIpaChange(index, e.target.value)}
          />
          {ex.sentence.trim() && (
            <button
              type="button"
              onClick={() => onForceIpa(index)}
              className="notion-btn-inline-action"
              title="Tự động đồng bộ lại phiên âm IPA cho câu ví dụ này"
            >
              <Wand2 size={13} />
              <span>Tạo lại IPA</span>
            </button>
          )}
        </div>
      </div>

      {/* Translation & context */}
      <div className="notion-example-meta-fields">
        <div className="sub-field">
          <label className="sub-field-label">🇻🇳 Dịch nghĩa câu ví dụ #{index + 1}:</label>
          <textarea
            rows={2}
            className="notion-sub-input notion-sub-textarea"
            placeholder="Dịch nghĩa câu (có thể bấm Enter xuống dòng theo từng câu/nhân vật)..."
            value={ex.translation}
            onChange={(e) => onTranslationChange(index, e.target.value)}
          />
        </div>

        <div className="sub-field">
          <label className="sub-field-label">💡 Ghi chú ngữ cảnh (tùy chọn):</label>
          <textarea
            rows={1}
            className="notion-sub-input notion-sub-textarea"
            placeholder="Ví dụ: Thường dùng trong email công việc hoặc khi trao đổi ngắn..."
            value={ex.context}
            onChange={(e) => onContextChange(index, e.target.value)}
          />
        </div>
      </div>

      {/* Chunk-in-sentence warning */}
      {showWarning && (
        <div className="chunk-context-hint">
          <AlertTriangle size={14} className="shrink-0 text-amber-600" />
          <span>
            Gợi ý: Câu ví dụ nên chứa cụm từ <strong>&quot;{chunkText}&quot;</strong> để bài tập nhại câu và điền từ
            hoạt động chuẩn xác nhất.
          </span>
        </div>
      )}
    </div>
  );
};
