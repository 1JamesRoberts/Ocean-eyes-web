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
          fontWeight: 700,
          color: 'var(--color-white)',
          textShadow: '0 1px 2px color-mix(in srgb, var(--color-prussian-blue) 30%, transparent)',
        }}
      >
        {getSpeciesInitials(speciesId)}
      </div>
    );
  }

  return (
    <img
      className={className}
      src={species.imagePath}
      alt={species.initials}
      style={{
        ...commonStyle,
        objectFit,
      }}
      onError={() => setHasError(true)}
    />
  );
};
