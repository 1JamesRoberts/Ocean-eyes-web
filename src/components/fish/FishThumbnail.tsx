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
  size = 40,
}) => {
  const [hasError, setHasError] = useState(false);
  const s = size;

  if (!imagePath || hasError) {
    return (
      <div
        className="
          flex shrink-0 items-center justify-center rounded-lg border
          border-white/20 font-bold text-white
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
    <img
      src={imagePath}
      alt={initials}
      className="shrink-0 rounded-lg object-contain"
      style={{ width: s, height: s }}
      onError={() => setHasError(true)}
    />
  );
};
