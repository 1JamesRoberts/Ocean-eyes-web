import type React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  heroOverlay?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'Back',
  heroOverlay = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={heroOverlay
      ? 'hero-overlay-pill cursor-pointer'
      : `
        inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full
        border-none bg-transparent px-2 type-strong text-pine-teal transition-smooth
        hover:bg-pine-teal/8
      `}
  >
    <ArrowLeft size={16} aria-hidden="true" />
    {label}
  </button>
);
