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
          flex shrink-0 items-center justify-center rounded-lg font-bold
          text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]
        "
        style={{
          width: s,
          height: s,
          backgroundColor: color,
          fontSize: Math.round(s * 0.3),
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
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
