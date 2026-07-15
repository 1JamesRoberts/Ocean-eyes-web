import React from "react";

interface CardHeaderProps {
  icon: string;
  title: React.ReactNode;
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
      bg-white/20 px-4 py-2.5
      ${className}
    `}
  >
    <div className="flex min-w-0 items-start gap-2 text-prussian-blue">
      <span className="material-symbols-outlined">{icon}</span>
      <div className="min-w-0">
        <div className="type-title">{title}</div>
      </div>
    </div>
    <div className="flex items-center">
      {children}
    </div>
  </div>
);
