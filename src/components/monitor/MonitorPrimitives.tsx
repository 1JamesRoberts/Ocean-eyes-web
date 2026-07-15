import type React from 'react';

type MonitorButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface MonitorButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: MonitorButtonVariant;
  fullWidth?: boolean;
}

const variantStyles: Record<MonitorButtonVariant, string> = {
  primary: 'border-transparent bg-primary-gradient text-white shadow-primary-glow',
  secondary: 'border-monitor-border bg-monitor-elevated text-monitor-text hover:bg-monitor-border',
  ghost: 'border-monitor-border bg-transparent text-monitor-text hover:bg-white/5',
  danger: 'border-critical/50 bg-critical/15 text-monitor-critical hover:bg-critical/25',
};

export const MonitorButton: React.FC<MonitorButtonProps> = ({
  variant = 'secondary',
  fullWidth = false,
  className = '',
  children,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`
      inline-flex min-h-11 cursor-pointer items-center justify-center gap-2
      rounded-xl border px-5 py-3 type-strong-inverse transition-smooth
      focus-visible:outline-2 focus-visible:outline-offset-2
      focus-visible:outline-monitor-accent
      disabled:cursor-not-allowed disabled:opacity-50
      ${variantStyles[variant]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `}
    {...props}
  >
    {children}
  </button>
);

interface MonitorMetricProps {
  label: string;
  value: React.ReactNode;
}

export const MonitorMetric: React.FC<MonitorMetricProps> = ({ label, value }) => (
  <div className="
    rounded-xl border border-monitor-border bg-monitor-surface p-3 pb-2
  ">
    <span className="
      block text-2xs font-semibold tracking-[0.07em] text-monitor-text-muted
      uppercase
    ">
      {label}
    </span>
    <strong className="mt-1 block type-strong text-info">{value}</strong>
  </div>
);
