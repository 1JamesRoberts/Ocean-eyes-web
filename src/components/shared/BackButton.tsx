import type React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="hero-overlay-pill cursor-pointer"
  >
    <ArrowLeft size={16} aria-hidden="true" />
    Back
  </button>
);
