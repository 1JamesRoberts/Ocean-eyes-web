import React from 'react';
import { useMyFish } from '../../hooks/pages/useMyFish';
import {
  Trash2, Fish, BarChart3,
  Thermometer, Droplets, Ruler, Maximize2,
  AlertTriangle, CheckCircle, HelpCircle
} from 'lucide-react';
import DetectionVisibilityRing from '../../components/fish/DetectionVisibilityRing';
import { DonutChart } from '../../components/fish/DonutChart';
import { FishThumbnail } from '../../components/fish/FishThumbnail';
import { DetailChip } from '../../components/fish/DetailChip';
import { SpeciesSelector } from '../../components/SpeciesSelector';
import {
  CardSectionHeader,
  GlassButton,
  GlassCard,
  GlassIconButton,
  GlassModal,
} from '../../components/shared';
import {
  getSpeciesById,
  checkTankCompatibility,
  getCompatibilityLevel,
  getCompatibilityColor,
  type SpeciesInfo
} from '../../data/speciesCatalog';
import { formatRange } from '../../models/services/speciesService';
import type {
  Difficulty,
  Aggression,
  BehaviorType,
  SwimLocation,
  Availability,
  BreedingDifficulty,
} from '../../types/aquarium';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const difficultyLabel: Record<Difficulty, string> = {
  beginner: 'Beginner', easy: 'Easy', medium: 'Medium', difficult: 'Difficult'
};
const aggressionLabel: Record<Aggression, string> = {
  peaceful: 'Peaceful', mostly_peaceful: 'Mostly Peaceful', aggressive: 'Aggressive'
};
const behaviorLabel: Record<BehaviorType, string> = {
  schooling: 'Schooling', social: 'Social', solitary: 'Solitary'
};
const swimLabel: Record<SwimLocation, string> = {
  bottom: 'Bottom', middle: 'Middle', top: 'Top'
};
const availabilityLabel: Record<Availability, string> = {
  very_common: 'Very Common', common: 'Common', rare: 'Rare', very_rare: 'Very Rare'
};
const breedingLabel: Record<BreedingDifficulty, string> = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard', no_record: 'No Record'
};

interface FishCountStepperProps {
  count: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

const FishCountStepper: React.FC<FishCountStepperProps> = ({
  count,
  onDecrement,
  onIncrement,
}) => (
  <div className="
    flex items-center rounded-xl border border-white/20 bg-white/30 p-0.5
  ">
    <button
      className="
        flex size-6 cursor-pointer items-center justify-center border-none
        bg-transparent text-base font-extrabold text-text
      "
      onClick={onDecrement}
    >
      -
    </button>
    <span className="w-6 text-center text-sm font-bold text-text">{count}</span>
    <button
      className="
        flex size-6 cursor-pointer items-center justify-center border-none
        bg-transparent text-base font-extrabold text-text
      "
      onClick={onIncrement}
    >
      +
    </button>
  </div>
);

interface DeleteFishModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteFishModal: React.FC<DeleteFishModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
}) => (
  <GlassModal isOpen={isOpen} onClose={onCancel}>
    <h3 className="mb-2 text-lg font-bold text-text">Delete Fish Entry</h3>
    <p className="mb-6 text-sm text-text-muted">
      Are you sure you want to delete this fish entry? This action cannot be undone.
    </p>
    <div className="flex justify-end gap-3">
      <GlassButton variant="outline" size="md" onClick={onCancel}>Cancel</GlassButton>
      <GlassButton variant="danger" size="md" onClick={onConfirm}>Delete</GlassButton>
    </div>
  </GlassModal>
);

interface AddSpeciesFormProps {
  show: boolean;
  selectedSpeciesId: string | null;
  fishList: { speciesId: string }[];
  onSpeciesSelect: (species: SpeciesInfo | null, customName?: string) => void;
  onAdd: (event: React.FormEvent) => void;
  onClose: () => void;
}

