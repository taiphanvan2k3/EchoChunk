// Speech Synthesis (TTS) & Web Speech Recognition (STT) + Continuous Stream & Mobile Deduplication
import { SpeechEvalResult, WordMatchToken } from '@/types';

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface CustomWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

function cleanDuplicateWords(text: string): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  const cleaned: string[] = [];
  for (let i = 0; i < words.length; i++) {
    // If consecutive identical word (case-insensitive) caused by mobile STT stutter
    if (i > 0 && words[i].toLowerCase() === words[i - 1].toLowerCase()) {
      continue;
    }
    cleaned.push(words[i]);
  }
  return cleaned.join(' ');
}

function mergeAndDeduplicate(finalText: string, interimText: string): string {
  const f = finalText.trim();
  const i = interimText.trim();

  if (!f) return cleanDuplicateWords(i);
  if (!i) return cleanDuplicateWords(f);

  // Case 1: Interim re-emits entire sentence starting with finalText
  if (i.toLowerCase().startsWith(f.toLowerCase())) {
    return cleanDuplicateWords(i);
  }

  // Case 2: Final text already contains the interim
  if (f.toLowerCase().endsWith(i.toLowerCase())) {
    return cleanDuplicateWords(f);
  }

  // Case 3: Overlap between end of finalText and start of interimText
  const fWords = f.split(/\s+/);
  const iWords = i.split(/\s+/);

  let maxOverlap = 0;
  const maxCheck = Math.min(fWords.length, iWords.length);
  for (let len = maxCheck; len >= 1; len--) {
    const fSub = fWords.slice(-len).join(' ').toLowerCase();
    const iSub = iWords.slice(0, len).join(' ').toLowerCase();
    if (fSub === iSub) {
      maxOverlap = len;
      break;
    }
  }

  if (maxOverlap > 0) {
    const remainingInterim = iWords.slice(maxOverlap).join(' ');
    const merged = remainingInterim ? `${f} ${remainingInterim}` : f;
    return cleanDuplicateWords(merged);
  }

  return cleanDuplicateWords(`${f} ${i}`);
}

class SpeechService {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCombinedTranscript = '';
  private silenceTimeoutMs = 2500; // 2.5s natural pause tolerance for snappy feedback
  private persistentStream: MediaStream | null = null;
  private hasFinalized = false;

  private onInterimCb: ((text: string) => void) | null = null;
  private onFinalCb: ((text: string) => void) | null = null;
  private onErrorCb: ((err: string) => void) | null = null;
  private onEndCb: (() => void) | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window !== 'undefined') {
      const win = window as CustomWindow;
      const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionConstructor) {
        this.recognition = new SpeechRecognitionConstructor();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.setupRecognitionHandlers();
      }
    }
  }

  private setupRecognitionHandlers() {
    if (!this.recognition) return;

    this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalStr = '';
      let interimStr = '';

      for (let i = 0; i < event.results.length; ++i) {
        const res = event.results[i];
        const text = res[0]?.transcript || '';
        if (res.isFinal) {
          finalStr += text + ' ';
        } else {
          interimStr += text + ' ';
        }
      }

      const combined = mergeAndDeduplicate(finalStr, interimStr);
      this.lastCombinedTranscript = combined;

      if (this.onInterimCb) {
        this.onInterimCb(combined);
      }

      // Reset silence timer on any speech detected
      this.resetSilenceTimer();
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === 'no-speech') {
        return;
      }
      this.clearSilenceTimer();
      this.isListening = false;
      this.hasFinalized = true;

      if (this.onErrorCb) {
        this.onErrorCb(event.error || 'Lỗi nhận diện âm thanh');
      }
    };

    this.recognition.onend = () => {
      // Trigger finalization if not already done by timer or stopListening
      this.finalizeRecognition();
    };
  }

  /**
   * Finalize recognition safely and trigger onFinalCb for evaluation.
   */
  private finalizeRecognition() {
    this.clearSilenceTimer();

    if (this.hasFinalized) {
      return;
    }
    this.hasFinalized = true;
    this.isListening = false;

    const finalResult = this.lastCombinedTranscript.trim();

    // Call onFinalCb so evaluation runs reliably
    if (this.onFinalCb) {
      const cb = this.onFinalCb;
      this.onFinalCb = null;
      cb(finalResult);
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    if (this.onEndCb) {
      const endCb = this.onEndCb;
      this.onEndCb = null;
      endCb();
    }
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    const hasSpoken = this.lastCombinedTranscript.trim().length > 0;

    if (this.silenceTimeoutMs > 0 && hasSpoken) {
      this.silenceTimer = setTimeout(() => {
        if (this.isListening) {
          // Natural silence timeout reached -> finalize & evaluate!
          this.finalizeRecognition();
        }
      }, this.silenceTimeoutMs);
    }
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  isRecognitionSupported(): boolean {
    return !!this.recognition;
  }

  async ensureMicrophonePermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return true;
    }
    if (this.persistentStream && this.persistentStream.active) {
      return true;
    }
    try {
      this.persistentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch {
      return false;
    }
  }

  speak(text: string, rate: number = 1.0, onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*_`]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')) &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel'))
      ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  async startListening(
    onInterimResult: (transcript: string) => void,
    onFinalResult: (transcript: string) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    silenceTimeoutMs: number = 2500
  ) {
    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) {
      onError('Trình duyệt không hỗ trợ Web Speech API. Bạn nên dùng Google Chrome hoặc Microsoft Edge.');
      return;
    }

    if (this.isListening) {
      this.finalizeRecognition();
    }

    await this.ensureMicrophonePermission();

    this.lastCombinedTranscript = '';
    this.hasFinalized = false;
    this.silenceTimeoutMs = silenceTimeoutMs;
    this.onInterimCb = onInterimResult;
    this.onFinalCb = onFinalResult;
    this.onErrorCb = onError;
    this.onEndCb = onEnd;
    this.isListening = true;

    try {
      this.recognition.start();
    } catch (e: unknown) {
      this.isListening = false;
      this.hasFinalized = true;
      const msg = e instanceof Error ? e.message : 'Không thể mở micro.';
      onError(msg);
    }
  }

  stopListening(): string {
    const result = this.lastCombinedTranscript.trim();
    this.finalizeRecognition();
    return result;
  }

  evaluatePronunciation(targetSentence: string, spokenText: string): SpeechEvalResult {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const targetWords = normalize(targetSentence);
    const spokenWords = normalize(spokenText);

    if (targetWords.length === 0) {
      return { transcript: spokenText, accuracy: 100, tokens: [] };
    }

    if (spokenWords.length === 0) {
      return {
        transcript: '',
        accuracy: 0,
        tokens: targetWords.map((w) => ({ word: w, status: 'missing' })),
      };
    }

    let matchCount = 0;
    const tokens: WordMatchToken[] = [];
    const targetSet = new Set(targetWords);

    targetWords.forEach((word) => {
      if (spokenWords.includes(word)) {
        matchCount++;
        tokens.push({ word, status: 'correct' });
      } else {
        tokens.push({ word, status: 'missing' });
      }
    });

    spokenWords.forEach((word) => {
      if (!targetSet.has(word)) {
        tokens.push({ word: `+${word}`, status: 'extra' });
      }
    });

    const accuracy = Math.min(100, Math.round((matchCount / targetWords.length) * 100));

    return {
      transcript: spokenText,
      accuracy,
      tokens,
    };
  }
}

export const speechService = new SpeechService();
