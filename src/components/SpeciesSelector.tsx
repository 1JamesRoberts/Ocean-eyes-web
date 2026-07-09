import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check } from 'lucide-react';
import { SPECIES_CATALOG, searchSpecies, getSpeciesByName, type SpeciesInfo } from '../data/speciesCatalog';
import { SpeciesAvatar } from './fish/SpeciesAvatar';

/** Small coloured badge showing the creature type (shrimp/snail/crab) */
const CreatureBadge: React.FC<{ type: string }> = ({ type }) => {
  const emoji = type === 'shrimp' ? '🦐' : type === 'snail' ? '🐌' : type === 'crab' ? '🦀' : '';
  const bgColor = type === 'shrimp' ? '#FF9800' : type === 'snail' ? '#8BC34A' : type === 'crab' ? '#E91E63' : 'var(--color-border)';
  return (
    <span className="
      rounded-sm px-1.5 py-0.5 type-caption-inverse
    " style={{ backgroundColor: bgColor }}>
      {emoji} {type}
    </span>
  );
};

interface SpeciesSelectorProps {
  selectedSpeciesId: string | null;
  onSelect: (species: SpeciesInfo | null, customName?: string) => void;
  placeholder?: string;
  excludeSpeciesIds?: string[];
}

export const SpeciesSelector: React.FC<SpeciesSelectorProps> = ({
  selectedSpeciesId,
  onSelect,
  placeholder = 'Search for a species...',
  excludeSpeciesIds = []
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedSpecies = selectedSpeciesId ? SPECIES_CATALOG.find((s: SpeciesInfo) => s.id === selectedSpeciesId) : null;
  const filteredSpecies = useMemo(() => {
    const results = searchSpecies(query);
    return results.filter(s => !excludeSpeciesIds.includes(s.id));
  }, [query, excludeSpeciesIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999
      });
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  const handleSelect = (species: SpeciesInfo) => {
    onSelect(species);
    setQuery('');
    setIsOpen(false);
  };

  const handleCustomSelect = () => {
    if (query.trim()) {
      onSelect(null, query.trim());
      setQuery('');
      setIsOpen(false);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const showCustomOption = query.trim() && !getSpeciesByName(query.trim());

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search
          size={16}
          className="
            pointer-events-none absolute top-1/2 left-3 -translate-y-1/2
            text-text-muted
          "
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={selectedSpecies ? selectedSpecies.displayName : placeholder}
          className="
            w-full rounded-lg border border-border bg-surface px-3 py-2.5 pl-9
            type-body outline-none
          "
        />
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="
            max-h-[280px] overflow-y-auto rounded-lg border border-border
            bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.1)]
          "
          style={dropdownStyle}
        >
          <div className="py-2">
            {filteredSpecies.map((species) => (
              <button
                key={species.id}
                type="button"
                onClick={() => handleSelect(species)}
                className="
                  flex w-full cursor-pointer items-center gap-2.5 border-none
                  px-3 py-2 text-left type-body
                "
                style={{ background: selectedSpeciesId === species.id ? 'var(--color-primary-light)' : 'transparent' }}
                onMouseEnter={e => {
                  if (selectedSpeciesId !== species.id) {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                  }
                }}
                onMouseLeave={e => {
                  if (selectedSpeciesId !== species.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <SpeciesAvatar speciesId={species.id} />
                <span className="flex-1">{species.displayName}</span>
                {species.creatureType && species.creatureType !== 'fish' && (
                  <CreatureBadge type={species.creatureType} />
                )}
                {selectedSpeciesId === species.id && (
                  <Check size={16} className="text-brand" />
                )}
              </button>
            ))}

            {showCustomOption && (
              <button
                type="button"
                onClick={handleCustomSelect}
                className="
                  flex w-full cursor-pointer items-center gap-2.5 border-none
                  bg-transparent px-3 py-2 text-left type-body text-brand italic
                "
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div
                  className="
                    flex size-8 shrink-0 items-center justify-center rounded-md
                    bg-border type-caption
                  "
                >
                  ??
                </div>
                <span>Add custom: "{query.trim()}"</span>
              </button>
            )}

            {filteredSpecies.length === 0 && !showCustomOption && (
              <div className="py-3 text-center type-body-muted">
                No species found
              </div>
            )}
          </div>
        </div>
        , document.body)}
    </div>
  );
};
