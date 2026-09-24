"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ChunkProgress, SpeakingChunk, SpeechEvalResult, SRSRating } from "@/types";
import { speechService } from "@/lib/client/speech";
import { soundManager } from "@/lib/client/sound";
import { getAmericanIpa, getPhraseIpa, resolveChunkIpas } from "@/lib/shared/ipa";
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

export const ShadowingMode: React.FC<ShadowingModeProps> = ({
  chunk,
  onRate,
  onShuffle,
  currentIndex,
  totalInQueue,
  onEditChunk
}) => {
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
      id: 'primary',
      sentence: chunk.exampleSentence || chunk.cleanExample || '',
      cleanSentence: chunk.cleanExample || chunk.exampleSentence || '',
      sentenceIpa: chunk.sentenceIpa || '',
      translation: chunk.translation || '',
      context: chunk.context || '',
    };
  }, [chunk, activeExampleIndex]);

  // Cleanly resolve both Chunk IPA and Sentence IPA with backwards compatibility
  const { chunkIpa, sentenceIpa: defaultSentenceIpa } = useMemo(() => resolveChunkIpas(chunk), [chunk]);

  const currentSentenceIpa = useMemo(() => {
    if (activeExample.sentenceIpa) return activeExample.sentenceIpa;
    if (activeExample.cleanSentence || activeExample.sentence) {
      return getPhraseIpa(activeExample.cleanSentence || activeExample.sentence);
    }
    return defaultSentenceIpa;
  }, [activeExample, defaultSentenceIpa]);

  const currentCleanSentence = useMemo(() => {
    const s = activeExample.cleanSentence || activeExample.sentence || chunk.cleanExample || chunk.chunk;
    return s.replace(/[*_`]/g, '');
  }, [activeExample, chunk.cleanExample, chunk.chunk]);

  const currentRawSentence = useMemo(() => {
    return activeExample.sentence || activeExample.cleanSentence || chunk.exampleSentence || chunk.cleanExample || chunk.chunk;
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
    <div className="practice-card">
      {/* Card Header Meta */}
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

      {/* Target Speaking Chunk */}
      <div className="target-chunk-hero">
        <div className="chunk-heading-wrap">
          <h2 className="chunk-text-heading">{chunk.chunk}</h2>
          <button
            type="button"
            className="chunk-title-speaker-btn"
            onClick={() => speechService.speak(chunk.chunk, 0.85)}
            title="Nghe phát âm riêng cụm từ này"
          >
            <Volume2 size={20} />
          </button>
        </div>

        {/* Chunk IPA on its own dedicated subline - never cramped with title */}
        {chunkIpa && (
          <div className="chunk-ipa-row">
            <span className="chunk-ipa-text">{chunkIpa}</span>
          </div>
        )}

        <p className="core-meaning-text">➜ {chunk.meaning}</p>
      </div>

      {/* Example Sentence with highlighted chunk */}
      <div className="example-sentence-box">
        {/* Multi-example switcher if chunk has multiple examples */}
        {chunk.examples && chunk.examples.length > 1 && (
          <div className="example-selector-bar">
            <span className="example-selector-label">Ngữ cảnh ví dụ ({chunk.examples.length}):</span>
            <div className="example-selector-pills">
              {chunk.examples.map((ex, idx) => (
                <button
                  key={ex.id || idx}
                  type="button"
                  className={`example-selector-pill ${activeExampleIndex === idx ? 'active' : ''}`}
                  onClick={() => {
                    setActiveExampleIndex(idx);
                    setEvalResult(null);
                    setSpokenTranscript('');
                    soundManager.playClick();
                  }}
                >
                  Ví dụ #{idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="example-label">
          <span>Câu ví dụ thực chiến (Shadowing Target):</span>
          <div className="duo-audio-controls-row">
            {/* 1. Loa phát âm tốc độ bình thường (Duolingo Style Speaker) */}
            <button
              type="button"
              className={`duo-audio-btn duo-normal-btn ${playingAudioType === "normal" ? "is-playing" : ""}`}
              onClick={() => playAudio(1.0)}
              title="Phát âm tốc độ bình thường (Phím tắt: Space)"
              aria-label="Phát âm tốc độ bình thường (Space)"
            >
              <span className="duo-speaker-icon" aria-hidden="true" />
            </button>

            {/* 2. Loa hình con rùa (Duolingo Style Turtle Slow Audio - nằm sau loa bình thường) */}
            <button
              type="button"
              className={`duo-audio-btn duo-turtle-btn ${playingAudioType === "slow" ? "is-playing" : ""}`}
              onClick={() => playAudio(0.6)}
              title="Phát âm chậm rãi từng từ (Tốc độ con rùa 0.75x)"
              aria-label="Phát âm chậm tốc độ con rùa"
            >
              <span className="duo-turtle-icon" aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className="example-content">
          &ldquo;{formatMarkdown(currentRawSentence)}&rdquo;
        </p>

        {/* Full Sentence IPA cleanly structured as a responsive phonetic block (handles long sentences smoothly) */}
        {currentSentenceIpa && (
          <div className="sentence-ipa-block" title="Phiên âm ngữ âm của câu ví dụ thực chiến">
            <p className="sentence-ipa-text">{currentSentenceIpa}</p>
          </div>
        )}

        {/* Translation & Context Reveal */}
        <div className="context-reveal-wrap">
          <button className="toggle-reveal-btn" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{showDetails ? "Ẩn bản dịch & ngữ cảnh" : "Hiện nghĩa tiếng Việt & ngữ cảnh"}</span>
          </button>

          {showDetails && (
            <div className="revealed-details">
              {currentTranslation && (
                <p className="detail-translation">
                  ➜ <em>{currentTranslation}</em>
                </p>
              )}
              {currentContext && (
                <p className="detail-context">
                  💡 <strong>Ngữ cảnh:</strong> {currentContext}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Voice Shadowing Recording Area */}
      <div className="shadowing-action-box">
        <div className="mic-button-wrapper">
          <button
            type="button"
            className={`main-mic-btn ${isRecording ? "recording" : ""}`}
            onClick={toggleRecording}
            title={isRecording ? "Dừng ghi âm & Chấm điểm ngay" : "Bật Mic & Đọc theo câu trên"}
          >
            {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
            <span className="mic-glow-ring"></span>
          </button>
          <div className="mic-hint-box">
            <span className="mic-hint-title">
              {isRecording ? "🔴 Đang lắng nghe liên tục..." : "Nhấn nút Micro và đọc to câu trên để chấm điểm"}
            </span>
            <span className="mic-hint-desc">
              {isRecording
                ? "Bạn cứ thong thả nói (thoải mái lấy hơi giữa các vế). Đọc xong bấm nút dưới hoặc dừng 2.5s để chấm."
                : "💡 Hệ thống lắng nghe liên tục, cho phép dừng nghỉ tự nhiên không lo bị tắt giữa chừng."}
            </span>
          </div>
        </div>

        {/* Active Recording Action Panel & Live Stream */}
        {isRecording && (
          <div className="recording-active-panel">
            <button type="button" className="finish-speaking-btn" onClick={toggleRecording}>
              <CheckCircle2 size={18} />
              <span>Đã đọc xong câu ➔ Chấm điểm ngay</span>
            </button>
            <div className="live-speech-card">
              <div className="live-speech-header">
                <span className="live-dot-pulse"></span>
                <span>Từ máy đang nghe được từ giọng bạn:</span>
              </div>
              <p className="live-speech-text">
                {spokenTranscript ? (
                  <span>&ldquo;{spokenTranscript}&rdquo;</span>
                ) : (
                  <em className="text-muted">Đang lắng nghe... Hãy bắt đầu đọc câu mẫu...</em>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {recordingError && (
          <div className="recording-error-alert">
            <span>⚠️ {recordingError}</span>
          </div>
        )}

        {/* Real-time speech transcript & evaluation (when evaluated) */}
        {!isRecording && evalResult && (
          <div className="speech-result-box">
            <div className="result-header">
              <div className="result-title-group">
                <span className="result-title">Kết quả giọng nói của bạn:</span>
                <span className="token-click-hint">(💡 Bấm vào từ bất kỳ để nghe phát âm & xem IPA)</span>
              </div>
              <span
                className={`accuracy-badge ${evalResult.accuracy >= 80 ? "high" : evalResult.accuracy >= 50 ? "med" : "low"}`}
              >
                Độ chính xác: {evalResult.accuracy}%
              </span>
            </div>

            {/* Clean, uniform word token pills (100% same height, smooth baseline) */}
            <div className="word-tokens-stream">
              {evalResult.tokens.map((tok, i) => {
                const cleanWord = tok.word.replace(/^[+*`]/, "").toLowerCase();
                const isWordFixed = drilledSuccessWords.has(cleanWord);
                const statusClass = isWordFixed ? "fixed-success" : tok.status;
                const isSelected = activeInspectToken?.cleanWord === cleanWord;

                return (
                  <button
                    key={i}
                    type="button"
                    className={`word-token-btn ${statusClass} ${activeWordPlaying === cleanWord ? "is-speaking" : ""} ${isSelected ? "is-selected" : ""}`}
                    onClick={() => {
                      setInspectedWord(cleanWord);
                      handlePlayWord(tok.word, 0.8);
                    }}
                    title={`Bấm để chọn & nghe từ "${cleanWord}" (0.8x)`}
                  >
                    <span>{tok.word}</span>
                    {statusClass === "missing" && <span className="word-sound-icon">🔊</span>}
                    {statusClass === "fixed-success" && <span className="word-check-icon">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Clean Notion-style Inspector Bar for Selected Word */}
            {activeInspectToken && (
              <div className="token-inspector-bar">
                <div className="inspector-word-group">
                  <span className="inspector-label">Từ đang chọn:</span>
                  <strong className="inspector-word-name">{activeInspectToken.cleanWord}</strong>
                  {activeInspectToken.ipa && (
                    <span className="inspector-ipa-pill" title="Phiên âm chuẩn Anh - Mỹ (General American IPA)">
                      🇺🇸 {activeInspectToken.ipa}
                    </span>
                  )}
                  <span className={`inspector-status-badge ${activeInspectToken.status}`}>
                    {activeInspectToken.status === "missing"
                      ? "⚠️ Chưa đọc chuẩn"
                      : activeInspectToken.status === "fixed-success"
                        ? "✓ Đã sửa chuẩn"
                        : activeInspectToken.status === "extra"
                          ? "⚠️ Máy nghe thừa"
                          : "✓ Phát âm đúng"}
                  </span>
                </div>

                <div className="inspector-actions">
                  <button
                    type="button"
                    className="inspector-audio-btn"
                    onClick={() => handlePlayWord(activeInspectToken.cleanWord, 1.0)}
                    title={`Nghe chuẩn tốc độ 1.0x của từ "${activeInspectToken.cleanWord}"`}
                  >
                    <Volume2 size={13} />
                    <span>Chuẩn 1.0x</span>
                  </button>
                  <button
                    type="button"
                    className="inspector-audio-btn slow"
                    onClick={() => handlePlayWord(activeInspectToken.cleanWord, 0.7)}
                    title={`Nghe chậm 0.7x để rõ khẩu hình từ "${activeInspectToken.cleanWord}"`}
                  >
                    <span>🐢 Chậm 0.7x</span>
                  </button>
                  {activeInspectToken.status === "missing" && (
                    <button
                      type="button"
                      className="inspector-drill-btn"
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
          <div className="pronunciation-clinic-box">
            <div className="clinic-header">
              <div className="clinic-title-row">
                <span className="clinic-icon-badge">🩺</span>
                <div>
                  <h4 className="clinic-title">Hỗ trợ phát âm các từ chưa chuẩn ({missingTokens.length} từ)</h4>
                  <p className="clinic-desc">
                    Tích hợp phiên âm <strong>IPA chuẩn Anh - Mỹ (General American)</strong>, bấm nghe chậm 0.7x để rõ
                    khẩu hình hoặc luyện riêng từng từ:
                  </p>
                </div>
              </div>
              <button
                className="retry-whole-sentence-btn"
                onClick={toggleRecording}
                title="Bật lại mic để nói lại cả câu"
              >
                <RotateCcw size={14} />
                <span>Nói lại cả câu</span>
              </button>
            </div>

            <div className="clinic-words-list">
              {missingTokens.map((tok, idx) => {
                const word = tok.word.toLowerCase();
                const isFixed = drilledSuccessWords.has(word);
                const isCurrentlyDrilling = drillingWord === word;
                const americanIpa = getAmericanIpa(tok.word);

                return (
                  <div key={idx} className={`clinic-word-card ${isFixed ? "is-fixed" : ""}`}>
                    <div className="clinic-word-left">
                      <div className="clinic-word-title-group">
                        <span className="clinic-word-name">{tok.word}</span>
                        {americanIpa && (
                          <span className="clinic-word-ipa" title="Phiên âm chuẩn Anh - Mỹ (General American IPA)">
                            🇺🇸 {americanIpa}
                          </span>
                        )}
                      </div>
                      {isFixed ? (
                        <span className="badge-fixed-pill">✓ Đã sửa đúng!</span>
                      ) : (
                        <span className="badge-missing-pill">Cần chỉnh</span>
                      )}
                    </div>

                    <div className="clinic-word-actions">
                      {/* Standard Speed Audio */}
                      <button
                        type="button"
                        className="clinic-action-btn"
                        onClick={() => handlePlayWord(tok.word, 1.0)}
                        title={`Nghe chuẩn tốc độ 1.0x của từ "${tok.word}"`}
                      >
                        <Volume2 size={14} />
                        <span>Chuẩn 1.0x</span>
                      </button>

                      {/* Slow Turtle Audio */}
                      <button
                        type="button"
                        className="clinic-action-btn slow-btn"
                        onClick={() => handlePlayWord(tok.word, 0.7)}
                        title={`Nghe chậm 0.7x để nghe rõ trọng âm & âm đuôi của từ "${tok.word}"`}
                      >
                        <span>🐢 Chậm 0.7x</span>
                      </button>

                      {/* Drill This Single Word */}
                      <button
                        type="button"
                        className={`clinic-drill-btn ${isCurrentlyDrilling ? "drilling" : ""} ${isFixed ? "passed" : ""}`}
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
              <div className="clinic-misheard-row">
                <span className="misheard-label">⚠️ Các từ máy nghe nhầm thành:</span>
                <div className="misheard-chips">
                  {extraTokens.map((w, i) => {
                    const extraIpa = getAmericanIpa(w);
                    return (
                      <button
                        key={i}
                        type="button"
                        className="misheard-chip-btn"
                        onClick={() => handlePlayWord(w, 0.8)}
                        title={`Bấm để nghe thử từ máy nhận diện được: "${w}"`}
                      >
                        <span>{w}</span>
                        {extraIpa && <span className="misheard-chip-ipa">{extraIpa}</span>}
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
      <div className="srs-rating-container">
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
            onClick={() => onRate(1, evalResult?.accuracy || 0)}
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
            onClick={() => onRate(3, evalResult?.accuracy || 0)}
            title="Đã thuộc câu này, chuyển tiếp tục (Phím tắt: Enter hoặc 2)"
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
  );
};
