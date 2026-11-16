import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  ArrowUp,
  Loader2,
  Mic,
  MicOff,
  Square,
} from 'lucide-react';
import type { LanguagePreference } from '../types/chat';
import { transcribeAudioBlob } from '../services/chatApi';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  languagePreference: LanguagePreference;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
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
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function getSpeechLocale(language: LanguagePreference): string {
  switch (language) {
    case 'hindi':
    case 'hinglish':
      return 'hi-IN';
    case 'english':
      return 'en-IN';
    default:
      return 'en-IN';
  }
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  languagePreference,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const baseTextRef = useRef<string>('');

  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Auto-resize multiline textarea smoothly up to 160px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 160);
    el.style.height = `${nextHeight}px`;
  }, [value, interimText]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false);
  };

  const startMediaRecorderFallback = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsListening(false);

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size === 0) return;

        setIsTranscribing(true);
        try {
          const transcript = await transcribeAudioBlob(blob, languagePreference);
          if (transcript) {
            const prefix = value.trim().length > 0 ? `${value.trimEnd()} ` : '';
            onChange(`${prefix}${transcript}`);
          }
        } catch (err) {
          setVoiceError(
            err instanceof Error
              ? err.message
              : 'Could not transcribe voice recording.'
          );
        } finally {
          setIsTranscribing(false);
          textareaRef.current?.focus();
        }
      };

      recorder.start();
      setIsListening(true);
    } catch {
      setVoiceError(
        'Microphone access was denied. Please allow mic permission in browser settings.'
      );
      setIsListening(false);
    }
  };

  const toggleVoiceInput = async () => {
    setVoiceError(null);

    if (isListening) {
      stopListening();
      return;
    }

    const win = window as unknown as {
      AniketAndroidBridge?: {
        isAndroidApp?: () => boolean;
        startVoiceInput?: (localeTag: string) => void;
      };
      __onAniketAndroidSpeechResult?: (spokenText: string) => void;
      __onAniketAndroidSpeechError?: (errorMsg: string) => void;
    };

    if (win.AniketAndroidBridge?.startVoiceInput) {
      win.__onAniketAndroidSpeechResult = (spokenText: string) => {
        const cleaned = spokenText.trim();
        if (cleaned) {
          const prefix = value.trim().length > 0 ? `${value.trimEnd()} ` : '';
          onChange(`${prefix}${cleaned}`);
          textareaRef.current?.focus();
        }
      };
      win.__onAniketAndroidSpeechError = (errorMsg: string) => {
        if (errorMsg) {
          setVoiceError(errorMsg);
        }
      };
      win.AniketAndroidBridge.startVoiceInput(
        getSpeechLocale(languagePreference)
      );
      return;
    }

    const SpeechCtor = getSpeechRecognitionCtor();
    if (!SpeechCtor) {
      await startMediaRecorderFallback();
      return;
    }

    try {
      const recognition = new SpeechCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getSpeechLocale(languagePreference);

      baseTextRef.current = value.trim().length > 0 ? `${value.trimEnd()} ` : '';
      let finalized = '';

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalized += `${transcript.trim()} `;
          } else {
            interim += transcript;
          }
        }
        const combinedFinal = `${baseTextRef.current}${finalized}`.trimEnd();
        if (finalized) {
          onChange(combinedFinal);
        }
        setInterimText(interim.trim());
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError(
            'Microphone permission denied. Please enable microphone access to use voice input.'
          );
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Tap the microphone and speak clearly.');
        } else if (event.error !== 'aborted') {
          setVoiceError('Voice recognition paused. You can type or try again.');
        }
        setIsListening(false);
        setInterimText('');
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
        recognitionRef.current = null;
        textareaRef.current?.focus();
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      await startMediaRecorderFallback();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim().length > 0) {
        if (isListening) stopListening();
        onSend();
      }
    }
  };

  const handleSendClick = () => {
    if (isStreaming) {
      onStop();
      return;
    }
    if (value.trim().length === 0) return;
    if (isListening) stopListening();
    onSend();
  };

  const displayedValue =
    isListening && interimText
      ? `${value}${value.trim().length > 0 ? ' ' : ''}${interimText}`
      : value;

  const canSend = value.trim().length > 0 && !isTranscribing;

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pb-3 sm:pb-5 pt-2">
      {(isListening || isTranscribing || voiceError) && (
        <div className="mb-2 px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#11192E]/95 shadow-sm">
          {voiceError ? (
            <span className="text-red-600 dark:text-red-400">{voiceError}</span>
          ) : isTranscribing ? (
            <span className="flex items-center gap-2 text-indigo-700 dark:text-violet-300 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Converting your voice into text...
            </span>
          ) : (
            <span className="flex items-center gap-2 text-indigo-700 dark:text-violet-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Listening ({getSpeechLocale(languagePreference)}) — speak now, then review or send
            </span>
          )}
          {isListening && (
            <button
              type="button"
              onClick={stopListening}
              className="px-2 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-medium hover:bg-red-500/20 transition-colors shrink-0"
            >
              Stop
            </button>
          )}
        </div>
      )}

      <div className="relative flex items-end gap-2 p-2 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-900/5 dark:shadow-black/30 focus-within:border-violet-500 dark:focus-within:border-violet-500 transition-colors">
        <button
          type="button"
          onClick={toggleVoiceInput}
          disabled={isTranscribing || isStreaming}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          title={isListening ? 'Stop listening' : 'Voice input'}
          className={`min-h-[44px] min-w-[44px] rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 ${
            isListening
              ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
        >
          {isTranscribing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={displayedValue}
          onChange={(e) => {
            setInterimText('');
            onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask Aniket AI in English, Hindi, or Hinglish..."
          aria-label="Message Aniket AI"
          className="flex-1 min-h-[44px] max-h-[160px] py-2.5 px-1 bg-transparent text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus:outline-none aniket-scroll leading-relaxed"
        />

        <button
          type="button"
          onClick={handleSendClick}
          disabled={!isStreaming && !canSend}
          aria-label={isStreaming ? 'Stop generating response' : 'Send message'}
          title={isStreaming ? 'Stop' : 'Send'}
          className={`min-h-[44px] min-w-[44px] rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 active:scale-95 ${
            isStreaming
              ? 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700'
              : canSend
                ? 'bg-gradient-to-br from-[#273B8C] via-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-900/25 hover:brightness-110'
                : 'bg-slate-100 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          {isStreaming ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <ArrowUp className="w-5 h-5" />
          )}
        </button>
      </div>

      <p className="hidden sm:block mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        Enter to send · Shift + Enter for new line · Aniket AI can make mistakes, verify important facts
      </p>
    </div>
  );
}
