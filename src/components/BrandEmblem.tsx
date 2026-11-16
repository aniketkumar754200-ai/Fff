import { useState } from 'react';

interface BrandEmblemProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-8 h-8 rounded-[10px]',
  md: 'w-9 h-9 rounded-[11px]',
  lg: 'w-20 h-20 rounded-[22px]',
};

const LOGO_SRC = '/src/assets/images/aniket_ai_logo_3d_1794834195022.jpg';

export function BrandEmblem({ size = 'md', className = '' }: BrandEmblemProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <div
        className={`${SIZE_CLASSES[size]} bg-[#050507] border border-violet-500/35 flex items-center justify-center shadow-lg shadow-violet-950/40 shrink-0 select-none ${className}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 36 36"
          className={size === 'lg' ? 'w-11 h-11' : 'w-5 h-5'}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="aniket-a-grad"
              x1="4"
              y1="4"
              x2="32"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
          </defs>
          <path
            d="M18 4L6 31H11.5L14.2 24.5H21.8L24.5 31H30L18 4ZM16.1 19.8L18 14.8L19.9 19.8H16.1Z"
            fill="url(#aniket-a-grad)"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`${SIZE_CLASSES[size]} overflow-hidden bg-[#050507] border border-violet-400/25 shadow-lg shadow-indigo-950/35 ring-1 ring-inset ring-white/5 shrink-0 ${className}`}
    >
      <img
        src={LOGO_SRC}
        alt="Aniket AI logo"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-full h-full object-cover scale-[1.03]"
      />
    </div>
  );
}
