import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check } from 'lucide-react';
import { SPECIES_CATALOG, searchSpecies, getSpeciesByName, type SpeciesInfo } from '../data/speciesCatalog';
import { SpeciesAvatar } from './fish/SpeciesAvatar';

const MAX_INLINE_RESULTS = 60;

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
  presentation?: 'popover' | 'inline';
}

export const SpeciesSelector: React.FC<SpeciesSelectorProps> = ({
  selectedSpeciesId,
  onSelect,
  placeholder = 'Search for a species...',
  excludeSpeciesIds = [],
  presentation = 'popover',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultsId = useId();
  const isInline = presentation === 'inline';

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
    if (!isInline) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isInline]);

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

    if (isOpen && !isInline) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isInline, isOpen]);

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
  const visibleSpecies = isInline
    ? filteredSpecies.slice(0, MAX_INLINE_RESULTS)
    : filteredSpecies;

  const results = (
    <div className="py-1.5" role="listbox" id={resultsId} aria-label="Species results">
      {visibleSpecies.map((species) => (
        <button
          key={species.id}
          type="button"
          role="option"
          aria-selected={selectedSpeciesId === species.id}
          onClick={() => handleSelect(species)}
          className={`
            flex min-h-12 w-full cursor-pointer items-center gap-3 border-none
            px-3 py-2 text-left type-body transition-colors
            ${selectedSpeciesId === species.id
              ? 'bg-[var(--color-primary-light)]'
              : 'bg-transparent hover:bg-surface-hover'
            }
          `}
        >
          <SpeciesAvatar speciesId={species.id} size={38} radius={10} />
          <span className="min-w-0 flex-1">
            <span className="block truncate type-strong">{species.displayName}</span>
            {species.scientificName && (
              <span className="block truncate type-caption italic">
                {species.scientificName}
              </span>
            )}
          </span>
          {species.creatureType && species.creatureType !== 'fish' && (
            <CreatureBadge type={species.creatureType} />
          )}
          {selectedSpeciesId === species.id && (
            <Check size={18} className="shrink-0 text-brand" aria-hidden="true" />
          )}
        </button>
      ))}

      {isInline && filteredSpecies.length > MAX_INLINE_RESULTS && (
        <p className="px-4 py-3 text-center type-caption">
          Keep typing to narrow {filteredSpecies.length} matches.
        </p>
      )}

      {showCustomOption && (
        <button
          type="button"
          role="option"
          aria-selected={selectedSpeciesId === null}
          onClick={handleCustomSelect}
          className="
            flex min-h-12 w-full cursor-pointer items-center gap-3 border-none
            bg-transparent px-3 py-2 text-left type-body text-brand
            transition-colors hover:bg-surface-hover
          "
        >
          <div className="
            flex size-[38px] shrink-0 items-center justify-center rounded-[10px]
            bg-brand/10 type-strong text-brand
          ">
            +
          </div>
          <span className="min-w-0 flex-1 truncate">
            Add custom species “{query.trim()}”
          </span>
        </button>
      )}

      {filteredSpecies.length === 0 && !showCustomOption && (
        <div className="px-4 py-6 text-center type-body-muted">
          No species found
        </div>
      )}
    </div>
  );

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
          aria-controls={resultsId}
          aria-expanded={isInline || isOpen}
          aria-autocomplete="list"
          role="combobox"
          className="
            w-full rounded-2xl border border-border bg-white/55 px-3 py-3 pl-10
            type-body outline-none transition-smooth
            focus:border-brand/40 focus:ring-3 focus:ring-brand/10
          "
        />
      </div>

      {isInline ? (
        <div className="mt-3 max-h-[42dvh] overflow-y-auto rounded-2xl border border-white/35 bg-white/28">
          {results}
        </div>
      ) : isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="
            max-h-[280px] overflow-y-auto rounded-lg border border-border
            bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.1)]
          "
          style={dropdownStyle}
        >
          {results}
        </div>
        , document.body)}
    </div>
  );
};
