import React from "react";

interface CardHeaderProps {
  icon: string;
  title: string;
  detail?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  icon,
  title,
  detail,
  children,
  className = "",
}) => (
  <div
    className={`
      flex min-h-[52px] items-center justify-between border-b border-white/20
      bg-white/20 px-4 py-3
      ${className}
    `}
  >
    <div className="flex min-w-0 items-start gap-2 text-brand">
      <span className="material-symbols-outlined">{icon}</span>
      <div className="min-w-0">
        <div className="type-title">{title}</div>
        {detail && <p className="mt-0.5 type-caption">{detail}</p>}
      </div>
    </div>
    <div className="flex items-center">
      {children}
    </div>
  </div>
);
