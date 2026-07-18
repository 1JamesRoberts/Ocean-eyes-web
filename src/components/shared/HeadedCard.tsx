import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CardHeader } from './CardHeader';
import { CardSectionHeader } from './CardSectionHeader';
import { GlassCard, type GlassCardSurface } from './GlassCard';

interface HeadedCardProps {
  children: React.ReactNode;
  icon: LucideIcon | string;
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  headerClassName?: string;
  headerVariant?: 'inset' | 'edge';
  surface?: GlassCardSurface;
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
  surface = 'solid',
  ...rest
}) => {
  const isEdgeHeader = headerVariant === 'edge';

  return (
    <GlassCard
      surface={surface}
      className={`
        ${isEdgeHeader ? 'overflow-hidden p-0!' : 'px-4! pt-4! pb-3.5!'}
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
