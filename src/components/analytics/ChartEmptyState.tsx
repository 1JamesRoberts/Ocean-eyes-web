// ChartEmptyState.tsx - Reusable empty-state placeholder for chart components
import React from 'react';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  message: string;
  hint?: string;
  action?: React.ReactNode;
}

export const ChartEmptyState = React.memo<Props>(({ message, hint, action }) => (
  <EmptyState message={message} hint={hint} action={action} size="md" />
));

ChartEmptyState.displayName = 'ChartEmptyState';
