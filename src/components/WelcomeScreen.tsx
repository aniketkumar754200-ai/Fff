import { BookOpen, Code2, Languages, PenLine } from 'lucide-react';
import { motion } from 'motion/react';
import type { LanguagePreference, StarterPrompt } from '../types/chat';
import { BrandEmblem } from './BrandEmblem';

interface WelcomeScreenProps {
  languagePreference: LanguagePreference;
  onSelectPrompt: (prompt: string) => void;
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: 'explain-step-by-step',
    title: 'Explain Quantum Computing',
    subtitle: 'Simple everyday words with step-by-step clarity',
    prompt:
      'Explain how quantum computers differ from normal laptops in simple words, step by step.',
    languageTag: 'English · Education',
  },
  {
    id: 'hinglish-coding',
    title: 'Python Coding Seekhein',
    subtitle: 'Beginners ke liye step-by-step roadmap',
    prompt:
      'Mujhe Python programming zero se seekhni hai. Simple Hinglish mein step-by-step guide batao.',
    languageTag: 'Hinglish · Coding',
  },
  {
    id: 'hindi-ai',
    title: 'AI कैसे काम करता है?',
    subtitle: 'सरल हिंदी में आसान उदाहरण के साथ समझें',
    prompt:
      'आर्टिफिशियल इंटेलिजेंस (AI) क्या है और यह रोज़मर्रा की ज़िंदगी में कैसे मदद करता है? सरल शब्दों में चरण-दर-चरण समझाएं।',
    languageTag: 'हिन्दी · विज्ञान',
  },
  {
    id: 'daily-writing',
    title: 'Draft a Polite Leave Email',
    subtitle: 'Clean, professional message ready to send',
    prompt:
      'Write a short, polite email to my manager requesting 2 days of personal leave next week.',
    languageTag: 'English · Writing',
  },
];

const PROMPT_ICONS = [BookOpen, Code2, Languages, PenLine];

function getGreetingCopy(language: LanguagePreference): {
  heading: string;
  subcopy: string;
} {
  switch (language) {
    case 'hindi':
      return {
        heading: 'नमस्ते, मैं Aniket AI हूँ',
        subcopy:
          'हिंदी, English या Hinglish में कोई भी सवाल पूछें। मैं कठिन विषयों को आसान शब्दों और चरण-दर-चरण तरीके से समझाऊँगा।',
      };
    case 'hinglish':
      return {
        heading: 'Namaste! Main hoon Aniket AI',
        subcopy:
          'Aap English, Hindi ya Hinglish mein kuch bhi pooch sakte hain. Main har topic ko simple words aur step-by-step tareeke se samjhaunga.',
      };
    default:
      return {
        heading: 'Namaste! I am Aniket AI',
        subcopy:
          'Ask anything in English, Hindi, or Hinglish. Get clear, honest, step-by-step explanations built for effortless reading.',
      };
  }
}

export function WelcomeScreen({
  languagePreference,
  onSelectPrompt,
}: WelcomeScreenProps) {
  const { heading, subcopy } = getGreetingCopy(languagePreference);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl mx-auto flex flex-col items-center text-center"
      >
        <div className="relative mb-5">
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-blue-600/10 blur-xl"
          />
          <BrandEmblem size="lg" className="relative" />
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
          {heading}
        </h1>

        <p className="mt-3 max-w-xl text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          {subcopy}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>English</span>
          <span aria-hidden="true">·</span>
          <span>हिन्दी</span>
          <span aria-hidden="true">·</span>
          <span>Hinglish</span>
          <span aria-hidden="true">·</span>
          <span>Voice Ready</span>
        </div>

        <div className="mt-8 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {STARTER_PROMPTS.map((item, idx) => {
            const Icon = PROMPT_ICONS[idx % PROMPT_ICONS.length];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPrompt(item.prompt)}
                className="group min-h-[44px] w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#10182C]/85 hover:bg-white dark:hover:bg-[#15203B] hover:border-violet-400/60 dark:hover:border-violet-500/50 transition-all duration-150 text-left flex items-start gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-center text-indigo-700 dark:text-violet-300 shrink-0 mt-0.5 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                    {item.languageTag}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
