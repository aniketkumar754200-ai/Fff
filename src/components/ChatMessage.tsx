import { useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertCircle,
  Check,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { ChatMessageItem } from '../types/chat';
import { BrandEmblem } from './BrandEmblem';

interface ChatMessageProps {
  message: ChatMessageItem;
  isStreaming: boolean;
  isLastModelMessage: boolean;
  onCopy: (text: string) => Promise<void> | void;
  onRegenerate: (messageId: string) => void;
}

function CodeBlockWithCopy({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const extractCodeText = (node: ReactNode): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractCodeText).join('');
    if (node && typeof node === 'object' && 'props' in node) {
      const element = node as { props?: { children?: ReactNode } };
      return extractCodeText(element.props?.children);
    }
    return '';
  };

  const handleCopyCode = async () => {
    const code = extractCodeText(children).replace(/\n$/, '');
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="relative group my-3">
      <button
        type="button"
        onClick={handleCopyCode}
        aria-label="Copy code snippet"
        className="absolute right-2.5 top-2.5 min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </>
        )}
      </button>
      <pre className="pt-10">{children}</pre>
    </div>
  );
}

export function ChatMessage({
  message,
  isStreaming,
  isLastModelMessage,
  onCopy,
  onRegenerate,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await onCopy(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-end w-full"
      >
        <div className="max-w-[88%] sm:max-w-[78%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-br from-[#273B8C] via-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-950/20">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {message.text}
          </p>
        </div>
      </motion.div>
    );
  }

  const showTypingDots = isStreaming && message.text.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 w-full"
    >
      <BrandEmblem size="sm" className="mt-1 hidden sm:block" />

      <div className="min-w-0 flex-1 max-w-full sm:max-w-[88%]">
        <div className="flex items-center gap-2 mb-1.5 sm:hidden">
          <BrandEmblem size="sm" className="!w-6 !h-6 !rounded-md" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Aniket AI
          </span>
        </div>

        <div
          className={`rounded-2xl rounded-tl-md px-4 py-3.5 border transition-colors ${
            message.isError
              ? 'bg-red-50/90 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
              : 'bg-white dark:bg-[#11192E] border-slate-200/90 dark:border-slate-800/90 text-slate-800 dark:text-slate-100 shadow-sm'
          }`}
        >
          {showTypingDots ? (
            <div
              className="flex items-center gap-2 py-1 text-slate-500 dark:text-slate-400"
              aria-label="Aniket AI is thinking"
            >
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
              </span>
              <span className="text-xs font-medium">Thinking...</span>
            </div>
          ) : message.isError ? (
            <div className="flex items-start gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{message.text}</p>
            </div>
          ) : (
            <div className="aniket-prose">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ children }) => (
                    <CodeBlockWithCopy>{children}</CodeBlockWithCopy>
                  ),
                }}
              >
                {message.text}
              </Markdown>
            </div>
          )}
        </div>

        {!isStreaming && (message.text.length > 0 || message.isError) && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {!message.isError && (
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[40px] sm:min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                aria-label="Copy response"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Copied
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            {(isLastModelMessage || message.isError) && (
              <button
                type="button"
                onClick={() => onRegenerate(message.id)}
                className="min-h-[40px] sm:min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                aria-label={message.isError ? 'Retry response' : 'Regenerate response'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{message.isError ? 'Retry' : 'Regenerate'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
