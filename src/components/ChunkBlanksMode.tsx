"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { SpeakingChunk, SRSRating } from "@/types";
import { soundManager } from "@/lib/client/sound";
import { speechService } from "@/lib/client/speech";
import { resolveChunkIpas } from "@/lib/shared/ipa";
import { CheckCircle2, HelpCircle, Edit2, Lightbulb, ChevronDown, ArrowRight, Shuffle } from "lucide-react";
import confetti from "canvas-confetti";
import { formatMarkdown } from "@/lib/shared/formatMarkdown";

interface ChunkBlanksModeProps {
  chunk: SpeakingChunk;
  onRate: (rating: SRSRating, accuracy: number) => void;
  onShuffle?: () => void;
  currentIndex: number;
  totalInQueue: number;
  onEditChunk?: (chunk: SpeakingChunk) => void;
}

interface MaskedParts {
  before: string;
  targetInSentence: string;
  after: string;
}

export const ChunkBlanksMode: React.FC<ChunkBlanksModeProps> = ({
  chunk,
  onRate,
  onShuffle,
  currentIndex,
  totalInQueue,
  onEditChunk
}) => {
  const [prevChunkId, setPrevChunkId] = useState(chunk.id);
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [playingAudioType, setPlayingAudioType] = useState<"normal" | "slow" | null>(null);

  // Reset state synchronously when chunk prop changes (React recommended pattern)
  if (prevChunkId !== chunk.id) {
    setPrevChunkId(chunk.id);
    setActiveExampleIndex(0);
    setUserAnswer("");
    setIsRevealed(false);
    setIsCorrect(null);
    setIsHintOpen(false);
    setPlayingAudioType(null);
  }

  // Active example resolution
  const activeExample = useMemo(() => {
    if (chunk.examples && chunk.examples.length > 0) {
      const idx = Math.min(activeExampleIndex, chunk.examples.length - 1);
      return chunk.examples[idx] || chunk.examples[0];
    }
    return {
      id: "primary",
      sentence: chunk.exampleSentence || chunk.cleanExample || "",
      cleanSentence: chunk.cleanExample || chunk.exampleSentence || "",
      sentenceIpa: chunk.sentenceIpa || "",
      translation: chunk.translation || "",
      context: chunk.context || ""
    };
  }, [chunk, activeExampleIndex]);

  // Cleanly resolve both Chunk IPA and Sentence IPA with backwards compatibility
  const { chunkIpa, sentenceIpa } = useMemo(() => resolveChunkIpas(chunk), [chunk]);
  const effectiveCleanSentence =
    activeExample.cleanSentence || activeExample.sentence || chunk.cleanExample || chunk.exampleSentence || "";
  const effectiveSentenceIpa = activeExample.sentenceIpa || sentenceIpa || "";

  // Extract masked parts cleanly from activeExample
  const maskedParts = useMemo<MaskedParts>(() => {
    const rawExample =
      activeExample.sentence || activeExample.cleanSentence || chunk.exampleSentence || chunk.cleanExample || "";

    // 1. Primary: Match **`chunk`** or **chunk** markers in exampleSentence
    const boldMatch = rawExample.match(/^([\s\S]*?)\*\*`?([\s\S]+?)`?\*\*([\s\S]*)$/);
    if (boldMatch) {
      return {
        before: boldMatch[1].replace(/`/g, "").trimStart(),
        targetInSentence: boldMatch[2].replace(/`/g, "").trim(),
        after: boldMatch[3].replace(/`/g, "").trimEnd()
      };
    }

    // 2. Secondary: Direct substring match with chunk.chunk (case-insensitive)
    const clean = chunk.cleanExample || rawExample.replace(/[\*`]/g, "");
    const escaped = chunk.chunk.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const directMatch = clean.match(new RegExp(`^(.*?)(?:${escaped})(.*)$`, "i"));
    if (directMatch) {
      return {
        before: directMatch[1],
        targetInSentence: chunk.chunk,
        after: directMatch[2]
      };
    }

    // 3. Fallback: Word by word smart pronoun replacement
    const words = chunk.chunk
      .trim()
      .replace(/[\.\?\!\,\:\;]+$/, "")
      .split(/\s+/);
    const patternParts = words.map((w) => {
      const wl = w.toLowerCase();
      if (["one's", "someone's", "sb's"].includes(wl))
        return "(?:my|your|his|her|its|our|their|one's|someone's|[a-zA-Z]+\'s)";
      if (["someone", "somebody", "sb"].includes(wl)) return "(?:me|you|him|her|us|them|someone|somebody|[a-zA-Z]+)";
      if (["something", "sth"].includes(wl)) return "(?:something|sth|[\\w\\s]{1,30}?)";
      if (wl === "oneself") return "(?:myself|yourself|himself|herself|ourselves|themselves|oneself)";
      return w.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    });

    try {
      const smartRegex = new RegExp(`^(.*?)\\b(${patternParts.join("\\s+")})\\b(.*)$`, "i");
      const smartMatch = clean.match(smartRegex);
      if (smartMatch) {
        return {
          before: smartMatch[1],
          targetInSentence: smartMatch[2],
          after: smartMatch[3]
        };
      }
    } catch {
      // Ignore regex syntax errors
    }

    // 4. Absolute fallback
    return {
      before: clean,
      targetInSentence: chunk.chunk,
      after: ""
    };
  }, [chunk, activeExample.cleanSentence, activeExample.sentence]);

  // Valid answer candidates
  const validTargets = useMemo(() => {
    const set = new Set<string>();
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/['"\.,/#!$%^&*;:{}=\-_`~()?]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    set.add(norm(chunk.chunk));
    if (maskedParts.targetInSentence) {
      set.add(norm(maskedParts.targetInSentence));
    }

    const strippedChunk = norm(chunk.chunk)
      .replace(/\b(ones|someones|someone|something|sth|sb)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (strippedChunk.length > 2) set.add(strippedChunk);

    const strippedSentenceTarget = norm(maskedParts.targetInSentence)
      .replace(/\b(my|your|his|her|its|our|their)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (strippedSentenceTarget.length > 2) set.add(strippedSentenceTarget);

    return Array.from(set);
  }, [chunk.chunk, maskedParts.targetInSentence]);

  // Word count of the blank phrase
  const targetPhrase = maskedParts.targetInSentence || chunk.chunk;
  const wordCount = useMemo(() => {
    return targetPhrase.trim().split(/\s+/).filter(Boolean).length;
  }, [targetPhrase]);

  // First letter hint
  const hintText = useMemo(() => {
    const firstWord = targetPhrase.trim().split(/\s+/)[0] || targetPhrase;
    const letters = firstWord.slice(0, Math.min(3, firstWord.length));
    return `${letters}... (${wordCount} từ)`;
  }, [targetPhrase, wordCount]);

  const handleCheck = () => {
    setIsRevealed(true);
    const cleanUser = userAnswer
      .toLowerCase()
      .replace(/['"\.,/#!$%^&*;:{}=\-_`~()?]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanUser) {
      setIsCorrect(false);
      soundManager.playError();
      speechService.speak(effectiveCleanSentence);
      return;
    }

    const matched = validTargets.some(
      (target) =>
        cleanUser === target ||
        (cleanUser.length >= 4 && target.includes(cleanUser)) ||
        (target.length >= 4 && cleanUser.includes(target))
    );

    if (matched) {
      setIsCorrect(true);
      soundManager.playSuccess();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.65 } });
    } else {
      setIsCorrect(false);
      soundManager.playError();
    }

    playAudio(1.0);
  };

  const playAudio = useCallback(
    (speed: number = 1.0) => {
      const isSlow = speed < 1.0;
      setPlayingAudioType(isSlow ? "slow" : "normal");
      soundManager.playClick();
      speechService.speak(effectiveCleanSentence, speed, () => {
        setPlayingAudioType(null);
      });
    },
    [effectiveCleanSentence]
  );

  const handleRevealDirectly = () => {
    setIsRevealed(true);
    setIsCorrect(false);
    soundManager.playClick();
    playAudio(1.0);
  };

  // Keyboard shortcut listener (Space = play audio, 1 = Chưa thuộc, 2/Enter/ArrowRight = Tiếp tục)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input, let normal typing proceed
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        playAudio(1.0);
      } else if (isRevealed) {
        if (e.key === "1") {
          e.preventDefault();
          onRate(1, isCorrect ? 100 : 30);
        } else if (e.key === "2" || e.key === "Enter" || e.key === "ArrowRight") {
          e.preventDefault();
          onRate(3, isCorrect ? 100 : 85);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRevealed, isCorrect, playAudio, onRate]);

  return (
    <div className="practice-card">
      {/* Top Meta Bar */}
      <div className="card-top-bar">
        <div className="meta-badges">
          <span className="badge topic-badge">
            {chunk.topicIcon} {chunk.topicName}
          </span>
          <span className="badge level-badge">{chunk.level}</span>
          <span className="badge number-badge">#{chunk.number}</span>
        </div>

        <div className="card-top-actions">
          {onShuffle && (
            <button
              type="button"
              className="card-quick-edit-btn card-shuffle-btn"
              onClick={onShuffle}
              title="Xáo trộn ngẫu nhiên thứ tự các câu trong chủ đề này"
            >
              <Shuffle size={13} />
              <span>Xáo trộn</span>
            </button>
          )}
          {onEditChunk && (
            <button
              type="button"
              className="card-quick-edit-btn"
              onClick={() => onEditChunk(chunk)}
              title="Chỉnh sửa chunk này"
            >
              <Edit2 size={13} />
              <span>Sửa</span>
            </button>
          )}
          <span className="queue-indicator">
            {currentIndex + 1} / {totalInQueue}
          </span>
        </div>
      </div>

      {/* 1. PRIMARY: Masked Sentence Display with Prominent [ ? ] Blank */}
      <div className={`masked-sentence-card ${isRevealed ? "is-revealed" : ""}`}>
        <div className="masked-card-header">
          {/* Multi-example switcher if chunk has multiple examples */}
          {chunk.examples && chunk.examples.length > 1 ? (
            <div className="example-selector-bar blanks-selector-bar">
              <span className="example-selector-label">Ngữ cảnh ({chunk.examples.length}):</span>
              <div className="example-selector-pills">
                {chunk.examples.map((ex, idx) => (
                  <button
                    key={ex.id || idx}
                    type="button"
                    className={`example-selector-pill ${activeExampleIndex === idx ? "active" : ""}`}
                    onClick={() => {
                      setActiveExampleIndex(idx);
                      setUserAnswer("");
                      setIsRevealed(false);
                      setIsCorrect(null);
                      setIsHintOpen(false);
                      soundManager.playClick();
                    }}
                  >
                    Ví dụ #{idx + 1}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Single clean set of Loa + Rùa controls */}
          <div className="duo-audio-controls-row">
            <button
              type="button"
              className={`duo-audio-btn duo-normal-btn duo-compact ${playingAudioType === "normal" ? "is-playing" : ""}`}
              onClick={() => playAudio(1.0)}
              title="Phát âm tốc độ chuẩn (Phím Space)"
              aria-label="Phát âm tốc độ chuẩn (Space)"
            >
              <span className="duo-speaker-icon" aria-hidden="true" />
            </button>

            <button
              type="button"
              className={`duo-audio-btn duo-turtle-btn duo-compact ${playingAudioType === "slow" ? "is-playing" : ""}`}
              onClick={() => playAudio(0.6)}
              title="Phát âm chậm rãi từng từ (Tốc độ con rùa 0.6x)"
              aria-label="Phát âm chậm tốc độ con rùa"
            >
              <span className="duo-turtle-icon" aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className="masked-text">
          &ldquo;{formatMarkdown(maskedParts.before)}
          {!isRevealed ? (
            <span className="cloze-blank-box" title="Vị trí cụm từ cần điền">
              [ ? ]
            </span>
          ) : (
            <span className="cloze-revealed-box">{maskedParts.targetInSentence}</span>
          )}
          {formatMarkdown(maskedParts.after)}&rdquo;
        </p>

        {/* Full Vietnamese Translation of the Sentence */}
        {(activeExample.translation || chunk.translation) && (
          <p className="masked-sentence-translation">&ldquo;{activeExample.translation || chunk.translation}&rdquo;</p>
        )}
      </div>

      {/* Interactive Input or Revealed Solution */}
      {!isRevealed ? (
        <div className="blanks-interaction-area">
          {/* LeetCode-Style Single Hint Accordion */}
          <div className="blanks-leetcode-hint-wrap">
            <button
              type="button"
              className={`leetcode-hint-toggle-btn ${isHintOpen ? "is-open" : ""}`}
              onClick={() => {
                soundManager.playClick();
                setIsHintOpen(!isHintOpen);
              }}
              title={isHintOpen ? "Thu gọn gợi ý" : "Bấm để mở các gợi ý của câu này"}
            >
              <Lightbulb size={14} className="hint-bulb-icon" />
              <span>{isHintOpen ? "Ẩn gợi ý" : "Gợi ý"}</span>
              <ChevronDown size={14} className={`hint-chevron ${isHintOpen ? "rotate-180" : ""}`} />
            </button>

            {isHintOpen && (
              <div className="leetcode-hint-dropdown">
                <div className="leetcode-hint-row">
                  <span className="hint-tag">Hint 1</span>
                  <span className="hint-desc">
                    Cụm từ gồm <strong>{wordCount} từ</strong>, bắt đầu bằng: <code>{hintText}</code>
                  </span>
                </div>
                {chunk.context && (
                  <div className="leetcode-hint-row">
                    <span className="hint-tag">Hint 2</span>
                    <span className="hint-desc">
                      <strong>Ngữ cảnh:</strong> {chunk.context}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="answer-input-zone">
            <input
              type="text"
              className="chunk-input"
              placeholder={`Gõ cụm từ tiếng Anh (${wordCount} từ)...`}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              autoFocus
            />
            <button className="submit-answer-btn" onClick={handleCheck}>
              <span>Kiểm tra (Enter)</span>
            </button>
          </div>

          <div className="blanks-assist-row">
            <span className="assist-tip-text">
              Nhấn <strong>Enter</strong> để kiểm tra • Phím <strong>Space</strong> để nghe âm thanh
            </span>
            <button className="assist-btn text-muted-btn" onClick={handleRevealDirectly}>
              <span>Chưa nhớ ra? Xem đáp án ngay</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="revealed-answer-box">
          <div className="answer-status-row">
            {isCorrect ? (
              <div className="result-tag success">
                <CheckCircle2 size={18} />
                <span>Xuất sắc! Bạn nhớ và điền rất chính xác.</span>
              </div>
            ) : (
              <div className="result-tag error">
                <HelpCircle size={18} />
                <span>Đáp án đúng bên dưới, hãy nghe và nhại lại nhé:</span>
              </div>
            )}
          </div>

          <div className="revealed-chunk-display">
            <span className="revealed-chunk-name">{chunk.chunk}</span>
            {chunkIpa && (
              <span className="revealed-chunk-ipa" title="Phiên âm IPA chuẩn Anh - Mỹ của cụm từ">
                /{chunkIpa.replace(/^\/|\/$/g, "")}/
              </span>
            )}
          </div>

          <p className="revealed-chunk-meaning">➜ {chunk.meaning}</p>

          {effectiveSentenceIpa && (
            <div className="sentence-ipa-block blanks-sentence-ipa" title="Phiên âm ngữ âm cả câu ví dụ">
              <p className="sentence-ipa-text">/{effectiveSentenceIpa.replace(/^\/|\/$/g, "")}/</p>
            </div>
          )}

          {/* Streamlined Binary SRS Rating Bar */}
          <div className="srs-rating-container" style={{ marginTop: "1.25rem" }}>
            <div className="srs-header-row">
              <span className="srs-label">Đánh giá mức độ thuộc (SRS):</span>
              <span className="srs-hint-text">
                Bấm &ldquo;Tiếp tục&rdquo; để tự động dãn cách ngày ôn tập theo thuật toán
              </span>
            </div>
            <div className="srs-buttons-grid-binary">
              <button
                type="button"
                className="srs-btn srs-btn-forget"
                onClick={() => onRate(1, isCorrect ? 100 : 30)}
                title="Đánh dấu cần ôn lại sớm (Phím tắt: 1)"
              >
                <div className="srs-btn-top">
                  <span className="srs-text">Chưa thuộc</span>
                  <span className="srs-shortcut-badge">Phím 1</span>
                </div>
                <span className="srs-sub">Ôn lại sớm (&lt; 1 ngày)</span>
              </button>

              <button
                type="button"
                className="srs-btn srs-btn-next"
                onClick={() => onRate(3, isCorrect ? 100 : 85)}
                title="Đã nhớ tốt, chuyển tiếp tục (Phím tắt: Enter hoặc 2)"
              >
                <div className="srs-btn-top">
                  <span className="srs-text">Tiếp tục ➔</span>
                  <span className="srs-shortcut-badge srs-badge-primary">Enter ↵</span>
                </div>
                <span className="srs-sub">Đã nhớ tốt • Tự động tăng chu kỳ SRS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
