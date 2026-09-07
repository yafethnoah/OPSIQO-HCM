export interface BrowserVoiceCapture {
  listen(locale?: string): Promise<string>;
  stop(): void;
}

export interface BrowserVoiceSpeaker {
  speak(text: string, locale?: string): void;
  cancel(): void;
}

interface SpeechRecognitionResultLike {
  0?: { transcript?: string };
  isFinal?: boolean;
}

interface SpeechRecognitionEventLike {
  results?: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function browserRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;

  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export class BrowserSpeechCapture implements BrowserVoiceCapture {
  private recognition: SpeechRecognitionLike | null = null;

  async listen(locale = 'en-CA'): Promise<string> {
    const Constructor = browserRecognitionConstructor();

    if (!Constructor) {
      throw new Error('browser speech recognition is unavailable');
    }

    return new Promise<string>((resolve, reject) => {
      const recognition = new Constructor();
      this.recognition = recognition;
      recognition.lang = locale;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        let transcript = '';

        for (let i = 0; i < (event.results?.length ?? 0); i += 1) {
          const item = event.results?.[i];
          if (!item?.isFinal) continue;
          transcript += ` ${item[0]?.transcript ?? ''}`;
        }

        const normalized = transcript.trim();
        if (!normalized) {
          reject(new Error('speech recognition returned no transcript'));
          return;
        }

        resolve(normalized);
      };

      recognition.onerror = (event) => {
        reject(new Error(`speech recognition failed: ${event.error ?? 'unknown'}`));
      };

      recognition.onend = () => {
        this.recognition = null;
      };

      recognition.start();
    });
  }

  stop(): void {
    this.recognition?.stop();
    this.recognition = null;
  }
}

export class BrowserSpeechSpeaker implements BrowserVoiceSpeaker {
  speak(text: string, locale = 'en-CA'): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      throw new Error('browser speech synthesis is unavailable');
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    window.speechSynthesis.speak(utterance);
  }

  cancel(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
