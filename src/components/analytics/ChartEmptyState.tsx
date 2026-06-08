// ChartEmptyState.tsx - Reusable empty-state placeholder for chart components
import React from 'react';
import styles from './ChartEmptyState.module.css';

interface Props {
  message: string;
  hint?: string;
}

export const ChartEmptyState: React.FC<Props> = ({ message, hint }) => {
  if (hint) {
    return (
      <div className={styles.emptyStateStacked}>
        <span>{message}</span>
        <span className={styles.emptyStateHint}>{hint}</span>
      </div>
    );
  }

  return <div className={styles.emptyState}>{message}</div>;
};
