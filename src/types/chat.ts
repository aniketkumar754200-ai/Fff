export type ThemeMode = 'dark' | 'light';

export type LanguagePreference = 'auto' | 'english' | 'hindi' | 'hinglish';

export type MessageRole = 'user' | 'model';

export interface ChatMessageItem {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: number;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessageItem[];
  createdAt: number;
  updatedAt: number;
}

export interface StarterPrompt {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  languageTag: string;
}
