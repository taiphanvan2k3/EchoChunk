"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
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

export function ChunkBlanksMode({
  chunk,
  onRate,
  onShuffle,
  currentIndex,
  totalInQueue,
  onEditChunk
}: ChunkBlanksModeProps) {
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

  const handleRevealDirectly = () => {
    setIsRevealed(true);
    setIsCorrect(false);
    soundManager.playClick();
    playAudio(1.0);
  };

  // Keyboard shortcut listener (Space = play audio, 1 = Chưa thuộc, 2/Enter/ArrowRight = Tiếp tục)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
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
    <div className="w-full bg-white border border-[rgba(55,53,47,0.08)] rounded-2xl p-3.5 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-4 sm:gap-6 relative">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3.5 border-b border-notion-border">
        <div className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-notion-surface-subtle border border-notion-border text-notion-text min-w-0 max-w-[62%] sm:max-w-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="shrink-0 text-xs sm:text-sm leading-none">{chunk.topicIcon}</span>
          <span className="text-[0.74rem] sm:text-xs font-semibold text-notion-text truncate max-w-[130px] xs:max-w-[190px] sm:max-w-none" title={chunk.topicName}>
            {chunk.topicName}
          </span>
          <span className="w-px h-3 bg-notion-border shrink-0" />
          <span
            className={`text-[0.66rem] sm:text-[0.7rem] font-bold tracking-wider uppercase shrink-0 font-mono ${
              chunk.level === 'A2'
                ? 'text-notion-green-text'
                : chunk.level === 'B2'
                ? 'text-notion-purple-text'
                : 'text-notion-blue-text'
            }`}
          >
            {chunk.level}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {onShuffle && (
            <button
              type="button"
              className="inline-flex items-center gap-1 py-1 px-1.5 sm:px-2.5 rounded-md text-[0.72rem] sm:text-xs font-semibold text-notion-secondary hover:text-notion-text hover:bg-notion-hover transition-colors border border-notion-border bg-white cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              onClick={onShuffle}
              title="Xáo trộn ngẫu nhiên thứ tự các câu trong chủ đề này"
            >
              <Shuffle size={12} className="shrink-0" />
              <span className="hidden sm:inline">Xáo trộn</span>
            </button>
          )}
          {onEditChunk && (
            <button
              type="button"
              className="inline-flex items-center gap-1 py-1 px-1.5 sm:px-2.5 rounded-md text-[0.72rem] sm:text-xs font-semibold text-notion-secondary hover:text-notion-text hover:bg-notion-hover transition-colors border border-notion-border bg-white cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              onClick={() => onEditChunk(chunk)}
              title="Chỉnh sửa chunk này"
            >
              <Edit2 size={12} className="shrink-0" />
              <span className="hidden sm:inline">Sửa</span>
            </button>
          )}
          <span className="text-[0.7rem] sm:text-xs text-notion-muted font-mono ml-0.5 sm:ml-1 whitespace-nowrap bg-notion-surface-subtle px-1.5 py-0.5 rounded border border-notion-border">
            {currentIndex + 1} / {totalInQueue}
          </span>
        </div>
      </div>

      {/* 1. PRIMARY: Masked Sentence Display with Prominent [ ? ] Blank */}
      <div
        className={`bg-notion-surface border border-notion-border rounded-lg p-[0.85rem_1.25rem_1.15rem] mb-[0.85rem] text-center transition-all ${
          isRevealed ? "border-l-[3px] border-l-notion-green" : ""
        }`}
      >
        <div className="flex items-center justify-between mb-[0.65rem] w-full">
          {/* Multi-example switcher if chunk has multiple examples */}
          {chunk.examples && chunk.examples.length > 1 ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-notion-secondary">Ngữ cảnh ({chunk.examples.length}):</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {chunk.examples.map((ex, idx) => (
                  <button
                    key={ex.id || idx}
                    type="button"
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                      activeExampleIndex === idx
                        ? "bg-notion-blue-bg border-notion-primary text-notion-blue-text shadow-sm"
                        : "bg-white border-notion-border-medium text-notion-secondary hover:bg-notion-btn-secondary hover:text-notion-text"
                    }`}
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
          <div className="flex items-end gap-[0.65rem]">
            <button
              type="button"
              className={`w-[36px] h-[36px] rounded-[10px] bg-duo hover:bg-duo-hover hover:-translate-y-px active:translate-y-[2px] shadow-[0_3px_0_theme(colors.duo.dark)] hover:shadow-[0_4px_0_theme(colors.duo.dark)] active:shadow-[0_1px_0_theme(colors.duo.dark)] inline-flex items-center justify-center cursor-pointer border-none transition-all relative select-none ${
                playingAudioType === "normal" ? "bg-duo-dark animate-pulse" : ""
              }`}
              onClick={() => playAudio(1.0)}
              title="Phát âm tốc độ chuẩn (Phím Space)"
              aria-label="Phát âm tốc độ chuẩn (Space)"
            >
              <Image
                src="/icons/duo-speaker.png"
                alt="Phát âm chuẩn"
                width={101}
                height={80}
                className="w-[20px] h-auto object-contain pointer-events-none select-none"
                priority
              />
            </button>

            <button
              type="button"
              className={`w-[30px] h-[30px] rounded-[9px] bg-duo hover:bg-duo-hover hover:-translate-y-px active:translate-y-[2px] shadow-[0_2px_0_theme(colors.duo.dark)] hover:shadow-[0_3px_0_theme(colors.duo.dark)] active:shadow-[0_1px_0_theme(colors.duo.dark)] inline-flex items-center justify-center cursor-pointer border-none transition-all relative select-none ${
                playingAudioType === "slow" ? "bg-duo-dark animate-pulse" : ""
              }`}
              onClick={() => playAudio(0.6)}
              title="Phát âm chậm rãi từng từ (Tốc độ con rùa 0.6x)"
              aria-label="Phát âm chậm tốc độ con rùa"
            >
              <Image
                src="/icons/duo-turtle.png"
                alt="Phát âm chậm"
                width={95}
                height={54}
                className="w-[19px] h-auto object-contain pointer-events-none select-none"
                priority
              />
            </button>
          </div>
        </div>

        <p className="text-[1.02rem] sm:text-[1.22rem] leading-[1.6] font-semibold text-notion-text">
          &ldquo;{formatMarkdown(maskedParts.before)}
          {!isRevealed ? (
            <span
              className="inline-flex items-center justify-center px-2 sm:px-3 py-0.5 sm:py-[0.18rem] mx-1 bg-notion-blue-bg border-2 border-dashed border-notion-primary rounded-md text-notion-blue-text font-extrabold text-[0.95rem] sm:text-[1.1rem] tracking-[0.05em] leading-[1.2] align-middle animate-pulse cursor-default"
              title="Vị trí cụm từ cần điền"
            >
              [ ? ]
            </span>
          ) : (
            <span className="inline-block px-2 sm:px-[0.55rem] py-0.5 sm:py-[0.15rem] mx-1 bg-notion-green-bg border border-notion-green-border rounded-[5px] text-notion-green-text font-bold">
              {maskedParts.targetInSentence}
            </span>
          )}
          {formatMarkdown(maskedParts.after)}&rdquo;
        </p>

        {/* Full Vietnamese Translation of the Sentence */}
        {(activeExample.translation || chunk.translation) && (
          <p className="text-[0.82rem] sm:text-[0.92rem] text-notion-secondary mt-1 font-medium leading-[1.4]">
            &ldquo;{activeExample.translation || chunk.translation}&rdquo;
          </p>
        )}
      </div>

      {/* Interactive Input or Revealed Solution */}
      {!isRevealed ? (
        <div className="flex flex-col">
          {/* LeetCode-Style Single Hint Accordion */}
          <div className="flex flex-col items-end mb-[0.85rem] w-full">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[0.8rem] font-semibold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer ${
                isHintOpen
                  ? "bg-notion-yellow-bg border border-notion-yellow-border text-notion-yellow-text"
                  : "bg-white border border-notion-border-medium text-notion-secondary hover:bg-notion-btn-secondary hover:text-notion-text hover:border-notion-border-focus"
              }`}
              onClick={() => {
                soundManager.playClick();
                setIsHintOpen(!isHintOpen);
              }}
              title={isHintOpen ? "Thu gọn gợi ý" : "Bấm để mở các gợi ý của câu này"}
            >
              <Lightbulb size={14} className="text-notion-yellow-text" />
              <span>{isHintOpen ? "Ẩn gợi ý" : "Gợi ý"}</span>
              <ChevronDown
                size={14}
                className={`text-notion-muted transition-transform duration-200 ${isHintOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isHintOpen && (
              <div className="flex flex-col gap-[0.45rem] mt-2 p-3 sm:px-4 bg-notion-surface-subtle border border-notion-border rounded-lg w-full text-left animate-fadeIn">
                <div className="flex items-baseline gap-2.5 text-[0.84rem] text-notion-text leading-[1.45]">
                  <span className="text-[0.7rem] font-bold bg-notion-hover text-notion-secondary px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                    Hint 1
                  </span>
                  <span className="flex-1">
                    Cụm từ gồm <strong>{wordCount} từ</strong>, bắt đầu bằng:{" "}
                    <code className="font-mono font-bold text-notion-blue-text bg-notion-blue-bg px-1.5 py-0.5 rounded">
                      {hintText}
                    </code>
                  </span>
                </div>
                {chunk.context && (
                  <div className="flex items-baseline gap-2.5 text-[0.84rem] text-notion-text leading-[1.45]">
                    <span className="text-[0.7rem] font-bold bg-notion-hover text-notion-secondary px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                      Hint 2
                    </span>
                    <span className="flex-1 whitespace-pre-line">
                      <strong>Ngữ cảnh:</strong> {chunk.context}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 sm:gap-2.5 mb-4 sm:mb-6">
            <input
              type="text"
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-notion-border-medium rounded-lg text-notion-text text-sm sm:text-base outline-none focus:border-notion-primary focus:ring-2 focus:ring-notion-primary/15 transition-all shadow-sm"
              placeholder={`Gõ cụm từ tiếng Anh (${wordCount} từ)...`}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              autoFocus
            />
            <button
              type="button"
              className="px-3 sm:px-5 py-2 sm:py-2.5 bg-notion-primary hover:bg-notion-primary-hover text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
              onClick={handleCheck}
            >
              <span>Kiểm tra (Enter)</span>
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 sm:mt-[0.85rem] flex-wrap gap-2">
            <span className="text-xs text-notion-secondary">
              Nhấn <strong>Enter</strong> để kiểm tra • Phím <strong>Space</strong> để nghe âm thanh
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 bg-transparent border-none text-notion-secondary hover:text-notion-text hover:bg-notion-btn-secondary text-xs font-medium py-1 px-2 rounded transition-all cursor-pointer"
              onClick={handleRevealDirectly}
            >
              <span>Chưa nhớ ra? Xem đáp án ngay</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-notion-surface border border-notion-border rounded-lg p-3 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-[0.85rem]">
            {isCorrect ? (
              <div className="inline-flex items-center gap-1.5 font-bold text-xs sm:text-sm text-notion-green-text">
                <CheckCircle2 size={16} />
                <span>Xuất sắc! Bạn nhớ và điền rất chính xác.</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 font-bold text-xs sm:text-sm text-notion-red-text">
                <HelpCircle size={16} />
                <span>Đáp án đúng bên dưới, hãy nghe và nhại lại nhé:</span>
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-extrabold text-notion-blue-text">{chunk.chunk}</span>
            {chunkIpa && (
              <span
                className="font-ipa font-medium tracking-[0.01em] text-notion-muted text-xs sm:text-sm"
                title="Phiên âm IPA chuẩn Anh - Mỹ của cụm từ"
              >
                /{chunkIpa.replace(/^\/|\/$/g, "")}/
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-notion-green-text font-semibold mt-1 mb-1 text-left">➜ {chunk.meaning}</p>

          {effectiveSentenceIpa && (
            <div
              className="block bg-notion-surface-subtle border border-notion-border border-l-[3px] border-l-notion-primary rounded-md py-1.5 px-3 my-2 w-full"
              title="Phiên âm ngữ âm cả câu ví dụ"
            >
              <p className="font-ipa text-xs sm:text-sm leading-[1.6] text-notion-text tracking-[0.02em] m-0 break-words">
                /{effectiveSentenceIpa.replace(/^\/|\/$/g, "")}/
              </p>
            </div>
          )}

          {/* Streamlined Binary SRS Rating Bar */}
          <div className="flex flex-col gap-2 mt-4 sm:mt-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-notion-blue-text tracking-tight">
                Đánh giá mức độ thuộc (SRS):
              </span>
              <span className="text-[0.72rem] text-notion-secondary">
                Bấm &ldquo;Tiếp tục&rdquo; để tự động dãn cách ngày ôn tập theo thuật toán
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 items-stretch">
              <button
                type="button"
                className="flex flex-col items-start justify-center p-2.5 sm:p-3.5 rounded-lg border border-notion-border-medium bg-white hover:bg-notion-red-bg hover:border-notion-red-border hover:-translate-y-px hover:shadow-[0_3px_10px_rgba(235,87,87,0.1)] transition-all cursor-pointer group text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                onClick={() => onRate(1, isCorrect ? 100 : 30)}
                title="Đánh dấu cần ôn lại sớm (Phím tắt: 1)"
              >
                <div className="flex items-center justify-between w-full mb-0.5">
                  <span className="text-notion-text group-hover:text-notion-red-text font-bold text-xs sm:text-sm transition-colors">
                    Chưa thuộc
                  </span>
                  <span className="font-mono text-[0.66rem] font-semibold px-1.5 py-0.5 rounded bg-notion-surface-subtle text-notion-secondary">
                    Phím 1
                  </span>
                </div>
                <span className="text-notion-muted text-[0.7rem] sm:text-xs mt-0.5">Ôn lại sớm (&lt; 1 ngày)</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-start justify-center p-2.5 sm:p-3.5 rounded-lg border border-notion-primary bg-notion-primary hover:bg-notion-primary-hover hover:border-notion-primary-hover hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(35,131,226,0.35)] transition-all cursor-pointer text-left shadow-[0_2px_8px_rgba(35,131,226,0.22)]"
                onClick={() => onRate(3, isCorrect ? 100 : 85)}
                title="Đã nhớ tốt, chuyển tiếp tục (Phím tắt: Enter hoặc 2)"
              >
                <div className="flex items-center justify-between w-full mb-0.5">
                  <span className="text-white font-bold text-xs sm:text-sm">Tiếp tục ➔</span>
                  <span className="font-mono text-[0.66rem] font-semibold px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30">
                    Enter ↵
                  </span>
                </div>
                <span className="text-white/85 text-[0.7rem] sm:text-xs mt-0.5">
                  Đã nhớ tốt • Tự động tăng chu kỳ SRS
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
