import type React from 'react';

interface CollapsibleContentProps {
  expanded: boolean;
  children: React.ReactNode;
  className?: string;
}

export const CollapsibleContent: React.FC<CollapsibleContentProps> = ({
  expanded,
  children,
  className = '',
}) => (
  <div
    inert={!expanded}
    aria-hidden={!expanded}
    className={`
      grid transition-[grid-template-rows_0.35s_cubic-bezier(0.4,0,0.2,1)]
      ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
    `}
  >
    <div className="overflow-hidden">
      <div
        className={`
          ${className}
          transition-[opacity_0.3s_ease,transform_0.35s_cubic-bezier(0.4,0,0.2,1)]
          ${expanded ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}
        `}
      >
        {children}
      </div>
    </div>
  </div>
);
