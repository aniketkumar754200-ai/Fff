import type {
  Conversation,
  LanguagePreference,
  ThemeMode,
} from '../types/chat';

const CONVERSATIONS_KEY = 'aniket-ai-conversations-v1';
const ACTIVE_ID_KEY = 'aniket-ai-active-id-v1';
const THEME_KEY = 'aniket-ai-theme';
const LANGUAGE_KEY = 'aniket-ai-language';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Conversation =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        Array.isArray(item.messages)
    );
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch {
    // Ignore quota exceeded errors gracefully
  }
}

export function clearAllConversationsStorage(): void {
  try {
    localStorage.removeItem(CONVERSATIONS_KEY);
    localStorage.removeItem(ACTIVE_ID_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_ID_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_ID_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

export function loadLanguagePreference(): LanguagePreference {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (
      saved === 'auto' ||
      saved === 'english' ||
      saved === 'hindi' ||
      saved === 'hinglish'
    ) {
      return saved;
    }
    return 'auto';
  } catch {
    return 'auto';
  }
}

export function saveLanguagePreference(language: LanguagePreference): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Ignore storage errors
  }
}

export function createConversationTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New Conversation';
  if (cleaned.length <= 42) return cleaned;
  return `${cleaned.slice(0, 42).trimEnd()}...`;
}

export function formatRelativeDateGroup(timestamp: number): string {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;

  if (timestamp >= startOfToday) return 'Today';
  if (timestamp >= startOfYesterday) return 'Yesterday';
  if (timestamp >= startOfWeek) return 'Previous 7 Days';
  return 'Older';
}
