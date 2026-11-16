import { useState } from 'react';
import {
  Check,
  Languages,
  Moon,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { LanguagePreference, ThemeMode } from '../types/chat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  languagePreference: LanguagePreference;
  onLanguageChange: (language: LanguagePreference) => void;
  conversationCount: number;
  onClearAllHistory: () => void;
}

const LANGUAGE_OPTIONS: {
  id: LanguagePreference;
  label: string;
  description: string;
}[] = [
  {
    id: 'auto',
    label: 'Auto-Detect',
    description: 'Matches English, Hindi, or Hinglish automatically',
  },
  {
    id: 'english',
    label: 'English',
    description: 'Clear, simple English explanations',
  },
  {
    id: 'hindi',
    label: 'हिन्दी (Hindi)',
    description: 'सरल और स्पष्ट देवनागरी हिंदी',
  },
  {
    id: 'hinglish',
    label: 'Hinglish',
    description: 'Hindi words in English letters (e.g. "Step-by-step samjho")',
  },
];

export function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  languagePreference,
  onLanguageChange,
  conversationCount,
  onClearAllHistory,
}: SettingsModalProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClose = () => {
    setConfirmClear(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-md max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#10182C] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-slate-100"
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-5">
              <h2
                id="settings-title"
                className="text-lg font-bold tracking-tight"
              >
                Settings
              </h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close settings"
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Theme Selection */}
            <section className="mb-6">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
                Appearance
              </h3>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#0A1020] border border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    theme === 'dark'
                      ? 'bg-[#17213E] text-white shadow-sm border border-violet-500/40'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark Navy</span>
                </button>

                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    theme === 'light'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Light</span>
                </button>
              </div>
            </section>

            {/* Language Preference */}
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-2.5">
                <Languages className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Response & Voice Language
                </h3>
              </div>
              <div className="space-y-2">
                {LANGUAGE_OPTIONS.map((option) => {
                  const active = languagePreference === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onLanguageChange(option.id)}
                      className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                        active
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-violet-500 text-slate-900 dark:text-white'
                          : 'bg-slate-50/70 dark:bg-[#0B1224] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">
                          {option.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {option.description}
                        </div>
                      </div>
                      {active && (
                        <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Clear Chat History */}
            <section className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-semibold">Chat History</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {conversationCount}{' '}
                    {conversationCount === 1
                      ? 'saved conversation'
                      : 'saved conversations'}{' '}
                    on this device
                  </p>
                </div>
              </div>

              {confirmClear ? (
                <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60">
                  <p className="text-xs font-medium text-red-800 dark:text-red-200 mb-3">
                    Delete all saved conversations permanently?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllHistory();
                        setConfirmClear(false);
                        onClose();
                      }}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                    >
                      Yes, Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={conversationCount === 0}
                  onClick={() => setConfirmClear(true)}
                  className="mt-2 w-full min-h-[44px] px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Chat History</span>
                </button>
              )}
            </section>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
