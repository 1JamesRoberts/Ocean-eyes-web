// GlassCard.tsx — Reusable aquatic glass card wrapper
import React from 'react';

export type GlassCardSurface = 'solid' | 'translucent';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  style?: React.CSSProperties;
  as?: 'section' | 'div' | 'article';
  surface?: GlassCardSurface;
  hover?: boolean;
  clickable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  as: Tag = 'div',
  surface = 'solid',
  hover = false,
  clickable = false,
  ...rest
}) => (
  <Tag
    className={`
      ${surface === 'translucent' ? 'glass-card-translucent' : 'glass-card'} p-5 pb-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-teal
      ${clickable ? 'cursor-pointer' : ''}
      ${hover ? `
        transition-smooth
        hover:bg-azure-mist
      ` : ''}
      ${className}
    `}
    {...rest}
  >
    {children}
  </Tag>
);