const AddSpeciesForm: React.FC<AddSpeciesFormProps> = ({
  show,
  selectedSpeciesId,
  fishList,
  onSpeciesSelect,
  onAdd,
  onClose,
}) => (
  <div className={`
    shimmer z-50 origin-top -translate-y-3
    transition-[max-height_0.4s_cubic-bezier(0.4,0,0.2,1),opacity_0.3s_ease,transform_0.4s_cubic-bezier(0.4,0,0.2,1),margin_0.4s_ease]
    ${show ? 'mb-5 max-h-[500px] translate-y-0 opacity-100' : `
      pointer-events-none max-h-0 opacity-0
    `}
  `}>
    <form onSubmit={onAdd} className="
      flex flex-col gap-3.5 glass-card p-6 transition-smooth
    ">
      <h4 className="text-sm font-bold text-text">Add New Species Entry</h4>
      <div>
        <label className="
          mb-1 block text-caption font-semibold tracking-wider text-text-muted
          uppercase
        ">SPECIES</label>
        <SpeciesSelector
          selectedSpeciesId={selectedSpeciesId}
          onSelect={onSpeciesSelect}
          placeholder="Search or select a species..."
          excludeSpeciesIds={fishList.map((fish) => fish.speciesId)}
        />
      </div>
      <div className="mt-1.5 flex gap-2.5">
        <GlassButton variant="primary" size="md" type="submit" className="
          flex-1
        ">
          Add Species
        </GlassButton>
        <GlassButton variant="outline" size="md" type="button" onClick={onClose}>
          Cancel
        </GlassButton>
      </div>
    </form>
  </div>
);

