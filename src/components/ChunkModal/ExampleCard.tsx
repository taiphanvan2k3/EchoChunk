import React, { useState } from "react";
import {
  Volume2,
  Trash2,
  Wand2,
  Highlighter,
  Sparkles,
  Eraser,
  MessageSquare,
  AlertTriangle,
  PenLine,
  Eye
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
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

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

      {/* Tabbed Editor Box (Soạn thảo / Xem chi tiết) */}
      <div className="example-sentence-editor-box">
        {/* Editor Tab Bar */}
        <div className="example-editor-tabs-bar">
          <div className="example-editor-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "edit"}
              className={`example-editor-tab ${activeTab === "edit" ? "active" : ""}`}
              onClick={() => setActiveTab("edit")}
            >
              <PenLine size={13} />
              <span>Soạn thảo</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "preview"}
              className={`example-editor-tab ${activeTab === "preview" ? "active" : ""}`}
              onClick={() => setActiveTab("preview")}
            >
              <Eye size={13} />
              <span>Xem chi tiết</span>
            </button>
          </div>

          <span className="editor-toolbar-hint">
            {activeTab === "edit" ? "Enter để xuống dòng" : "Xem trước hiển thị câu khi học"}
          </span>
        </div>

        {/* Tab 1: Soạn thảo */}
        {activeTab === "edit" && (
          <div className="example-editor-edit-pane">
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
          </div>
        )}

        {/* Tab 2: Xem chi tiết */}
        {activeTab === "preview" && (
          <div className="example-editor-preview-pane">
            {ex.sentence.trim() ? (
              <div className="preview-main-quote">
                &ldquo;{formatMarkdown(ex.sentence)}&rdquo;
              </div>
            ) : (
              <div className="example-detail-empty">
                <p className="empty-text">Chưa có nội dung câu ví dụ để xem trước.</p>
              </div>
            )}
          </div>
        )}
      </div>

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
