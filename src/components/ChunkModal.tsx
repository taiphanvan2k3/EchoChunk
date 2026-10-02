"use client";

import { useCallback } from "react";
import { SpeakingChunk, TopicMeta } from "@/types";
import { X, Save, Trash2, ChevronDown, AlertCircle, Wand2, Plus } from "lucide-react";
import { useChunkEditor } from "@/hooks/useChunkEditor";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { TopicDropdown } from "@/components/ChunkModal/TopicDropdown";
import { ExampleCard } from "@/components/ChunkModal/ExampleCard";

interface ChunkModalProps {
  onClose: () => void;
  onSave: (chunk: SpeakingChunk) => void;
  onDelete?: (chunkId: string) => void;
  chunkToEdit?: SpeakingChunk | null;
  existingTopics: TopicMeta[];
}

export function ChunkModal({ onClose, onSave, onDelete, chunkToEdit, existingTopics }: ChunkModalProps) {
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

  // Lắng nghe phím ESC để đóng modal
  const handleEscape = useCallback(() => {
    if (isTopicMenuOpen) {
      setIsTopicMenuOpen(false);
      return;
    }
    onClose();
  }, [isTopicMenuOpen, onClose, setIsTopicMenuOpen]);

  useEscapeKey(handleEscape);
  useBodyScrollLock();

  return (
    <div className="fixed inset-0 bg-black/50 sm:backdrop-blur-[4px] z-[5000] flex sm:items-center sm:justify-center sm:p-4">
      <div className="bg-white sm:border sm:border-gray-200 w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-[680px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease]">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-gray-100 bg-white/95 backdrop-blur shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0 select-none">
              🗣️
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0 truncate">
                {isEditing ? "Chỉnh sửa Speaking Chunk" : "Thêm Speaking Chunk mới"}
              </h2>
              <p className="text-[0.7rem] text-gray-500 m-0 hidden sm:block">
                Cụm từ, phiên âm IPA, giải nghĩa và ví dụ ngữ cảnh
              </p>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 hover:text-gray-900 text-gray-400 border border-gray-200 flex items-center justify-center cursor-pointer transition-colors shrink-0 ml-2"
            onClick={onClose}
            title="Đóng (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleSave(e);
            }
          }}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Scrollable Form Body with generous bottom padding */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 pb-14 sm:pb-16 flex flex-col gap-4">
            {/* Error banner */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-2.5 px-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs shrink-0">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Chunk title */}
            <div className="flex flex-col sm:grid sm:grid-cols-[170px_1fr] sm:items-center gap-1 sm:gap-3">
              <div className="text-[0.78rem] sm:text-[0.82rem] text-gray-700 flex items-center gap-1.5 font-bold select-none whitespace-nowrap shrink-0">
                <span>🔤</span>
                <span>
                  Cụm từ tiếng Anh <span className="text-red-500 font-bold text-xs">*</span>
                </span>
              </div>
              <input
                type="text"
                className="w-full h-9 px-3 bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-blue-500 rounded-lg text-sm sm:text-[0.95rem] font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-400 placeholder:font-normal transition-all"
                placeholder="Ví dụ: problem-solving skills"
                value={chunkText}
                onChange={(e) => handleChunkTextChange(e.target.value)}
                autoFocus
              />
            </div>

            {/* Core Property: Meaning */}
            <div className="flex flex-col sm:grid sm:grid-cols-[170px_1fr] sm:items-center gap-1 sm:gap-3">
              <div className="text-[0.78rem] sm:text-[0.82rem] text-gray-600 flex items-center gap-1.5 font-semibold select-none whitespace-nowrap shrink-0">
                <span>🎯</span>
                <span>
                  Nghĩa cốt lõi <span className="text-red-500 font-bold text-xs">*</span>
                </span>
              </div>
              <input
                type="text"
                className="w-full h-9 px-3 bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-blue-500 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-400 transition-all"
                placeholder="Nghĩa tiếng Việt (VD: kỹ năng giải quyết vấn đề)"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
              />
            </div>

            {/* Advanced toggle */}
            <div className="pt-1">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 py-1.5 px-2 bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-lg text-xs font-semibold transition-all select-none cursor-pointer"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-gray-400 transition-transform duration-200 ${showAdvanced ? "rotate-0" : "-rotate-90"}`}
                />
                <span>
                  {showAdvanced ? "Thu gọn tùy chỉnh nâng cao" : "Tùy chỉnh nâng cao (Chủ đề, Ví dụ câu, IPA...)"}
                </span>
              </button>
            </div>

            {/* Advanced section */}
            {showAdvanced && (
              <div className="space-y-4 pt-1 border-t border-gray-100">
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
                <div className="flex flex-col sm:grid sm:grid-cols-[170px_1fr] sm:items-center gap-1 sm:gap-3">
                  <div className="text-[0.78rem] sm:text-[0.82rem] text-gray-600 flex items-center gap-1.5 font-semibold select-none whitespace-nowrap shrink-0">
                    <span>🔤</span>
                    <span>IPA Cụm từ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 h-9 px-3 bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-200 focus:border-blue-500 rounded-lg font-ipa text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-400 transition-all"
                      placeholder="Tự động sinh khi gõ cụm từ... (hoặc tự chỉnh sửa)"
                      value={chunkIpa}
                      onChange={(e) => handleChunkIpaChange(e.target.value)}
                    />
                    {chunkText.trim() && (
                      <button
                        type="button"
                        onClick={handleForceGenerateChunkIpa}
                        className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
                        title="Tự động đồng bộ lại phiên âm chuẩn Mỹ cho cụm từ này"
                      >
                        <Wand2 size={13} />
                        <span className="hidden sm:inline">Tạo lại IPA</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Example list */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Danh sách câu ví dụ thực tế ({examples.length})
                    </span>
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
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-50/40 hover:bg-blue-50 border border-dashed border-blue-300 hover:border-blue-400 rounded-xl text-xs sm:text-sm font-semibold text-blue-600 transition-all cursor-pointer"
                    onClick={handleAddExample}
                    title="Thêm một câu ví dụ khác cho cụm từ này"
                  >
                    <Plus size={15} />
                    <span>Thêm câu ví dụ khác</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Action Footer */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-t border-gray-100 bg-white/95 backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.03)] gap-3 z-10">
            {isEditing && onDelete ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs sm:text-sm font-semibold hover:bg-red-100 transition-all cursor-pointer"
                onClick={handleDelete}
                title="Xóa chunk này"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Xóa chunk</span>
              </button>
            ) : <div />}
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                onClick={onClose}
              >
                Đóng
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer active:scale-[0.99]"
              >
                <Save size={15} />
                <span>{isEditing ? "Cập Nhật Thay Đổi" : "Lưu Vào Kho Chunks"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