export const MyFishScreen: React.FC<{
  showAddForm?: boolean;
  onToggleAddForm?: () => void;
}> = ({ showAddForm: externalShowAddForm, onToggleAddForm: externalToggleAddForm }) => {
  const hookValues = useMyFish(
    externalShowAddForm !== undefined
      ? { externalShowAddForm, onExternalToggleAddForm: externalToggleAddForm }
      : undefined
  );
  const {
    fishList,
    stats,
    speciesDistribution,
    selectedSpeciesId,
    showAddForm,
    activeFishId,
    aquariumOverviewExpanded,
    fishToDelete,
    getSpeciesDisplay,
    onCloseAddForm,
    onSpeciesSelect,
    onAdd,
    onToggleFish,
    onToggleAquariumOverview,
    onIncrementCount,
    onDecrementCount,
    onRequestDelete,
    onCancelDelete,
    onConfirmDelete,
  } = hookValues;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <AddSpeciesForm
        show={showAddForm}
        selectedSpeciesId={selectedSpeciesId}
        fishList={fishList}
        onSpeciesSelect={onSpeciesSelect}
        onAdd={onAdd}
        onClose={onCloseAddForm}
      />

      {/* ─── Layout ─── */}
      <div className="flex flex-col gap-6">
        {/* Chart & Stats */}
        <div className="flex flex-col gap-4">
          <GlassCard className="p-5">
            <CardSectionHeader icon={BarChart3} title="Species Distribution" />
            <DonutChart speciesDistribution={speciesDistribution} />
          </GlassCard>

          <GlassCard
            data-aquarium-overview
            clickable
            hover
            className="
              flex cursor-pointer flex-col overflow-hidden p-0
            "
            onClick={onToggleAquariumOverview}
          >
            {/* Main row — always visible */}
            <div className="flex items-center justify-between p-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="
                  flex size-10 shrink-0 items-center justify-center rounded-lg
                  bg-brand/10
                ">
                  <Fish size={22} className="text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="
                    block truncate text-base font-bold text-text
                  ">Fish Overview</span>
                  <span className="
                    mb-1 block truncate text-xs font-medium text-text-muted
                    italic
                  ">{stats.uniqueSpecies} species</span>
                  <span className="mt-0.5 block text-xs text-text-muted">
                    Visible: {stats.totalDetected} / {stats.totalExpected}
                  </span>
                </div>
              </div>

              <div className="
                flex items-center gap-2
                max-xs:gap-1.5
              ">
                <DetectionVisibilityRing
                  detected={stats.totalDetected}
                  expected={stats.totalExpected}
                />
              </div>
            </div>

            {/* ─── Expanded Detail Panel ─── */}
            <div className={`
              grid
              transition-[grid-template-rows_0.35s_cubic-bezier(0.4,0,0.2,1)]
              ${aquariumOverviewExpanded ? `grid-rows-[1fr]` : `grid-rows-[0fr]`}
            `}>
              <div className="overflow-hidden">
                <div className={`
                  p-[0_12px_16px_12px]
                  transition-[opacity_0.3s_ease,transform_0.35s_cubic-bezier(0.4,0,0.2,1)]
                  ${aquariumOverviewExpanded ? 'translate-y-0 opacity-100' : `
                    -translate-y-3 opacity-0
                  `}
                `}>
                  <div className="grid grid-cols-3 gap-2">
                    <DetailChip
                      icon={<Maximize2 size={14} />}
                      label="Tank Min"
                      value={stats.idealTankSizeL != null ? `${stats.idealTankSizeL} L` : '—'}
                      colorClass="bg-[rgba(16,185,129,0.08)]"
                    />
                    <DetailChip
                      icon={<Thermometer size={14} />}
                      label="Temp"
                      value={
                        stats.tempResult.range != null
                          ? formatRange(stats.tempResult.range[0], stats.tempResult.range[1], '°C')
                          : '—'
                      }
                      colorClass="bg-[rgba(245,158,11,0.08)]"
                    />
                    <DetailChip
                      icon={<Droplets size={14} />}
                      label="pH"
                      value={
                        stats.phResult.range != null
                          ? formatRange(stats.phResult.range[0], stats.phResult.range[1], '', 1)
                          : '—'
                      }
                      colorClass="bg-[rgba(147,112,219,0.08)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column — Fish Cards */}
        <div className="flex flex-col gap-3">
          {fishList.length === 0 && (
            <GlassCard className="p-6 text-center">
              <span className="text-5xl">🐟</span>
              <p className="text-base font-bold text-text">No fish in your inventory</p>
              <p className="text-xs text-text-muted">Tap + to add your first species</p>
            </GlassCard>
          )}

          {fishList.map(fish => {
            const display = getSpeciesDisplay(fish);
            const isActive = activeFishId === fish.id;
            const species = getSpeciesById(fish.speciesId);

            // Compute compatibility with all other tank inhabitants
            const allSpecies = fishList
              .map(f => getSpeciesById(f.speciesId))
              .filter((s): s is SpeciesInfo => !!s);

            const compResults = species
              ? checkTankCompatibility(species, allSpecies)
              : [];

            return (
              <GlassCard key={fish.id} data-fish-card
                clickable
                hover
                className="
                  flex cursor-pointer flex-col overflow-hidden p-0
                "
                onClick={() => onToggleFish(fish.id)}
              >
                {/* Main row — always visible */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <FishThumbnail imagePath={display.imagePath} initials={display.initials} color={display.color} />
                    <div className="min-w-0 flex-1">
                      <span className="
                        block truncate text-base font-bold text-text
                      ">{display.name}</span>
                      {species?.scientificName && (
                        <span className="
                          mb-1 block truncate text-xs font-medium
                          text-text-muted italic
                        ">{species.scientificName}</span>
                      )}
                      <span className="mt-0.5 block text-xs text-text-muted">
                        Visible: {fish.detected} / {fish.count}
                      </span>
                    </div>
                  </div>

                  <div className="
                    flex items-center gap-2
                    max-xs:gap-1.5
                  " onClick={e => e.stopPropagation()}>
                    {/* Visibility ring */}
                    <DetectionVisibilityRing
                      detected={fish.detected}
                      expected={fish.count}
                    />

                    {isActive && (
                      <>
                        <FishCountStepper
                          count={fish.count}
                          onDecrement={() => onDecrementCount(fish.id, fish.count)}
                          onIncrement={() => onIncrementCount(fish.id, fish.count)}
                        />
                        <GlassIconButton size="sm" label="Delete fish" onClick={() => onRequestDelete(fish.id)}>
                          <Trash2 size={16} />
                        </GlassIconButton>
                      </>
                    )}
                  </div>
                </div>

                {/* ─── Expanded Detail Panel ─── */}
                <div className={`
                  grid
                  transition-[grid-template-rows_0.35s_cubic-bezier(0.4,0,0.2,1)]
                  ${isActive && species ? `grid-rows-[1fr]` : `grid-rows-[0fr]`}
                `}>
                  <div className="overflow-hidden">
                    <div className={`
                      p-[0_12px_16px_12px]
                      transition-[opacity_0.3s_ease,transform_0.35s_cubic-bezier(0.4,0,0.2,1)]
                      ${isActive && species ? 'translate-y-0 opacity-100' : `
                        -translate-y-3 opacity-0
                      `}
                    `}>
                      {species && (
                        <>
                          {/* Parameter chips — 2-column grid */}
                          <div className="
                            mb-3.5 grid grid-cols-1 gap-3
                            sm:grid-cols-2
                          ">
                            <DetailChip icon={<Ruler size={14} />} label="Size" value={`${species.sizeCm} cm`} colorClass="bg-[rgba(59,130,246,0.08)]" />
                            <DetailChip icon={<Maximize2 size={14} />} label="Tank Min" value={`${species.minTankSizeL} L`} colorClass="bg-[rgba(16,185,129,0.08)]" />
                            <DetailChip icon={<Thermometer size={14} />} label="Temp" value={`${species.tempMin}–${species.tempMax} °C`} colorClass="bg-[rgba(245,158,11,0.08)]" />
                            <DetailChip icon={<Droplets size={14} />} label="pH" value={`${species.phMin}–${species.phMax}`} colorClass="bg-[rgba(147,112,219,0.08)]" />
                            <DetailChip icon={<HelpCircle size={14} />} label="Difficulty" value={difficultyLabel[species.difficulty ?? 'medium']} colorClass="bg-[rgba(13,148,136,0.08)]" />
                            <DetailChip icon={<CheckCircle size={14} />} label="Availability" value={availabilityLabel[species.availability ?? 'common']} colorClass="bg-[rgba(16,185,129,0.08)]" />
                            <DetailChip icon={<AlertTriangle size={14} />} label="Aggression" value={aggressionLabel[species.aggression ?? 'peaceful']} colorClass="bg-[rgba(239,68,68,0.08)]" />
                            <DetailChip icon={<Fish size={14} />} label="Behavior" value={behaviorLabel[species.behavior ?? 'social']} colorClass="bg-[rgba(59,130,246,0.08)]" />
                            <DetailChip icon={<Fish size={14} />} label="Swim Zone" value={swimLabel[species.swimLocation ?? 'middle']} colorClass="bg-[rgba(147,112,219,0.08)]" />
                            <DetailChip icon={<HelpCircle size={14} />} label="Breeding" value={breedingLabel[species.breeding ?? 'no_record']} colorClass="bg-[rgba(148,163,184,0.12)]" />
                          </div>

                          {/* Compatibility section */}
                          {compResults.length > 0 && (
                            <div className="mt-4">
                              <div className="
                                mb-2 text-caption font-bold tracking-wider
                                text-text-muted uppercase
                              ">
                                Tank Compatibility
                              </div>
                              {compResults.map(cr => {
                                const level = getCompatibilityLevel(cr.score);
                                const color = getCompatibilityColor(level);
                                return (
                                  <div key={cr.speciesId} className="
                                    flex items-center gap-2 border-b
                                    border-border py-1.5
                                    last:border-b-0
                                  ">
                                    <div className="
                                      size-2 shrink-0 rounded-full
                                    " style={{ backgroundColor: color }} />
                                    <span className="
                                      flex-1 text-xs font-semibold text-text
                                    ">{cr.speciesName}</span>
                                    <span className="text-caption font-bold" style={{ color }}>{cr.score}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                      {!species && (
                        <p className="text-xs text-text-muted">
                          No detailed species data available for this entry.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      <DeleteFishModal
        isOpen={fishToDelete !== null}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
};
