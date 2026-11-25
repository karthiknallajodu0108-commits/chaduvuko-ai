import React from 'react';

interface CareerPilotLogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export function CareerPilotLogo({
  variant = 'dark',
  size = 'md',
  showWordmark = true,
}: CareerPilotLogoProps) {
  const iconDim = size === 'sm' ? 26 : size === 'lg' ? 40 : 32;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const wordmarkColor = variant === 'light' ? 'text-white' : 'text-[#101828]';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width={iconDim}
        height={iconDim}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="10"
          fill={variant === 'light' ? '#142033' : '#101828'}
          stroke={variant === 'light' ? 'rgba(110,231,183,0.35)' : 'rgba(20,32,51,0.12)'}
          strokeWidth="1.25"
        />
        {/* Outer navigation orbit arc */}
        <path
          d="M10.5 26.5C8.5 21.8 9.8 15.8 14.1 12.2C18.4 8.6 24.8 8.7 28.9 12.4"
          stroke="#93C5FD"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        {/* Inner lavender trajectory sweep */}
        <path
          d="M29.8 20.5C29.4 25.7 25.1 29.8 19.8 29.8C17.2 29.8 14.8 28.8 13 27.2"
          stroke="#C4B5FD"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />
        {/* Forward compass / pilot vector */}
        <path
          d="M13.5 25.5L26.8 13.2L22.2 26.6L19.4 21.1L13.5 25.5Z"
          fill="#6EE7B7"
        />
        <circle cx="20" cy="20" r="1.5" fill="#101828" />
      </svg>
      {showWordmark && (
        <span className={`font-display font-bold tracking-tight ${textSize} ${wordmarkColor}`}>
          CHADHUVUKO
        </span>
      )}
    </span>
  );
}
