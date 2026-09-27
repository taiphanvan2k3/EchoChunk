"use client";

import React from "react";
import { SpeakingChunk, TopicMeta } from "@/types";
import { X, Save, Trash2, ChevronDown, AlertCircle, Wand2, Plus } from "lucide-react";
import { useChunkEditor } from "@/hooks/useChunkEditor";
import { TopicDropdown } from "@/components/ChunkModal/TopicDropdown";
import { ExampleCard } from "@/components/ChunkModal/ExampleCard";

interface ChunkModalProps {
  onClose: () => void;
  onSave: (chunk: SpeakingChunk) => void;
  onDelete?: (chunkId: string) => void;
  chunkToEdit?: SpeakingChunk | null;
  existingTopics: TopicMeta[];
}

export const ChunkModal: React.FC<ChunkModalProps> = ({
  onClose,
  onSave,
  onDelete,
  chunkToEdit,
  existingTopics
}) => {
  const editor = useChunkEditor({ chunkToEdit, existingTopics, onSave, onDelete, onClose });

  const {
    isEditing,
    chunkText,
    handleChunkTextChange,
    meaning,
    setMeaning,
    chunkIpa,
    handleChunkIpaChange,
    handleForceGenerateChunkIpa,
    examples,
    errorMessage,
    showAdvanced,
    setShowAdvanced,
    isTopicMenuOpen,
    setIsTopicMenuOpen,
    topicId,
    setTopicId,
    topicDropdownRef,
    textareaRefs,
    currentSelectedTopic,
    handleExampleSentenceChange,
    handleExampleIpaChange,
    handleForceGenerateExampleIpa,
    handleExampleTranslationChange,
    handleExampleContextChange,
    handleAddExample,
    handleRemoveExample,
    handleTestAudio,
    handleToggleHighlight,
    handleAutoHighlightChunk,
    handleClearHighlight,
    isChunkInSentence,
    handleSave,
    handleDelete
  } = editor;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notion-page-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="notion-modal-top">
          <div className="notion-page-icon-badge">
            <span>🗣️</span>
          </div>
          <button className="notion-modal-close" onClick={onClose} title="Đóng (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="notion-form-alert">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleSave}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleSave(e);
            }
          }}
          className="notion-page-form"
        >
          {/* Chunk title */}
          <div className="notion-title-row">
            <input
              type="text"
              className="notion-page-title-input"
              placeholder="Nhập cụm từ tiếng Anh... (ví dụ: touch base with)"
              value={chunkText}
              onChange={(e) => handleChunkTextChange(e.target.value)}
              autoFocus
            />
            <span className="notion-required-star" title="Trường bắt buộc">
              *
            </span>
          </div>

          {/* Core: meaning */}
          <div className="notion-properties-table">
            <div className="notion-property-row">
              <div className="notion-prop-label">
                <span>🎯</span>
                <span>
                  Nghĩa cốt lõi <span className="notion-required-star">*</span>
                </span>
              </div>
              <div className="notion-prop-value">
                <input
                  type="text"
                  className="notion-inline-input"
                  placeholder="Ví dụ: liên hệ ngắn gọn, trao đổi nhanh..."
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Advanced toggle */}
          <div className="notion-toggle-advanced-wrap">
            <button type="button" className="notion-toggle-advanced-btn" onClick={() => setShowAdvanced(!showAdvanced)}>
              <ChevronDown size={15} className={`notion-toggle-chevron ${showAdvanced ? "expanded" : ""}`} />
              <span>
                {showAdvanced ? "Thu gọn tùy chỉnh nâng cao" : "Tùy chỉnh nâng cao (Chủ đề, Ví dụ câu, IPA...)"}
              </span>
            </button>
          </div>

          {/* Advanced section */}
          {showAdvanced && (
            <div className="notion-advanced-section">
              <div className="notion-properties-table">
                {/* Topic dropdown */}
                <TopicDropdown
                  topicId={topicId}
                  existingTopics={existingTopics}
                  isOpen={isTopicMenuOpen}
                  dropdownRef={topicDropdownRef}
                  currentSelectedTopic={currentSelectedTopic}
                  onToggle={() => setIsTopicMenuOpen(!isTopicMenuOpen)}
                  onSelectTopic={(id) => {
                    setTopicId(id);
                    setIsTopicMenuOpen(false);
                  }}
                />

                {/* Chunk IPA */}
                <div className="notion-property-row">
                  <div className="notion-prop-label">
                    <span>🔤</span>
                    <span>IPA Cụm từ</span>
                  </div>
                  <div className="notion-prop-value flex items-center gap-2">
                    <input
                      type="text"
                      className="notion-inline-input flex-1"
                      placeholder="Tự động sinh khi gõ cụm từ... (hoặc tự chỉnh sửa)"
                      value={chunkIpa}
                      onChange={(e) => handleChunkIpaChange(e.target.value)}
                    />
                    {chunkText.trim() && (
                      <button
                        type="button"
                        onClick={handleForceGenerateChunkIpa}
                        className="notion-btn-inline-action"
                        title="Tự động đồng bộ lại phiên âm chuẩn Mỹ cho cụm từ này"
                      >
                        <Wand2 size={13} />
                        <span>Tạo lại IPA</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="notion-content-divider" />

              {/* Example list */}
              <div className="notion-examples-list-wrap">
                <div className="notion-examples-header">
                  <span className="notion-section-subhead">Danh sách câu ví dụ thực tế ({examples.length})</span>
                </div>

                {examples.map((ex, index) => (
                  <ExampleCard
                    key={ex.id}
                    ex={ex}
                    index={index}
                    totalCount={examples.length}
                    chunkText={chunkText}
                    showWarning={Boolean(chunkText.trim() && ex.sentence.trim() && !isChunkInSentence(ex.sentence))}
                    textareaRef={(el) => {
                      textareaRefs.current[index] = el;
                    }}
                    onSentenceChange={handleExampleSentenceChange}
                    onIpaChange={handleExampleIpaChange}
                    onForceIpa={handleForceGenerateExampleIpa}
                    onTranslationChange={handleExampleTranslationChange}
                    onContextChange={handleExampleContextChange}
                    onRemove={handleRemoveExample}
                    onTestAudio={handleTestAudio}
                    onToggleHighlight={handleToggleHighlight}
                    onAutoHighlight={handleAutoHighlightChunk}
                    onClearHighlight={handleClearHighlight}
                  />
                ))}

                <button
                  type="button"
                  className="notion-btn-add-example"
                  onClick={handleAddExample}
                  title="Thêm một câu ví dụ khác cho cụm từ này"
                >
                  <Plus size={15} />
                  <span>Thêm câu ví dụ khác</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="notion-modal-footer">
            {isEditing && onDelete && (
              <button type="button" className="notion-btn-danger" onClick={handleDelete} title="Xóa chunk này">
                <Trash2 size={15} />
                <span>Xóa chunk</span>
              </button>
            )}
            <div className="notion-footer-right">
              <button type="button" className="notion-btn-secondary" onClick={onClose}>
                Đóng
              </button>
              <button type="submit" className="notion-btn-primary">
                <Save size={15} />
                <span>{isEditing ? "Cập Nhật Thay Đổi" : "Lưu Vào Kho Chunks"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
