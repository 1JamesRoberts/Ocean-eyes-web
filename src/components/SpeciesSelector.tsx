import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { SPECIES_CATALOG, searchSpecies, getSpeciesByName, type SpeciesInfo } from '../data/speciesCatalog';

const SpeciesThumbnail: React.FC<{ species: SpeciesInfo }> = ({ species }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return (
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          backgroundColor: species.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}
      >
        {species.initials}
      </div>
    );
  }
  return (
    <img
      src={species.imagePath}
      alt={species.initials}
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        objectFit: 'contain',
        flexShrink: 0
      }}
      onError={() => setHasError(true)}
    />
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
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSpecies = selectedSpeciesId ? SPECIES_CATALOG.find((s: SpeciesInfo) => s.id === selectedSpeciesId) : null;
  const filteredSpecies = useMemo(() => {
    const results = searchSpecies(query);
    return results.filter(s => !excludeSpeciesIds.includes(s.id));
  }, [query, excludeSpeciesIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <Search 
          size={16} 
          style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--color-text-secondary)',
            pointerEvents: 'none'
          }} 
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={selectedSpecies ? selectedSpecies.displayName : placeholder}
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            fontFamily: 'var(--font-main)',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: 'var(--color-surface)'
          }}
        />
      </div>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '280px',
            overflowY: 'auto',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100
          }}
        >
          <div style={{ padding: '8px 0' }}>
            {filteredSpecies.map((species) => (
              <button
                key={species.id}
                type="button"
                onClick={() => handleSelect(species)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: selectedSpeciesId === species.id ? 'var(--color-primary-light)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-main)',
                  fontSize: '14px',
                  color: 'var(--color-text-primary)'
                }}
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
                <SpeciesThumbnail species={species} />
                <span style={{ flex: 1 }}>{species.displayName}</span>
                {selectedSpeciesId === species.id && (
                  <Check size={16} color="var(--color-primary)" />
                )}
              </button>
            ))}

            {showCustomOption && (
              <button
                type="button"
                onClick={handleCustomSelect}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-main)',
                  fontSize: '14px',
                  color: 'var(--color-primary)',
                  fontStyle: 'italic'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-secondary)',
                    flexShrink: 0
                  }}
                >
                  ??
                </div>
                <span>Add custom: "{query.trim()}"</span>
              </button>
            )}

            {filteredSpecies.length === 0 && !showCustomOption && (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                No species found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
