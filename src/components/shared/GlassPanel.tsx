import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'button' | 'article';
  onClick?: () => void;
  type?: 'button';
  disabled?: boolean;
  'aria-label'?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  as: Tag = 'div',
  ...rest
}) => (
  <Tag
    className={`
      rounded-2xl border border-white/20 bg-white/20 p-2.5 pb-2
      transition-colors
      ${Tag === 'button' ? 'min-h-11 w-full cursor-pointer text-left hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-teal' : ''}
      ${className}
    `}
    {...rest}
  >
    {children}
  </Tag>
);
