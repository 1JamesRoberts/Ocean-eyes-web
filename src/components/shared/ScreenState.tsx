import type React from 'react';
import type { LucideIcon } from 'lucide-react';

type ScreenStateTone = 'neutral' | 'danger' | 'success';

interface ScreenStateProps {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  tone?: ScreenStateTone;
  compact?: boolean;
  className?: string;
}

const toneStyles: Record<ScreenStateTone, string> = {
  neutral: 'bg-brand/8 text-brand',
  danger: 'bg-critical/10 text-critical',
  success: 'bg-good/10 text-good',
};

/** Consistent feedback for empty, error, success, and unavailable screen states. */
export const ScreenState: React.FC<ScreenStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  compact = false,
  className = '',
}) => {
  const Heading = compact ? 'h3' : 'h2';

  return (
  <div
    className={`
      flex flex-col items-center justify-center text-center
      ${compact ? 'gap-2 p-4' : 'gap-3 px-6 py-10'}
      ${className}
    `}
  >
    <span className={`
      grid size-12 place-items-center rounded-2xl
      ${toneStyles[tone]}
    `}>
      <Icon size={22} aria-hidden="true" />
    </span>
    <div className="max-w-sm">
      <Heading className="type-strong">{title}</Heading>
      <p className="mt-1 type-caption">{description}</p>
    </div>
    {action && <div className="mt-1">{action}</div>}
  </div>
  );
};
