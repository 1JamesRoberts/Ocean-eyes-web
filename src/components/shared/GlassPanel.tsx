import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'button' | 'article';
  onClick?: () => void;
  type?: 'button';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  as: Tag = 'div',
  ...rest
}) => (
  <Tag
    className={`
      rounded-2xl border border-white/20 bg-white/20 p-3
      transition-colors
      ${Tag === 'button' ? 'w-full cursor-pointer text-left hover:bg-white/60' : ''}
      ${className}
    `}
    {...rest}
  >
    {children}
  </Tag>
);
