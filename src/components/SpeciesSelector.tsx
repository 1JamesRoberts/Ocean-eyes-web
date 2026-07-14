import React, { useId, useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { SPECIES_CATALOG, searchSpecies, getSpeciesByName, type SpeciesInfo } from '../data/speciesCatalog';
import { SpeciesAvatar } from './fish/SpeciesAvatar';

const MAX_RESULTS = 60;

/** Small coloured badge showing the creature type (shrimp/snail/crab) */
const CreatureBadge: React.FC<{ type: string }> = ({ type }) => {
  const bgColor = type === 'shrimp' ? '#FF9800' : type === 'snail' ? '#8BC34A' : type === 'crab' ? '#E91E63' : 'var(--color-border)';
  return (
    <span className="
      rounded-sm px-1.5 py-0.5 type-caption-inverse
    " style={{ backgroundColor: bgColor }}>
      {type}
    </span>
  );
};

interface SpeciesSelectorProps {
  selectedSpeciesId: string | null;
  onSelect: (species: SpeciesInfo | null, customName?: string) => void;
  placeholder?: string;
  excludeSpeciesIds?: string[];
  inputAction?: React.ReactNode;
}

export const SpeciesSelector: React.FC<SpeciesSelectorProps> = ({
  selectedSpeciesId,
  onSelect,
  placeholder = 'Search for a species...',
  excludeSpeciesIds = [],
  inputAction,
}) => {
  const [query, setQuery] = useState('');
  const resultsId = useId();

  const selectedSpecies = selectedSpeciesId ? SPECIES_CATALOG.find((s: SpeciesInfo) => s.id === selectedSpeciesId) : null;
  const filteredSpecies = useMemo(() => {
    const results = searchSpecies(query);
    return results.filter(s => !excludeSpeciesIds.includes(s.id));
  }, [query, excludeSpeciesIds]);

  const handleSelect = (species: SpeciesInfo) => {
    onSelect(species);
    setQuery('');
  };

  const handleCustomSelect = () => {
    if (query.trim()) {
      onSelect(null, query.trim());
      setQuery('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const showCustomOption = query.trim() && !getSpeciesByName(query.trim());
  const visibleSpecies = filteredSpecies.slice(0, MAX_RESULTS);

  const results = (
    <div
      className="pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
      role="listbox"
      id={resultsId}
      aria-label="Species results"
    >
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

      {filteredSpecies.length > MAX_RESULTS && (
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
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="
              pointer-events-none absolute top-1/2 left-3 -translate-y-1/2
              text-text-muted
            "
          />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={selectedSpecies ? selectedSpecies.displayName : placeholder}
            aria-controls={resultsId}
            aria-expanded="true"
            aria-autocomplete="list"
            role="combobox"
            className="
              w-full rounded-2xl border border-border bg-white/55 px-3 py-3 pl-10
              type-body outline-none transition-smooth
              focus:border-brand/40 focus:ring-3 focus:ring-brand/10
            "
          />
        </div>
        {inputAction}
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
        {results}
      </div>
    </div>
  );
};
