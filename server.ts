import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LanguagePreference = 'auto' | 'english' | 'hindi' | 'hinglish';

interface ClientMessage {
  role: 'user' | 'model';
  text: string;
}

const PORT = Number(process.env.PORT) || 3000;

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(language: LanguagePreference): string {
  const languageDirective: Record<LanguagePreference, string> = {
    auto: 'Detect the user’s language and script automatically. If they write in English, reply in English. If they write in Hindi (Devanagari), reply in Hindi (Devanagari). If they write in Hinglish (Hindi words written in Latin/English letters), reply naturally in Hinglish. Always match the user’s chosen language unless they explicitly ask you to translate or switch.',
    english:
      'Respond primarily in clear, natural English unless the user explicitly asks for a translation or phrase in another language.',
    hindi:
      'Respond primarily in natural, clear Hindi using Devanagari script (हिन्दी), keeping technical terms easy to understand, unless the user explicitly asks for another language.',
    hinglish:
      'Respond primarily in natural, friendly Hinglish (Hindi written in English/Latin letters, easy to read on mobile), unless the user explicitly asks for another language.',
  };

  return [
    'You are Aniket AI, a friendly, calm, and deeply helpful personal AI assistant.',
    languageDirective[language] || languageDirective.auto,
    'Communication style:',
    '- Explain difficult or technical topics in simple, everyday words that anyone can grasp.',
    '- When explaining a concept, problem, or how-to guide, give clear step-by-step educational explanations using numbered steps, short paragraphs, and practical examples.',
    '- Keep answers well-structured, concise enough for mobile reading, yet thorough when depth is needed.',
    '- Never pretend to know something you do not know. If you are uncertain, lack real-time information, or cannot verify a detail, state that honestly and explain what you do know or how the user can verify it.',
    '- Respect user privacy: never ask for passwords, banking credentials, government IDs, or unnecessary personal information.',
  ].join('\n');
}

function getSafeErrorMessage(error: unknown): { status: number; message: string } {
  if (error instanceof Error && error.message === 'MISSING_API_KEY') {
    return {
      status: 503,
      message:
        'AI service is not configured yet. Please ensure GEMINI_API_KEY is set in the Settings > Secrets panel.',
    };
  }

  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const lower = raw.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('403') ||
    lower.includes('401')
  ) {
    return {
      status: 401,
      message:
        'Unable to authenticate with the AI service. Please check the API key in Settings > Secrets.',
    };
  }

  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      message: 'Too many requests right now. Please wait a few seconds and try again.',
    };
  }

  if (lower.includes('404') || lower.includes('not_found')) {
    return {
      status: 502,
      message: 'The AI model is temporarily unavailable. Please try again in a moment.',
    };
  }

  return {
    status: 500,
    message: 'Something went wrong while generating a response. Please try again.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'Aniket AI' });
  });

  app.post('/api/chat/stream', async (req, res) => {
    const body = req.body as {
      messages?: ClientMessage[];
      languagePreference?: LanguagePreference;
    };

    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const cleaned = incoming
      .filter(
        (m): m is ClientMessage =>
          Boolean(m) &&
          (m.role === 'user' || m.role === 'model') &&
          typeof m.text === 'string' &&
          m.text.trim().length > 0
      )
      .slice(-30);

    if (cleaned.length === 0) {
      res.status(400).json({ error: 'Please enter a message before sending.' });
      return;
    }

    const languagePreference: LanguagePreference =
      body?.languagePreference === 'english' ||
      body?.languagePreference === 'hindi' ||
      body?.languagePreference === 'hinglish'
        ? body.languagePreference
        : 'auto';

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let clientDisconnected = false;
    res.on('close', () => {
      if (!res.writableFinished) {
        clientDisconnected = true;
      }
    });

    const sendEvent = (payload: Record<string, unknown>) => {
      if (!clientDisconnected && !res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    try {
      const ai = createGeminiClient();
      const contents = cleaned.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const stream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: buildSystemInstruction(languagePreference),
        },
      });

      for await (const chunk of stream) {
        if (clientDisconnected) {
          break;
        }
        const chunkText = chunk.text;
        if (chunkText) {
          sendEvent({ text: chunkText });
        }
      }

      sendEvent({ done: true });
      if (!res.writableEnded) {
        res.end();
      }
    } catch (error) {
      console.error('[Aniket AI /api/chat/stream error]:', error);
      const { message } = getSafeErrorMessage(error);
      sendEvent({ error: message });
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  app.post('/api/transcribe', async (req, res) => {
    const body = req.body as {
      audioBase64?: string;
      mimeType?: string;
      languagePreference?: LanguagePreference;
    };

    if (!body?.audioBase64 || typeof body.audioBase64 !== 'string') {
      res.status(400).json({ error: 'No audio data received.' });
      return;
    }

    const mimeType =
      typeof body.mimeType === 'string' && body.mimeType.startsWith('audio/')
        ? body.mimeType.split(';')[0]
        : 'audio/webm';

    const langHint =
      body.languagePreference === 'hindi'
        ? 'The speaker is likely speaking Hindi (Devanagari).'
        : body.languagePreference === 'hinglish'
          ? 'The speaker may be speaking Hindi/Hinglish or English.'
          : 'The speaker may be speaking English, Hindi, or Hinglish.';

    try {
      const ai = createGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: body.audioBase64,
              },
            },
            {
              text: `Transcribe the spoken words accurately into clean text. ${langHint} Return only the transcribed text without quotes or commentary.`,
            },
          ],
        },
      });

      res.json({ text: (response.text ?? '').trim() });
    } catch (error) {
      console.error('[Aniket AI /api/transcribe error]:', error);
      const { status, message } = getSafeErrorMessage(error);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aniket AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
