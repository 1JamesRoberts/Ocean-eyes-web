import React, { useState } from 'react';
import { getSpeciesById, getSpeciesColor, getSpeciesInitials } from '../../data/speciesCatalog';

interface SpeciesAvatarProps {
  speciesId: string;
  size?: number;
  radius?: number;
  className?: string;
}

export const SpeciesAvatar: React.FC<SpeciesAvatarProps> = ({
  speciesId,
  size = 32,
  radius = 6,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const species = getSpeciesById(speciesId);

  const sizeClass = `size-[${size}px]`;
  const radiusClass = radius >= 8 ? 'rounded-lg' : 'rounded-md';

  if (!species || hasError) {
    return (
      <div
        className={`
          flex shrink-0 items-center justify-center font-bold text-white
          ${sizeClass}
          ${radiusClass}
          ${className}
        `}
        style={{
          backgroundColor: getSpeciesColor(speciesId),
          fontSize: `${Math.max(9, size * 0.34)}px`,
        }}
      >
        {getSpeciesInitials(speciesId)}
      </div>
    );
  }

  return (
    <img
      className={`
        shrink-0 object-contain
        ${sizeClass}
        ${radiusClass}
        ${className}
      `}
      src={species.imagePath}
      alt={species.initials}
      onError={() => setHasError(true)}
    />
  );
};
