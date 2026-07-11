import type React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'Back',
}) => (
  <button
    type="button"
    onClick={onClick}
    className="
      inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full
      border-none bg-transparent px-2 type-strong text-brand transition-smooth
      hover:bg-brand/8
    "
  >
    <ArrowLeft size={16} aria-hidden="true" />
    {label}
  </button>
);
