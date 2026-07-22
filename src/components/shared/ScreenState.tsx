import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';

type ScreenStateTone = 'neutral' | 'danger' | 'success';

interface ScreenStateProps {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  tone?: ScreenStateTone;
  compact?: boolean;
}

const toneStyles: Record<ScreenStateTone, string> = {
  neutral: 'bg-accent/8 text-accent-ink',
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
}) => {
  const Heading = compact ? 'h3' : 'h2';

  return (
  <div
    className={`
      flex flex-col items-center justify-center text-center
      ${compact ? 'gap-2 p-4' : 'gap-3 px-6 py-10'}
    `}
  >
    <span className={`
      grid size-12 place-items-center rounded-2xl
      ${toneStyles[tone]}
    `}>
      <Icon size={22} aria-hidden="true" />
    </span>
    <div className="max-w-sm">
      <Heading className="type-title">{title}</Heading>
      <p className="mt-1 type-caption">{description}</p>
    </div>
    {action && <div className="mt-1">{action}</div>}
  </div>
  );
};

interface ScreenStateCardProps extends ScreenStateProps {
  as?: 'section' | 'div' | 'article';
}

const cardToneStyles: Record<ScreenStateTone, string> = {
  neutral: '',
  danger: 'border-critical bg-critical/10',
  success: 'border-2 border-dashed border-white/40',
};

/** A screen-level feedback state with the app's standard glass-card surface. */
export const ScreenStateCard: React.FC<ScreenStateCardProps> = ({
  as,
  tone = 'neutral',
  ...stateProps
}) => (
  <GlassCard as={as} className={`p-0! ${cardToneStyles[tone]}`}>
    <ScreenState {...stateProps} tone={tone} />
  </GlassCard>
);
