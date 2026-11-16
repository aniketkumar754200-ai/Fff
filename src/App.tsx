import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eraser,
  Menu,
  Plus,
  Settings,
} from 'lucide-react';
import { BrandEmblem } from './components/BrandEmblem';
import { ChatComposer } from './components/ChatComposer';
import { ChatMessage } from './components/ChatMessage';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { streamChatResponse } from './services/chatApi';
import type {
  ChatMessageItem,
  Conversation,
  LanguagePreference,
  ThemeMode,
} from './types/chat';
import {
  clearAllConversationsStorage,
  createConversationTitle,
  generateId,
  loadActiveConversationId,
  loadConversations,
  loadLanguagePreference,
  loadTheme,
  saveActiveConversationId,
  saveConversations,
  saveLanguagePreference,
  saveTheme,
} from './utils/storage';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversations()
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(() => {
    const savedId = loadActiveConversationId();
    const loaded = loadConversations();
    if (savedId && loaded.some((c) => c.id === savedId)) {
      return savedId;
    }
    return null;
  });

  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [languagePreference, setLanguagePreference] =
    useState<LanguagePreference>(() => loadLanguagePreference());

  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [confirmClearCurrent, setConfirmClearCurrent] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  // Persist theme & sync root HTML class + mobile browser theme-color
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute(
        'content',
        theme === 'dark' ? '#080D1A' : '#F8FAFC'
      );
    }
  }, [theme]);

  useEffect(() => {
    saveLanguagePreference(languagePreference);
  }, [languagePreference]);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    saveActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  // Auto-scroll smoothly when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length, streamingMessageId]);

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreamingMessageId(null);
  };

  const runAssistantStream = async (
    targetConversationId: string,
    historyMessages: ChatMessageItem[],
    assistantMessageId: string
  ) => {
    stopStreaming();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStreamingMessageId(assistantMessageId);

    const apiPayload = historyMessages
      .filter((m) => !m.isError && m.text.trim().length > 0)
      .map((m) => ({
        role: m.role,
        text: m.text,
      }));

    await streamChatResponse(
      apiPayload,
      languagePreference,
      {
        onChunk: (chunk) => {
          setConversations((prev) =>
            prev.map((convo) => {
              if (convo.id !== targetConversationId) return convo;
              return {
                ...convo,
                updatedAt: Date.now(),
                messages: convo.messages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, text: msg.text + chunk }
                    : msg
                ),
              };
            })
          );
        },
        onDone: () => {
          setStreamingMessageId((current) =>
            current === assistantMessageId ? null : current
          );
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
          // Clean up empty aborted placeholder if nothing arrived
          setConversations((prev) =>
            prev.map((convo) => {
              if (convo.id !== targetConversationId) return convo;
              return {
                ...convo,
                messages: convo.messages.filter(
                  (msg) =>
                    msg.id !== assistantMessageId ||
                    msg.text.trim().length > 0 ||
                    msg.isError
                ),
              };
            })
          );
        },
        onError: (errorMessage) => {
          setStreamingMessageId((current) =>
            current === assistantMessageId ? null : current
          );
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
          setConversations((prev) =>
            prev.map((convo) => {
              if (convo.id !== targetConversationId) return convo;
              return {
                ...convo,
                updatedAt: Date.now(),
                messages: convo.messages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, text: errorMessage, isError: true }
                    : msg
                ),
              };
            })
          );
        },
      },
      controller.signal
    );
  };

  const handleSendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text || streamingMessageId) return;

    setConfirmClearCurrent(false);
    if (!overrideText) {
      setInputText('');
    }

    const now = Date.now();
    const userMessage: ChatMessageItem = {
      id: generateId(),
      role: 'user',
      text,
      createdAt: now,
    };
    const assistantMessageId = generateId();
    const assistantPlaceholder: ChatMessageItem = {
      id: assistantMessageId,
      role: 'model',
      text: '',
      createdAt: now + 1,
    };

    let targetId = activeConversationId;
    let updatedHistory: ChatMessageItem[] = [];

    if (!targetId || !conversations.some((c) => c.id === targetId)) {
      const newId = generateId();
      const newConvo: Conversation = {
        id: newId,
        title: createConversationTitle(text),
        messages: [userMessage, assistantPlaceholder],
        createdAt: now,
        updatedAt: now,
      };
      targetId = newId;
      updatedHistory = [userMessage];
      setConversations((prev) => [newConvo, ...prev]);
      setActiveConversationId(newId);
    } else {
      const existing = conversations.find((c) => c.id === targetId)!;
      const cleanPrior = existing.messages.filter((m) => !m.isError);
      updatedHistory = [...cleanPrior, userMessage];

      setConversations((prev) =>
        prev.map((convo) => {
          if (convo.id !== targetId) return convo;
          const isFirstTurn = convo.messages.length === 0;
          return {
            ...convo,
            title: isFirstTurn ? createConversationTitle(text) : convo.title,
            updatedAt: now,
            messages: [...convo.messages, userMessage, assistantPlaceholder],
          };
        })
      );
    }

    await runAssistantStream(targetId, updatedHistory, assistantMessageId);
  };

  const handleRegenerate = async (messageId: string) => {
    if (!activeConversation || streamingMessageId) return;

    const msgIndex = activeConversation.messages.findIndex(
      (m) => m.id === messageId
    );
    if (msgIndex === -1) return;

    const priorMessages = activeConversation.messages
      .slice(0, msgIndex)
      .filter((m) => !m.isError);

    if (priorMessages.length === 0) return;

    const newAssistantId = generateId();
    const newPlaceholder: ChatMessageItem = {
      id: newAssistantId,
      role: 'model',
      text: '',
      createdAt: Date.now(),
    };

    const convoId = activeConversation.id;
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.id !== convoId) return convo;
        return {
          ...convo,
          updatedAt: Date.now(),
          messages: [...priorMessages, newPlaceholder],
        };
      })
    );

    await runAssistantStream(convoId, priorMessages, newAssistantId);
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback copy method if clipboard API is restricted
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      document.body.removeChild(helper);
    }
  };

  const handleNewChat = () => {
    stopStreaming();
    setConfirmClearCurrent(false);
    setActiveConversationId(null);
    setInputText('');
  };

  const handleSelectConversation = (id: string) => {
    if (id === activeConversationId) return;
    stopStreaming();
    setConfirmClearCurrent(false);
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    if (id === activeConversationId) {
      stopStreaming();
      setActiveConversationId(null);
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearCurrentConversation = () => {
    if (!activeConversation) return;
    stopStreaming();
    const idToRemove = activeConversation.id;
    setConversations((prev) => prev.filter((c) => c.id !== idToRemove));
    setActiveConversationId(null);
    setConfirmClearCurrent(false);
  };

  const handleClearAllHistory = () => {
    stopStreaming();
    clearAllConversationsStorage();
    setConversations([]);
    setActiveConversationId(null);
    setConfirmClearCurrent(false);
  };

  const lastModelMessageId = useMemo(() => {
    if (!activeConversation) return null;
    for (let i = activeConversation.messages.length - 1; i >= 0; i -= 1) {
      if (activeConversation.messages[i].role === 'model') {
        return activeConversation.messages[i].id;
      }
    }
    return null;
  }, [activeConversation]);

  const hasMessages =
    Boolean(activeConversation) && activeConversation!.messages.length > 0;

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 relative">
      {/* Subtle dark navy + purple atmospheric gradient backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="hidden dark:block absolute -top-40 -right-32 w-[34rem] h-[34rem] rounded-full bg-violet-600/12 blur-3xl" />
        <div className="hidden dark:block absolute -bottom-44 -left-32 w-[32rem] h-[32rem] rounded-full bg-indigo-700/15 blur-3xl" />
        <div className="dark:hidden absolute -top-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-violet-200/35 blur-3xl" />
      </div>

      {/* Left Sidebar / Mobile Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Chat Workspace */}
      <div className="relative flex-1 flex flex-col min-w-0 h-full">
        {/* Compact Top Bar (56px height, mobile-safe sticky cap) */}
        <header className="h-14 px-3 sm:px-5 flex items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#080D1A]/80 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open chat history"
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-1.5 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0 lg:hidden">
              <BrandEmblem size="sm" />
              <span className="font-display font-bold text-base tracking-tight whitespace-nowrap truncate">
                Aniket AI
              </span>
            </div>

            <div className="hidden lg:flex items-center min-w-0">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-md">
                {activeConversation ? activeConversation.title : 'Aniket AI'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasMessages &&
              (confirmClearCurrent ? (
                <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl px-2 py-1">
                  <span className="text-xs font-medium text-red-700 dark:text-red-300 hidden sm:inline">
                    Clear chat?
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCurrentConversation}
                    className="min-h-[32px] px-2.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearCurrent(false)}
                    className="min-h-[32px] px-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearCurrent(true)}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                  className="min-h-[44px] min-w-[44px] sm:px-3 rounded-xl text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 whitespace-nowrap"
                >
                  <Eraser className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              ))}

            {hasMessages && (
              <button
                type="button"
                onClick={handleNewChat}
                aria-label="Start new chat"
                title="New chat"
                className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
              title="Settings"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Chat Viewport or Welcome Screen */}
        <main className="flex-1 overflow-y-auto aniket-scroll">
          {!hasMessages ? (
            <div className="min-h-full flex flex-col">
              <WelcomeScreen
                languagePreference={languagePreference}
                onSelectPrompt={(prompt) => handleSendMessage(prompt)}
              />
            </div>
          ) : (
            <div className="w-full max-w-3xl mx-auto px-3 sm:px-5 py-5 sm:py-7 space-y-5">
              {activeConversation!.messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={streamingMessageId === msg.id}
                  isLastModelMessage={msg.id === lastModelMessageId}
                  onCopy={handleCopyMessage}
                  onRegenerate={handleRegenerate}
                />
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </main>

        {/* Bottom Composer */}
        <footer className="shrink-0 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-[#080D1A] dark:via-[#080D1A]/95 dark:to-transparent pt-2">
          <ChatComposer
            value={inputText}
            onChange={setInputText}
            onSend={() => handleSendMessage()}
            onStop={stopStreaming}
            isStreaming={streamingMessageId !== null}
            languagePreference={languagePreference}
          />
        </footer>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        languagePreference={languagePreference}
        onLanguageChange={setLanguagePreference}
        conversationCount={conversations.length}
        onClearAllHistory={handleClearAllHistory}
      />
    </div>
  );
}
