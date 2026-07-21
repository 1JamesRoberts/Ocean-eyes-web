import React, { useState } from 'react';

interface FishThumbnailProps {
  imagePath?: string;
  initials: string;
  color: string;
  size?: number;
}

export const FishThumbnail: React.FC<FishThumbnailProps> = ({
  imagePath,
  initials,
  color,
  size = 64,
}) => {
  const [hasError, setHasError] = useState(false);
  const s = size;

  if (!imagePath || hasError) {
    return (
      <div
        className="
          flex shrink-0 items-center justify-center rounded-lg border
          border-white/20 font-semibold text-white
          shadow-sm
        "
        style={{
          width: s,
          height: s,
          backgroundColor: color,
          fontSize: Math.round(s * 0.3),
          textShadow: '0 1px 2px color-mix(in srgb, var(--color-prussian-blue) 30%, transparent)',
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="relative shrink-0" style={{ width: s, height: s }}>
      <span
        aria-hidden="true"
        className="absolute bottom-[20%] left-1/2 h-[2%] w-[44%] -translate-x-1/2 rounded-[50%] bg-prussian-blue/[18%] blur-[3px]"
      />
      <img
        src={imagePath}
        alt={initials}
        className="relative h-full w-full rounded-lg object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
};
