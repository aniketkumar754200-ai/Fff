import { useMemo, useState } from 'react';
import {
  MessageSquare,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Conversation } from '../types/chat';
import { formatRelativeDateGroup } from '../utils/storage';
import { BrandEmblem } from './BrandEmblem';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
}

const GROUP_ORDER = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];

export function Sidebar({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onOpenSettings,
}: SidebarProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Conversation[]>();
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

    for (const convo of sorted) {
      const label = formatRelativeDateGroup(convo.updatedAt);
      const list = map.get(label) ?? [];
      list.push(convo);
      map.set(label, list);
    }

    return GROUP_ORDER.filter((label) => map.has(label)).map((label) => ({
      label,
      items: map.get(label) ?? [],
    }));
  }, [conversations]);

  const handleSelect = (id: string) => {
    setConfirmDeleteId(null);
    onSelectConversation(id);
    onClose();
  };

  const handleNew = () => {
    setConfirmDeleteId(null);
    onNewChat();
    onClose();
  };

  const sidebarBody = (
    <div className="h-full flex flex-col bg-white dark:bg-[#0B1122] border-r border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-slate-100">
      {/* Sidebar Top Brand & Mobile Close */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/70 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandEmblem size="sm" />
          <span className="font-display font-bold text-base tracking-tight whitespace-nowrap truncate">
            Aniket AI
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="lg:hidden min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* New Chat Primary Action */}
      <div className="p-3 shrink-0">
        <button
          type="button"
          onClick={handleNew}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#273B8C] via-[#4F46E5] to-[#7C3AED] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-950/20 hover:brightness-110 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Saved Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 aniket-scroll">
        {grouped.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <MessageSquare className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-700 mb-2.5" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No saved chats yet
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Your conversations are saved privately on this device.
            </p>
          </div>
        ) : (
          <div className="space-y-5 pb-4">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="px-2.5 pb-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {group.label}
                </div>
                <ul className="space-y-1">
                  {group.items.map((convo) => {
                    const isActive = convo.id === activeConversationId;
                    const isConfirming = confirmDeleteId === convo.id;

                    return (
                      <li key={convo.id}>
                        <div
                          className={`group flex items-center gap-1 rounded-xl transition-colors ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-[#17213E] text-indigo-950 dark:text-white border border-indigo-200/80 dark:border-violet-500/30'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelect(convo.id)}
                            className="flex-1 min-w-0 min-h-[44px] px-3 py-2 text-left flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-xl"
                          >
                            <MessageSquare
                              className={`w-4 h-4 shrink-0 ${
                                isActive
                                  ? 'text-violet-600 dark:text-violet-400'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            />
                            <span className="text-sm font-medium truncate">
                              {convo.title}
                            </span>
                          </button>

                          {isConfirming ? (
                            <div className="flex items-center gap-1 pr-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteConversation(convo.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="min-h-[34px] px-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="min-h-[34px] px-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium"
                              >
                                Keep
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(convo.id)}
                              aria-label={`Delete conversation ${convo.title}`}
                              title="Delete conversation"
                              className="min-h-[40px] min-w-[40px] mr-0.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Settings Button */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/70 shrink-0">
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            onClose();
          }}
          className="w-full min-h-[44px] px-3 py-2 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 h-full">
        {sidebarBody}
      </aside>

      {/* Mobile slide-over drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-[82vw] max-w-[300px] h-full shadow-2xl"
              aria-label="Chat history navigation"
            >
              {sidebarBody}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
