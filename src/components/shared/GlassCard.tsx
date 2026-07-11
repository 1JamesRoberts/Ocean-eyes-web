// GlassCard.tsx — Reusable aquatic glass card wrapper
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  style?: React.CSSProperties;
  as?: 'section' | 'div' | 'article';
  hover?: boolean;
  clickable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  as: Tag = 'div',
  hover = false,
  clickable = false,
  ...rest
}) => (
  <Tag
    className={`
      glass-card p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
      ${clickable ? 'cursor-pointer' : ''}
      ${hover ? `
        transition-smooth
        hover:bg-white/50
      ` : ''}
      ${className}
    `}
    {...rest}
  >
    {children}
  </Tag>
);
