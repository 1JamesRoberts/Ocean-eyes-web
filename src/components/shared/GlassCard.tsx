// GlassCard.tsx — Reusable aquatic glass card wrapper
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  style?: React.CSSProperties;
  as?: 'section' | 'div' | 'article';
  clickable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  as: Tag = 'div',
  clickable = false,
  ...rest
}) => (
  <Tag
    className={`
      glass-card p-5 pb-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus
      ${clickable ? 'cursor-pointer' : ''}
      ${className}
    `}
    {...rest}
  >
    {children}
  </Tag>
);
