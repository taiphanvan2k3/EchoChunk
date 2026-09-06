// Speech Synthesis (TTS) & Web Speech Recognition (STT) + Continuous Stream
import { SpeechEvalResult, WordMatchToken } from '@/types';

class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private silenceTimer: any = null;
  private accumulatedFinalTranscript = '';
  private currentInterimTranscript = '';
  private silenceTimeoutMs = 3500; // 3.5s natural pause tolerance

  private onInterimCb: ((text: string) => void) | null = null;
  private onFinalCb: ((text: string) => void) | null = null;
  private onErrorCb: ((err: string) => void) | null = null;
  private onEndCb: (() => void) | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        // Continuous mode = TRUE: Do not abort when user pauses or takes a breath
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

    this.recognition.onresult = (event: any) => {
      let finalBatch = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          finalBatch += res[0].transcript + ' ';
        } else {
          interim += res[0].transcript;
        }
      }

      if (finalBatch) {
        this.accumulatedFinalTranscript = (this.accumulatedFinalTranscript + ' ' + finalBatch).trim();
      }
      this.currentInterimTranscript = interim.trim();

      const combinedText = [this.accumulatedFinalTranscript, this.currentInterimTranscript]
        .filter(Boolean)
        .join(' ')
        .trim();

      if (this.onInterimCb) {
        this.onInterimCb(combinedText);
      }

      // Reset silence timer on any speech detection
      this.resetSilenceTimer();
    };

    this.recognition.onerror = (event: any) => {
      // 'no-speech' is a normal transient pause event in Web Speech API; ignore it
      if (event.error === 'no-speech') {
        return;
      }
      this.isListening = false;
      this.clearSilenceTimer();
      if (this.onErrorCb) {
        this.onErrorCb(event.error || 'Lỗi nhận diện âm thanh');
      }
    };

    this.recognition.onend = () => {
      const wasListening = this.isListening;
      this.isListening = false;
      this.clearSilenceTimer();

      const combinedText = [this.accumulatedFinalTranscript, this.currentInterimTranscript]
        .filter(Boolean)
        .join(' ')
        .trim();

      if (wasListening && this.onFinalCb) {
        this.onFinalCb(combinedText);
      }

      if (this.onEndCb) {
        this.onEndCb();
      }
    };
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    const hasSpoken = (this.accumulatedFinalTranscript || this.currentInterimTranscript).trim().length > 0;
    
    if (this.silenceTimeoutMs > 0 && hasSpoken) {
      this.silenceTimer = setTimeout(() => {
        if (this.isListening) {
          // 3.5s silence after speaking -> auto-finalize
          this.stopListening();
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

  /**
   * Start listening with continuous stream & silence timeout.
   * Does NOT prematurely stop when the speaker takes a breath between clauses.
   */
  startListening(
    onInterimResult: (transcript: string) => void,
    onFinalResult: (transcript: string) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    silenceTimeoutMs: number = 3500
  ) {
    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) {
      onError('Trình duyệt không hỗ trợ Web Speech API. Bạn nên dùng Google Chrome hoặc Microsoft Edge.');
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.accumulatedFinalTranscript = '';
    this.currentInterimTranscript = '';
    this.silenceTimeoutMs = silenceTimeoutMs;
    this.onInterimCb = onInterimResult;
    this.onFinalCb = onFinalResult;
    this.onErrorCb = onError;
    this.onEndCb = onEnd;
    this.isListening = true;

    try {
      this.recognition.start();
    } catch (e: any) {
      this.isListening = false;
      onError(e.message || 'Không thể mở micro.');
    }
  }

  /**
   * Stop listening and trigger final evaluation.
   */
  stopListening(): string {
    this.clearSilenceTimer();
    const combinedText = [this.accumulatedFinalTranscript, this.currentInterimTranscript]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
    }

    return combinedText;
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
