import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CardHeader } from './CardHeader';
import { CardSectionHeader } from './CardSectionHeader';
import { GlassCard } from './GlassCard';

interface HeadedCardProps {
  children: React.ReactNode;
  icon: LucideIcon | string;
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  headerClassName?: string;
  headerVariant?: 'inset' | 'edge';
  as?: 'section' | 'div' | 'article';
  onClick?: React.MouseEventHandler<HTMLElement>;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  role?: string;
  tabIndex?: number;
}

export const HeadedCard: React.FC<HeadedCardProps> = ({
  children,
  icon,
  title,
  action,
  className = '',
  iconClassName,
  headerClassName = '',
  headerVariant = 'inset',
  ...rest
}) => {
  const isEdgeHeader = headerVariant === 'edge';

  return (
    <GlassCard
      className={`
        ${isEdgeHeader ? 'overflow-hidden p-0!' : 'px-5! pt-4.5! pb-4!'}
        ${className}
      `}
      {...rest}
    >
      {isEdgeHeader ? (
        <CardHeader
          icon={typeof icon === 'string' ? icon : ''}
          title={title}
          className={headerClassName}
        >
          {action}
        </CardHeader>
      ) : (
        <CardSectionHeader
          icon={icon as LucideIcon}
          title={title}
          action={action}
          className={headerClassName}
          iconClassName={iconClassName}
        />
      )}
      {children}
    </GlassCard>
  );
};
