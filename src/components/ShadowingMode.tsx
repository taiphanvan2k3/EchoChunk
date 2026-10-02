import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { ChunkProgress, SpeakingChunk, SpeechEvalResult, SRSRating } from "@/types";
import { speechService } from "@/lib/client/speech";
import { soundManager } from "@/lib/client/sound";
import { getAmericanIpa, getPhraseIpa, resolveChunkIpas, normalizeFriendlyIpa } from "@/lib/shared/ipa";
import { Volume2, Mic, MicOff, CheckCircle2, Eye, EyeOff, Edit2, RotateCcw, Shuffle } from "lucide-react";
import confetti from "canvas-confetti";
import { formatMarkdown } from "@/lib/shared/formatMarkdown";

interface ShadowingModeProps {
  chunk: SpeakingChunk;
  progress?: ChunkProgress;
  onRate: (rating: SRSRating, accuracy: number) => void;
  onNext?: () => void;
  onShuffle?: () => void;
  currentIndex: number;
  totalInQueue: number;
  onEditChunk?: (chunk: SpeakingChunk) => void;
}

export function ShadowingMode({
  chunk,
  onRate,
  onShuffle,
  currentIndex,
  totalInQueue,
  onEditChunk
}: ShadowingModeProps) {
  const [playingAudioType, setPlayingAudioType] = useState<"normal" | "slow" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const latestSpokenTranscriptRef = useRef("");
  const [evalResult, setEvalResult] = useState<SpeechEvalResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Selected word for dedicated detail inspection
  const [inspectedWord, setInspectedWord] = useState<string | null>(null);

  // Pronunciation Clinic State (Support for mispronounced words)
  const [drillingWord, setDrillingWord] = useState<string | null>(null);
  const [drilledSuccessWords, setDrilledSuccessWords] = useState<Set<string>>(new Set());
  const [activeWordPlaying, setActiveWordPlaying] = useState<string | null>(null);
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);

  // Synchronous state reset on chunk change (React recommended pattern)
  const [prevChunkId, setPrevChunkId] = useState(chunk.id);
  if (prevChunkId !== chunk.id) {
    setPrevChunkId(chunk.id);
    setActiveExampleIndex(0);
    speechService.stopListening();
    setIsRecording(false);
    setSpokenTranscript("");
    setEvalResult(null);
    setInspectedWord(null);
    setShowDetails(false);
    setRecordingError(null);
    setDrillingWord(null);
    setDrilledSuccessWords(new Set());
    setActiveWordPlaying(null);
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
  const { chunkIpa, sentenceIpa: defaultSentenceIpa } = useMemo(() => resolveChunkIpas(chunk), [chunk]);

  const currentSentenceIpa = useMemo(() => {
    let raw = "";
    if (activeExample.sentenceIpa) {
      raw = activeExample.sentenceIpa;
    } else if (defaultSentenceIpa && (!activeExample.id || activeExample.id === "primary")) {
      raw = defaultSentenceIpa;
    } else if (activeExample.cleanSentence || activeExample.sentence) {
      raw = getPhraseIpa(activeExample.cleanSentence || activeExample.sentence);
    } else {
      raw = defaultSentenceIpa;
    }
    return normalizeFriendlyIpa(raw);
  }, [activeExample, defaultSentenceIpa]);

  const currentCleanSentence = useMemo(() => {
    const s = activeExample.cleanSentence || activeExample.sentence || chunk.cleanExample || chunk.chunk;
    return s.replace(/[*_`]/g, "");
  }, [activeExample, chunk.cleanExample, chunk.chunk]);

  const currentRawSentence = useMemo(() => {
    return (
      activeExample.sentence ||
      activeExample.cleanSentence ||
      chunk.exampleSentence ||
      chunk.cleanExample ||
      chunk.chunk
    );
  }, [activeExample, chunk.exampleSentence, chunk.cleanExample, chunk.chunk]);

  const currentTranslation = activeExample.translation || chunk.translation;
  const currentContext = activeExample.context || chunk.context;

  const playAudio = useCallback(
    (speed: number = 1.0) => {
      const isSlow = speed < 1.0;
      setPlayingAudioType(isSlow ? "slow" : "normal");
      soundManager.playClick();
      speechService.speak(currentCleanSentence || chunk.chunk, speed, () => {
        setPlayingAudioType(null);
      });
    },
    [currentCleanSentence, chunk.chunk]
  );

  const evaluate = useCallback(
    (transcript: string) => {
      const target = currentCleanSentence || chunk.chunk;
      const result = speechService.evaluatePronunciation(target, transcript);
      setEvalResult(result);

      if (result.accuracy >= 80) {
        soundManager.playSuccess();
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 }
        });
      } else if (result.accuracy >= 50) {
        soundManager.playSuccess();
      } else {
        soundManager.playError();
      }
    },
    [currentCleanSentence, chunk.chunk]
  );

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      const captured = speechService.stopListening();
      setIsRecording(false);
      const textToEval = (captured || latestSpokenTranscriptRef.current || spokenTranscript).trim();
      if (textToEval.length > 0) {
        evaluate(textToEval);
      }
    } else {
      setRecordingError(null);
      setSpokenTranscript("");
      latestSpokenTranscriptRef.current = "";
      setEvalResult(null);
      setInspectedWord(null);
      setDrilledSuccessWords(new Set());
      setDrillingWord(null);
      setIsRecording(true);

      speechService.startListening(
        (interimText) => {
          latestSpokenTranscriptRef.current = interimText;
          setSpokenTranscript(interimText);
        },
        (finalText) => {
          setIsRecording(false);
          const textToEval = (finalText || latestSpokenTranscriptRef.current || spokenTranscript).trim();
          if (textToEval.length > 0) {
            evaluate(textToEval);
          }
        },
        (error) => {
          setRecordingError(error);
          setIsRecording(false);
          soundManager.playError();
        },
        () => {
          setIsRecording(false);
        },
        2500
      );
    }
  }, [isRecording, spokenTranscript, evaluate]);

  // Keyboard shortcut listener (1 = Chưa thuộc, 2/Enter/ArrowRight = Tiếp tục, Space = nghe mẫu)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        playAudio();
      } else if (e.key === "1") {
        onRate(1, evalResult?.accuracy || 0);
      } else if (e.key === "2" || e.key === "Enter" || e.key === "ArrowRight") {
        onRate(3, evalResult?.accuracy || 0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playAudio, onRate, evalResult]);

  // Play individual word audio
  const handlePlayWord = (word: string, rate: number = 0.8) => {
    const clean = word.replace(/^[+*`]/, "").trim();
    if (!clean) return;
    setActiveWordPlaying(clean);
    soundManager.playClick();
    speechService.speak(clean, rate, () => {
      setActiveWordPlaying(null);
    });
  };

  // Drill a single mispronounced word
  const handleStartDrillWord = (targetWord: string) => {
    const cleanTarget = targetWord
      .replace(/^[+*`]/, "")
      .toLowerCase()
      .trim();
    if (drillingWord === cleanTarget) {
      speechService.stopListening();
      setDrillingWord(null);
      return;
    }

    setDrillingWord(cleanTarget);
    soundManager.playClick();

    speechService.startListening(
      (interimText) => {
        const cleanSaid = interimText.toLowerCase().trim();
        if (cleanSaid.includes(cleanTarget) || cleanTarget.includes(cleanSaid)) {
          soundManager.playSuccess();
          confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 } });
          setDrilledSuccessWords((prev) => new Set(prev).add(cleanTarget));
          setDrillingWord(null);
          speechService.stopListening();
        }
      },
      (finalText) => {
        const cleanSaid = finalText.toLowerCase().trim();
        if (cleanSaid.includes(cleanTarget) || cleanTarget.includes(cleanSaid)) {
          soundManager.playSuccess();
          confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 } });
          setDrilledSuccessWords((prev) => new Set(prev).add(cleanTarget));
        } else {
          soundManager.playError();
        }
        setDrillingWord(null);
      },
      () => {
        setDrillingWord(null);
        soundManager.playError();
      },
      () => {
        setDrillingWord(null);
      },
      2200
    );
  };

  // Extract missing & extra misheard tokens for the clinic
  const missingTokens = useMemo(() => {
    if (!evalResult) return [];
    return evalResult.tokens.filter((t) => t.status === "missing");
  }, [evalResult]);

  const extraTokens = useMemo(() => {
    if (!evalResult) return [];
    return evalResult.tokens.filter((t) => t.status === "extra").map((t) => t.word.replace(/^\+/, ""));
  }, [evalResult]);

  // Active word token being inspected in the Inspector Bar
  const activeInspectToken = useMemo(() => {
    if (!evalResult || evalResult.tokens.length === 0) return null;
    const targetWord = inspectedWord || missingTokens[0]?.word || evalResult.tokens[0]?.word;
    if (!targetWord) return null;

    const cleanTarget = targetWord.replace(/^[+*`]/, "").toLowerCase();
    const found = evalResult.tokens.find((t) => t.word.replace(/^[+*`]/, "").toLowerCase() === cleanTarget);
    if (!found) return null;

    const clean = found.word.replace(/^[+*`]/, "").toLowerCase();
    const isFixed = drilledSuccessWords.has(clean);
    const status = isFixed ? "fixed-success" : found.status;

    return {
      rawWord: found.word,
      cleanWord: clean,
      status,
      ipa: getAmericanIpa(found.word)
    };
  }, [evalResult, inspectedWord, missingTokens, drilledSuccessWords]);

  return (
    <div className="bg-white border border-notion-border rounded-xl p-4 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative transition-all duration-200">
      {/* Card Header Meta */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-notion-border/60">
        <div className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-notion-surface-subtle border border-notion-border text-notion-text min-w-0 max-w-[62%] sm:max-w-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="shrink-0 text-xs sm:text-sm leading-none">{chunk.topicIcon}</span>
          <span
            className="text-[0.74rem] sm:text-xs font-semibold text-notion-text truncate max-w-[130px] xs:max-w-[190px] sm:max-w-none"
            title={chunk.topicName}
          >
            {chunk.topicName}
          </span>
          <span className="w-px h-3 bg-notion-border shrink-0" />
          <span
            className={`text-[0.66rem] sm:text-[0.7rem] font-bold tracking-wider uppercase shrink-0 font-mono ${
              chunk.level === "A2"
                ? "text-notion-green-text"
                : chunk.level === "B2"
                  ? "text-notion-purple-text"
                  : "text-notion-blue-text"
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

      {/* Target Speaking Chunk */}
      <div className="text-center py-1 pb-3 flex flex-col items-center w-full">
        <div className="flex items-center justify-center gap-2 w-full mb-1 flex-wrap">
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-notion-text m-0 leading-tight text-center break-words">
            {chunk.chunk}
          </h2>
          <button
            type="button"
            className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-notion-btn-secondary hover:bg-notion-blue-bg border border-notion-border text-notion-blue-text hover:text-notion-primary hover:scale-105 transition-all cursor-pointer shrink-0"
            onClick={() => speechService.speak(chunk.chunk, 0.85)}
            title="Nghe phát âm riêng cụm từ này"
          >
            <Volume2 className="w-4 h-4 text-notion-blue-text" />
          </button>
        </div>

        {/* Chunk IPA on its own dedicated subline - never cramped with title */}
        {chunkIpa && (
          <div className="flex items-center justify-center w-full mb-1.5">
            <span className="font-ipa text-sm sm:text-base lg:text-lg font-medium tracking-wide text-notion-blue-text text-center break-words">
              {chunkIpa}
            </span>
          </div>
        )}

        <p className="text-base sm:text-lg lg:text-xl text-notion-green-text font-semibold leading-relaxed m-0 text-center max-w-[90%] break-words">
          ➜ {chunk.meaning}
        </p>
      </div>

      {/* Example Sentence with highlighted chunk */}
      <div className="bg-notion-surface border border-notion-border border-l-4 border-l-notion-primary rounded-lg p-3 sm:p-5 mb-3 sm:mb-4">
        {/* Multi-example switcher if chunk has multiple examples */}
        {chunk.examples && chunk.examples.length > 1 && (
          <div className="flex items-center gap-2 p-1.5 px-2 bg-notion-blue-bg/40 border border-notion-blue-border rounded-md mb-2.5 flex-wrap">
            <span className="text-[0.72rem] sm:text-xs font-bold text-notion-blue-text">
              Ngữ cảnh ví dụ ({chunk.examples.length}):
            </span>
            <div className="inline-flex gap-1 flex-wrap">
              {chunk.examples.map((ex, idx) => (
                <button
                  key={ex.id || idx}
                  type="button"
                  className={`px-2 py-0.5 rounded text-[0.72rem] sm:text-xs font-semibold border cursor-pointer transition-all ${
                    activeExampleIndex === idx
                      ? "bg-notion-primary text-white border-notion-primary shadow-sm"
                      : "border-notion-blue-border bg-white text-notion-text hover:bg-notion-blue-bg hover:text-notion-blue-text"
                  }`}
                  onClick={() => {
                    setActiveExampleIndex(idx);
                    setEvalResult(null);
                    setSpokenTranscript("");
                    soundManager.playClick();
                  }}
                >
                  Ví dụ #{idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end mb-2.5 text-[0.72rem] sm:text-xs font-semibold text-notion-blue-text">
          <div className="flex items-center gap-2">
            {/* 1. Loa phát âm tốc độ bình thường (Duolingo Style Speaker) */}
            <button
              type="button"
              className={`inline-flex items-center justify-center cursor-pointer select-none bg-duo hover:bg-duo-hover active:bg-duo-active w-9 h-9 sm:w-11 sm:h-11 rounded-[10px] sm:rounded-[14px] shadow-[0_3px_0_theme(colors.duo.dark)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_theme(colors.duo.dark)] transition-all ${
                playingAudioType === "normal" ? "animate-pulse bg-duo-dark" : ""
              }`}
              onClick={() => playAudio(0.9)}
              title="Phát âm tốc độ bình thường (Phím tắt: Space)"
              aria-label="Phát âm tốc độ bình thường (Space)"
            >
              <Image
                src="/icons/duo-speaker.png"
                alt="Phát âm bình thường"
                width={101}
                height={80}
                className="w-[19px] sm:w-[24px] h-auto object-contain pointer-events-none select-none"
                priority
              />
            </button>

            {/* 2. Loa hình con rùa (Duolingo Style Turtle Slow Audio - nằm sau loa bình thường) */}
            <button
              type="button"
              className={`inline-flex items-center justify-center cursor-pointer select-none bg-duo hover:bg-duo-hover active:bg-duo-active w-8 h-8 sm:w-[36px] sm:h-[36px] rounded-[8px] sm:rounded-[11px] shadow-[0_2.5px_0_theme(colors.duo.dark)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_theme(colors.duo.dark)] transition-all ${
                playingAudioType === "slow" ? "animate-pulse bg-duo-dark" : ""
              }`}
              onClick={() => playAudio(0.6)}
              title="Phát âm chậm rãi từng từ (Tốc độ con rùa 0.75x)"
              aria-label="Phát âm chậm tốc độ con rùa"
            >
              <Image
                src="/icons/duo-turtle.png"
                alt="Phát âm chậm"
                width={95}
                height={54}
                className="w-[17px] sm:w-[22px] h-auto object-contain pointer-events-none select-none"
                priority
              />
            </button>
          </div>
        </div>

        <p className="font-serif text-[0.98rem] sm:text-[1.2rem] leading-[1.6] text-notion-text font-normal mb-2.5 sm:mb-3.5 whitespace-pre-line">
          &ldquo;{formatMarkdown(currentRawSentence)}&rdquo;
        </p>

        {/* Full Sentence IPA cleanly structured as a responsive phonetic block (handles long sentences smoothly) */}
        {currentSentenceIpa && (
          <div
            className="block bg-notion-surface-subtle border border-notion-border border-l-[3px] border-l-notion-primary rounded-md py-1.5 px-3 mb-2.5 sm:mb-3.5 w-full box-border"
            title="Phiên âm ngữ âm của câu ví dụ thực chiến"
          >
            <p className="font-ipa text-xs sm:text-sm leading-relaxed text-notion-text tracking-wide m-0 break-words">
              {currentSentenceIpa}
            </p>
          </div>
        )}

        {/* Translation & Context Reveal */}
        <div className="border-t border-notion-border pt-2.5">
          <button
            type="button"
            className="flex items-center gap-1.5 bg-transparent border-none text-notion-secondary hover:text-notion-text text-xs font-medium cursor-pointer transition-colors p-0"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{showDetails ? "Ẩn bản dịch & ngữ cảnh" : "Hiện nghĩa tiếng Việt & ngữ cảnh"}</span>
          </button>

          {showDetails && (
            <div className="mt-2.5 text-sm">
              {currentTranslation && (
                <p className="text-notion-text mb-1.5 whitespace-pre-line">
                  ➜ <em>{currentTranslation}</em>
                </p>
              )}
              {currentContext && (
                <p className="text-notion-secondary text-[0.85rem] whitespace-pre-line">
                  💡 <strong>Ngữ cảnh:</strong> {currentContext}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Voice Shadowing Recording Area */}
      <div className="flex flex-col items-center gap-2 sm:gap-2.5 p-3 sm:p-5 bg-notion-surface border border-dashed border-notion-border-medium rounded-xl mb-3 sm:mb-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <button
            type="button"
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-md hover:scale-105 active:scale-95 text-white ${
              isRecording
                ? "bg-notion-red shadow-[0_4px_16px_rgba(235,87,87,0.4)] animate-pulse"
                : "bg-notion-primary hover:bg-notion-primary-hover shadow-[0_4px_14px_rgba(35,131,226,0.35)]"
            }`}
            onClick={toggleRecording}
            title={isRecording ? "Dừng ghi âm & Chấm điểm ngay" : "Bật Mic & Đọc theo câu trên"}
          >
            {isRecording ? <MicOff className="w-6 h-6 sm:w-7 sm:h-7" /> : <Mic className="w-6 h-6 sm:w-7 sm:h-7" />}
          </button>
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-xs sm:text-sm font-semibold text-notion-text">
              {isRecording ? "🔴 Đang lắng nghe liên tục..." : "Nhấn nút Micro và đọc to câu trên để chấm điểm"}
            </span>
            <span className="text-[0.72rem] sm:text-xs text-notion-secondary max-w-md leading-relaxed">
              {isRecording
                ? "Bạn cứ thong thả nói (thoải mái lấy hơi giữa các vế). Đọc xong bấm nút dưới hoặc dừng 2.5s để chấm."
                : "💡 Hệ thống lắng nghe liên tục, cho phép dừng nghỉ tự nhiên không lo bị tắt giữa chừng."}
            </span>
          </div>
        </div>

        {/* Active Recording Action Panel & Live Stream */}
        {isRecording && (
          <div className="w-full flex flex-col items-center gap-3 mt-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-notion-green hover:opacity-90 text-white font-semibold text-sm py-2 px-4 rounded-lg shadow cursor-pointer transition-all hover:-translate-y-0.5"
              onClick={toggleRecording}
            >
              <CheckCircle2 size={18} />
              <span>Đã đọc xong câu ➔ Chấm điểm ngay</span>
            </button>
            <div className="w-full bg-white border border-notion-border rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-notion-secondary mb-1">
                <span className="w-2 h-2 rounded-full bg-notion-red animate-ping inline-block"></span>
                <span>Từ máy đang nghe được từ giọng bạn:</span>
              </div>
              <p className="text-sm font-medium text-notion-text italic">
                {spokenTranscript ? (
                  <span>&ldquo;{spokenTranscript}&rdquo;</span>
                ) : (
                  <em className="text-notion-muted">Đang lắng nghe... Hãy bắt đầu đọc câu mẫu...</em>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {recordingError && (
          <div className="w-full bg-notion-red-bg border border-notion-red-border text-notion-red-text p-2.5 rounded-lg text-xs">
            <span>⚠️ {recordingError}</span>
          </div>
        )}

        {/* Real-time speech transcript & evaluation (when evaluated) */}
        {!isRecording && evalResult && (
          <div className="w-full bg-white border border-notion-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-notion-secondary">Kết quả giọng nói của bạn:</span>
                <span className="text-[0.75rem] text-notion-muted font-normal">
                  (💡 Bấm vào từ bất kỳ để nghe phát âm &amp; xem IPA)
                </span>
              </div>
              <span
                className={`text-xs font-bold py-1 px-2 rounded ${
                  evalResult.accuracy >= 80
                    ? "bg-notion-green-bg text-notion-green-text border border-notion-green-border"
                    : evalResult.accuracy >= 50
                      ? "bg-notion-yellow-bg text-notion-yellow-text border border-notion-yellow-border"
                      : "bg-notion-red-bg text-notion-red-text border border-notion-red-border"
                }`}
              >
                Độ chính xác: {evalResult.accuracy}%
              </span>
            </div>

            {/* Clean, uniform word token pills (100% same height, smooth baseline) */}
            <div className="flex flex-wrap gap-1 items-center leading-relaxed text-base">
              {evalResult.tokens.map((tok, i) => {
                const cleanWord = tok.word.replace(/^[+*`]/, "").toLowerCase();
                const isWordFixed = drilledSuccessWords.has(cleanWord);
                const status = isWordFixed ? "fixed-success" : tok.status;
                const isSelected = activeInspectToken?.cleanWord === cleanWord;

                let tokenStyle = "text-notion-secondary border-transparent hover:border-notion-border-medium";
                if (status === "correct") {
                  tokenStyle = "text-notion-green-text bg-notion-green-bg border-notion-green-border font-semibold";
                } else if (status === "missing") {
                  tokenStyle = "text-notion-red-text bg-notion-red-bg border-notion-red-border font-semibold";
                } else if (status === "extra") {
                  tokenStyle = "text-notion-yellow-text bg-notion-yellow-bg border-notion-yellow-border";
                } else if (status === "fixed-success") {
                  tokenStyle = "text-notion-green-text bg-notion-green-border border-notion-green-text font-bold";
                }

                return (
                  <button
                    key={i}
                    type="button"
                    className={`inline-flex items-center gap-1 font-inherit text-base border py-0.5 px-1.5 rounded cursor-pointer transition-all ${tokenStyle} ${
                      activeWordPlaying === cleanWord ? "ring-2 ring-notion-primary animate-pulse" : ""
                    } ${isSelected ? "ring-2 ring-notion-primary/70" : ""}`}
                    onClick={() => {
                      setInspectedWord(cleanWord);
                      handlePlayWord(tok.word, 0.8);
                    }}
                    title={`Bấm để chọn & nghe từ "${cleanWord}" (0.8x)`}
                  >
                    <span>{tok.word}</span>
                    {status === "missing" && <span className="text-xs opacity-70">🔊</span>}
                    {status === "fixed-success" && <span className="text-xs font-bold text-notion-green-text">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Clean Notion-style Inspector Bar for Selected Word */}
            {activeInspectToken && (
              <div className="mt-3.5 p-3 px-4 bg-notion-surface border border-notion-border border-l-[3px] border-l-notion-primary rounded-lg flex items-center justify-between flex-wrap gap-2.5 animate-[fadeIn_0.15s_ease]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-notion-secondary">Từ đang chọn:</span>
                  <strong className="text-base font-bold text-notion-text">{activeInspectToken.cleanWord}</strong>
                  {activeInspectToken.ipa && (
                    <span
                      className="font-ipa text-xs font-semibold text-notion-blue-text bg-notion-blue-bg border border-notion-blue-border py-0.5 px-2 rounded tracking-wide"
                      title="Phiên âm chuẩn Anh - Mỹ (General American IPA)"
                    >
                      🇺🇸 {activeInspectToken.ipa}
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold py-0.5 px-2 rounded ${
                      activeInspectToken.status === "missing"
                        ? "bg-notion-red-bg text-notion-red-text border border-notion-red-border"
                        : activeInspectToken.status === "fixed-success"
                          ? "bg-notion-green-bg text-notion-green-text border border-notion-green-border"
                          : activeInspectToken.status === "extra"
                            ? "bg-notion-orange-bg text-notion-orange-text border border-notion-orange-border"
                            : "bg-notion-green-bg text-notion-green-text border border-notion-green-border"
                    }`}
                  >
                    {activeInspectToken.status === "missing"
                      ? "⚠️ Chưa đọc chuẩn"
                      : activeInspectToken.status === "fixed-success"
                        ? "✓ Đã sửa chuẩn"
                        : activeInspectToken.status === "extra"
                          ? "⚠️ Máy nghe thừa"
                          : "✓ Phát âm đúng"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium border border-notion-border bg-white text-notion-text hover:bg-notion-hover hover:border-notion-primary transition-colors cursor-pointer"
                    onClick={() => handlePlayWord(activeInspectToken.cleanWord, 1.0)}
                    title={`Nghe chuẩn tốc độ 1.0x của từ "${activeInspectToken.cleanWord}"`}
                  >
                    <Volume2 size={13} />
                    <span>Chuẩn 1.0x</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium border border-notion-border bg-white text-notion-orange-text hover:bg-notion-hover hover:border-notion-orange-border transition-colors cursor-pointer"
                    onClick={() => handlePlayWord(activeInspectToken.cleanWord, 0.7)}
                    title={`Nghe chậm 0.7x để rõ khẩu hình từ "${activeInspectToken.cleanWord}"`}
                  >
                    <span>🐢 Chậm 0.7x</span>
                  </button>
                  {activeInspectToken.status === "missing" && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-semibold border border-notion-red-border bg-notion-red-bg text-notion-red-text hover:bg-notion-red hover:text-white transition-colors cursor-pointer"
                      onClick={() => handleStartDrillWord(activeInspectToken.cleanWord)}
                      title={`Bật mic đọc riêng từ "${activeInspectToken.cleanWord}"`}
                    >
                      <Mic size={13} />
                      <span>Luyện từ này</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pronunciation Clinic (Hỗ trợ những từ phát âm sai + IPA Anh-Mỹ) */}
        {!isRecording && evalResult && missingTokens.length > 0 && (
          <div className="w-full bg-white border border-notion-border border-l-4 border-l-notion-red rounded-xl p-4 sm:p-5 shadow-sm mt-3">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-start gap-2.5">
                <span className="text-xl leading-none">🩺</span>
                <div>
                  <h4 className="text-base font-bold text-notion-text mb-0.5">
                    Hỗ trợ phát âm các từ chưa chuẩn ({missingTokens.length} từ)
                  </h4>
                  <p className="text-xs text-notion-secondary">
                    Tích hợp phiên âm <strong>IPA chuẩn Anh - Mỹ (General American)</strong>, bấm nghe chậm 0.7x để rõ
                    khẩu hình hoặc luyện riêng từng từ:
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-notion-primary hover:bg-notion-primary-hover text-white rounded-md text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                onClick={toggleRecording}
                title="Bật lại mic để nói lại cả câu"
              >
                <RotateCcw size={14} />
                <span>Nói lại cả câu</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5 mb-3">
              {missingTokens.map((tok, idx) => {
                const word = tok.word.toLowerCase();
                const isFixed = drilledSuccessWords.has(word);
                const isCurrentlyDrilling = drillingWord === word;
                const americanIpa = getAmericanIpa(tok.word);

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 px-3.5 rounded-lg border gap-3 flex-wrap transition-colors ${
                      isFixed
                        ? "bg-notion-green-bg border-notion-green-border"
                        : "bg-notion-surface-subtle border-notion-border"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-lg font-extrabold tracking-tight ${isFixed ? "text-notion-green-text" : "text-notion-red-text"}`}
                        >
                          {tok.word}
                        </span>
                        {americanIpa && (
                          <span
                            className="font-ipa text-xs font-semibold text-notion-blue-text bg-notion-blue-bg border border-notion-blue-border py-0.5 px-2 rounded"
                            title="Phiên âm chuẩn Anh - Mỹ (General American IPA)"
                          >
                            🇺🇸 {americanIpa}
                          </span>
                        )}
                      </div>
                      {isFixed ? (
                        <span className="text-xs font-bold text-notion-green-text bg-notion-green-border border border-notion-green-text py-0.5 px-2 rounded">
                          ✓ Đã sửa đúng!
                        </span>
                      ) : (
                        <span className="text-[0.7rem] font-bold text-notion-red-text bg-notion-red-bg border border-notion-red-border py-0.5 px-2 rounded">
                          Cần chỉnh
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Standard Speed Audio */}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 bg-white border border-notion-border-medium text-notion-text hover:bg-notion-blue-bg hover:text-notion-blue-text hover:border-notion-blue-border py-1 px-2.5 rounded text-xs font-semibold cursor-pointer transition-colors"
                        onClick={() => handlePlayWord(tok.word, 1.0)}
                        title={`Nghe chuẩn tốc độ 1.0x của từ "${tok.word}"`}
                      >
                        <Volume2 size={14} />
                        <span>Chuẩn 1.0x</span>
                      </button>

                      {/* Slow Turtle Audio */}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 bg-white border border-notion-border-medium text-notion-text hover:bg-notion-yellow-bg hover:text-notion-yellow-text hover:border-notion-yellow-border py-1 px-2.5 rounded text-xs font-semibold cursor-pointer transition-colors"
                        onClick={() => handlePlayWord(tok.word, 0.7)}
                        title={`Nghe chậm 0.7x để nghe rõ trọng âm & âm đuôi của từ "${tok.word}"`}
                      >
                        <span>🐢 Chậm 0.7x</span>
                      </button>

                      {/* Drill This Single Word */}
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 py-1 px-3 rounded text-xs font-bold cursor-pointer transition-colors border ${
                          isCurrentlyDrilling
                            ? "bg-notion-red border-notion-red text-white animate-pulse"
                            : isFixed
                              ? "bg-notion-green-bg border-notion-green-border text-notion-green-text"
                              : "bg-white border-notion-primary text-notion-primary hover:bg-notion-blue-bg"
                        }`}
                        onClick={() => handleStartDrillWord(tok.word)}
                        title={`Bật mic đọc riêng từ "${tok.word}" để kiểm tra`}
                      >
                        {isCurrentlyDrilling ? <MicOff size={14} /> : <Mic size={14} />}
                        <span>{isCurrentlyDrilling ? "Đang nghe..." : isFixed ? "Đã chuẩn" : "Luyện từ này"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Misheard Words Comparison */}
            {extraTokens.length > 0 && (
              <div className="flex items-center gap-2.5 pt-3 border-t border-notion-border flex-wrap text-xs text-notion-secondary">
                <span className="font-medium text-notion-secondary">⚠️ Các từ máy nghe nhầm thành:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {extraTokens.map((w, i) => {
                    const extraIpa = getAmericanIpa(w);
                    return (
                      <button
                        key={i}
                        type="button"
                        className="inline-flex items-center gap-1.5 bg-notion-yellow-bg border border-notion-yellow-border text-notion-yellow-text py-1 px-2 rounded text-xs font-semibold cursor-pointer hover:bg-notion-yellow-border transition-colors"
                        onClick={() => handlePlayWord(w, 0.8)}
                        title={`Bấm để nghe thử từ máy nhận diện được: "${w}"`}
                      >
                        <span>{w}</span>
                        {extraIpa && <span className="font-ipa opacity-80">{extraIpa}</span>}
                        <Volume2 size={12} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Streamlined Binary SRS Rating Bar */}
      <div className="flex flex-col gap-2 mt-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold text-notion-blue-text">Đánh giá mức độ thuộc (SRS):</span>
          <span className="text-xs text-notion-muted">
            Bấm &ldquo;Tiếp tục&rdquo; để tự động dãn cách ngày ôn tập theo thuật toán
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 items-stretch">
          <button
            type="button"
            className="flex flex-col items-start justify-center p-2.5 sm:p-3.5 rounded-xl border border-notion-border-medium bg-white hover:bg-notion-red-bg hover:border-notion-red-border hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer text-left"
            onClick={() => onRate(1, evalResult?.accuracy || 0)}
            title="Đánh dấu cần ôn lại sớm (Phím tắt: 1)"
          >
            <div className="flex items-center justify-between w-full mb-0.5">
              <span className="font-bold text-sm sm:text-base text-notion-text hover:text-notion-red-text transition-colors">
                Chưa thuộc
              </span>
              <span className="font-mono text-[0.66rem] font-semibold py-0.5 px-1.5 rounded bg-notion-surface-subtle text-notion-secondary">
                Phím 1
              </span>
            </div>
            <span className="text-[0.72rem] sm:text-xs text-notion-muted">Ôn lại sớm (&lt; 1 ngày)</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-start justify-center p-2.5 sm:p-3.5 rounded-xl border border-notion-primary bg-notion-primary hover:bg-notion-primary-hover hover:border-notion-primary-hover text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer text-left"
            onClick={() => onRate(3, evalResult?.accuracy || 0)}
            title="Đã thuộc câu này, chuyển tiếp tục (Phím tắt: Enter hoặc 2)"
          >
            <div className="flex items-center justify-between w-full mb-0.5">
              <span className="font-bold text-sm sm:text-base text-white">Tiếp tục ➔</span>
              <span className="font-mono text-[0.66rem] font-semibold py-0.5 px-1.5 rounded bg-white/20 text-white border border-white/30">
                Enter ↵
              </span>
            </div>
            <span className="text-[0.72rem] sm:text-xs text-white/90">Đã nhớ tốt • Tự động tăng chu kỳ SRS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
