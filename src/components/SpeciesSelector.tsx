import React, { useId, useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';
import {
  CLASSIFIABLE_SPECIES,
  resolveClassifiableSpeciesId,
} from '../data/classifiableSpecies';
import { searchSpecies, type SpeciesInfo } from '../data/speciesCatalog';
import { SpeciesAvatar } from './fish/SpeciesAvatar';

const MAX_RESULTS = 60;

/** Small coloured badge showing the creature type (shrimp/snail/crab) */
const CreatureBadge: React.FC<{ type: string }> = ({ type }) => {
  const bgColor = type === 'shrimp' ? '#FF9800' : type === 'snail' ? '#8BC34A' : type === 'crab' ? '#E91E63' : 'var(--role-border-primary)';
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
  onSelect: (species: SpeciesInfo) => void;
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

  const selectedSpecies = selectedSpeciesId
    ? CLASSIFIABLE_SPECIES.find((s) => s.id === selectedSpeciesId)
    : null;
  const excludedSpeciesIds = useMemo(
    () => new Set(excludeSpeciesIds.map(resolveClassifiableSpeciesId)),
    [excludeSpeciesIds],
  );
  const filteredSpecies = useMemo(() => {
    const results = searchSpecies(query, CLASSIFIABLE_SPECIES);
    return results.filter((s) => !excludedSpeciesIds.has(resolveClassifiableSpeciesId(s.id)));
  }, [query, excludedSpeciesIds]);

  const handleSelect = (species: SpeciesInfo) => {
    onSelect(species);
    setQuery('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

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
              ? 'bg-azure-mist'
              : 'bg-transparent hover:bg-azure-mist'
            }
          `}
        >
          <SpeciesAvatar speciesId={species.id} size={64} radius={16} />
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
            <Check size={18} className="shrink-0 text-accent-ink" aria-hidden="true" />
          )}
        </button>
      ))}

      {filteredSpecies.length > MAX_RESULTS && (
        <p className="px-4 py-3 text-center type-caption">
          Keep typing to narrow {filteredSpecies.length} matches.
        </p>
      )}

      {filteredSpecies.length === 0 && (
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
              text-slate-grey
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
              w-full rounded-2xl border border-divider bg-white/55 px-3 py-3 pl-10
              type-body text-base! outline-none transition-smooth
              focus:border-focus/40 focus:ring-3 focus:ring-focus/10
            "
          />
        </div>
        {inputAction}
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
        {results}
      </div>
    </div>
  );
};
