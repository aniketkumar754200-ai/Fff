import type { LanguagePreference } from '../types/chat';

export interface ApiMessagePayload {
  role: 'user' | 'model';
  text: string;
}

interface StreamCallbacks {
  onChunk: (textChunk: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function streamChatResponse(
  messages: ApiMessagePayload[],
  languagePreference: LanguagePreference,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        languagePreference,
      }),
      signal,
    });

    if (!response.ok) {
      let errorMessage = 'Unable to reach Aniket AI right now. Please try again.';
      try {
        const data = (await response.json()) as { error?: string };
        if (data?.error) errorMessage = data.error;
      } catch {
        // Use fallback error message
      }
      callbacks.onError(errorMessage);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('Streaming is not supported in this browser.');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr) as {
            text?: string;
            done?: boolean;
            error?: string;
          };

          if (parsed.error) {
            callbacks.onError(parsed.error);
            return;
          }
          if (typeof parsed.text === 'string' && parsed.text.length > 0) {
            callbacks.onChunk(parsed.text);
          }
          if (parsed.done) {
            finished = true;
            callbacks.onDone();
            return;
          }
        } catch {
          // Ignore malformed SSE fragment
        }
      }
    }

    if (!finished) {
      callbacks.onDone();
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      callbacks.onDone();
      return;
    }
    callbacks.onError(
      'Network connection interrupted. Please check your internet and try again.'
    );
  }
}

export async function transcribeAudioBlob(
  blob: Blob,
  languagePreference: LanguagePreference
): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read recorded audio.'));
    reader.readAsDataURL(blob);
  });

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64: base64,
      mimeType: blob.type || 'audio/webm',
      languagePreference,
    }),
  });

  const data = (await response.json()) as { text?: string; error?: string };
  if (!response.ok) {
    throw new Error(data?.error || 'Could not transcribe voice recording.');
  }

  return (data.text || '').trim();
}
