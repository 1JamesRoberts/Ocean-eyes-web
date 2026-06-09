// ChartEmptyState.tsx - Reusable empty-state placeholder for chart components
import React from 'react';
import styles from './ChartEmptyState.module.css';

interface Props {
  message: string;
  hint?: string;
  action?: React.ReactNode;
}

export const ChartEmptyState: React.FC<Props> = ({ message, hint, action }) => {
  const layout = hint || action ? styles.emptyStateStacked : styles.emptyState;

  return (
    <div className={layout}>
      <span>{message}</span>
      {hint && <span className={styles.emptyStateHint}>{hint}</span>}
      {action && (
        <div className={hint ? styles.emptyStateActionWithHint : styles.emptyStateAction}>
          {action}
        </div>
      )}
    </div>
  );
};
