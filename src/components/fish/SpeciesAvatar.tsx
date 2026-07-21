import React, { useState } from 'react';
import { getSpeciesById, getSpeciesColor, getSpeciesInitials } from '../../data/speciesCatalog';

interface SpeciesAvatarProps {
  speciesId: string;
  size?: number;
  radius?: number;
  className?: string;
  objectFit?: 'contain' | 'cover';
}

export const SpeciesAvatar: React.FC<SpeciesAvatarProps> = ({
  speciesId,
  size = 32,
  radius = 6,
  className = '',
  objectFit = 'contain',
}) => {
  const [hasError, setHasError] = useState(false);
  const species = getSpeciesById(speciesId);

  const commonStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: `${radius}px`,
    flexShrink: 0,
  };

  if (!species || hasError) {
    return (
      <div
        className={`
          ${className}
          border border-white/20
        `}
        style={{
          ...commonStyle,
          backgroundColor: getSpeciesColor(speciesId),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${Math.max(9, size * 0.34)}px`,
          fontWeight: 600,
          color: 'var(--color-white)',
          textShadow: '0 1px 2px color-mix(in srgb, var(--color-prussian-blue) 30%, transparent)',
        }}
      >
        {getSpeciesInitials(speciesId)}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={commonStyle}>
      <span
        aria-hidden="true"
        className="absolute bottom-[20%] left-1/2 h-[2%] w-[44%] -translate-x-1/2 rounded-[50%] bg-prussian-blue/[18%] blur-[3px]"
      />
      <img
        className="relative h-full w-full"
        src={species.imagePath}
        alt={species.initials}
        style={{
          borderRadius: `${radius}px`,
          objectFit,
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
};
