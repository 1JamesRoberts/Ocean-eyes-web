import React from "react";

interface CardHeaderProps {
  icon: string;
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  icon,
  title,
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
    <div className="flex items-center gap-2 font-semibold text-brand">
      <span className="material-symbols-outlined">{icon}</span>
      <span>{title}</span>
    </div>
    <div className="flex items-center">
      {children}
    </div>
  </div>
);
