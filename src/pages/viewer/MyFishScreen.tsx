import React from 'react';
import { useMyFish } from '../../hooks/pages/useMyFish';
import {
  Trash2, Fish, Minus, Plus, X,
  Thermometer, Droplets, Ruler, Maximize2,
  AlertTriangle, CheckCircle
} from 'lucide-react';
import DetectionVisibilityRing from '../../components/fish/DetectionVisibilityRing';
import { DonutChart } from '../../components/fish/DonutChart';
import { FishThumbnail } from '../../components/fish/FishThumbnail';
import { DetailChip } from '../../components/fish/DetailChip';
import { SpeciesSelector } from '../../components/SpeciesSelector';
import {
  GlassButton,
  GlassCard,
  CollapsibleContent,
  GlassIconButton,
  GlassModal,
  ScreenHeader,
  ScreenState,
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
  Aggression,
  BehaviorType,
  SwimLocation,
  Availability,
} from '../../types/aquarium';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  <div className="flex items-center gap-0.5">
    <button
      type="button"
      aria-label="Decrease fish count"
      className="
        flex size-9 cursor-pointer items-center justify-center border-none bg-transparent
        type-strong
      "
      onClick={onDecrement}
    >
      <Minus size={14} strokeWidth={2.25} aria-hidden="true" />
    </button>
    <span className="w-5 text-center type-strong">{count}</span>
    <button
      type="button"
      aria-label="Increase fish count"
      className="
        flex size-9 cursor-pointer items-center justify-center border-none bg-transparent
        type-strong
      "
      onClick={onIncrement}
    >
      <Plus size={14} strokeWidth={2.25} aria-hidden="true" />
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
  <GlassModal isOpen={isOpen} onClose={onCancel} labelledBy="delete-fish-title">
    <h3 id="delete-fish-title" className="mb-2 type-title">Delete Fish Entry</h3>
    <p className="mb-6 type-body-muted">
      Are you sure you want to delete this fish entry? This action cannot be undone.
    </p>
    <div className="flex justify-end gap-3">
      <GlassButton variant="outline" size="md" onClick={onCancel}>Cancel</GlassButton>
      <GlassButton variant="danger" size="md" onClick={onConfirm}>Delete</GlassButton>
    </div>
  </GlassModal>
);

interface AddSpeciesFormProps {
  isOpen: boolean;
  fishList: { speciesId: string }[];
  onSpeciesSelect: (species: SpeciesInfo | null, customName?: string) => void;
  onClose: () => void;
}

const AddSpeciesForm: React.FC<AddSpeciesFormProps> = ({
  isOpen,
  fishList,
  onSpeciesSelect,
  onClose,
}) => (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      placement="below-hero"
      labelledBy="add-fish-title"
      className="flex min-h-0 flex-col px-3 pt-3"
    >
      <h2 id="add-fish-title" className="sr-only">Add fish</h2>
      <SpeciesSelector
        selectedSpeciesId={null}
        onSelect={onSpeciesSelect}
        placeholder="Search common or scientific name"
        excludeSpeciesIds={fishList.map((fish) => fish.speciesId)}
        inputAction={(
          <GlassIconButton
            size="sm"
            label="Close add fish"
            onClick={onClose}
            className="
              shrink-0 border-none! bg-transparent! shadow-none!
              backdrop-blur-none! hover:bg-transparent!
            "
          >
            <X size={18} />
          </GlassIconButton>
        )}
      />
    </GlassModal>
);

export const MyFishScreen: React.FC = () => {
  const hookValues = useMyFish();
  const {
    fishList,
    stats,
    speciesDistribution,
    showAddForm,
    activeFishId,
    aquariumOverviewExpanded,
    fishToDelete,
    getSpeciesDisplay,
    onToggleAddForm,
    onCloseAddForm,
    onSpeciesSelect,
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
    <div className="flex flex-col gap-4">
      <ScreenHeader
        eyebrow="Aquarium inventory"
        action={(
          <div>
            <GlassButton
              variant="outline"
              size="sm"
              onClick={onToggleAddForm}
              aria-label="Add fish"
              className="hero-overlay-pill !min-h-8 gap-1 rounded-full !px-2 !py-0"
            >
              <Plus size={13} strokeWidth={2.5} aria-hidden="true" />
              <span className="type-caption !text-xs !font-normal !text-white">Add fish</span>
            </GlassButton>
          </div>
        )}
      />

      <AddSpeciesForm
        isOpen={showAddForm}
        fishList={fishList}
        onSpeciesSelect={onSpeciesSelect}
        onClose={onCloseAddForm}
      />

      {/* ─── Layout ─── */}
      <div className="flex flex-col gap-4">
        {/* Chart & Stats */}
        <div className="flex flex-col gap-4">
          <GlassCard
            className="!p-5"
            clickable
            role="button"
            tabIndex={0}
            onClick={onToggleAquariumOverview}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleAquariumOverview();
              }
            }}
          >
            <DonutChart speciesDistribution={speciesDistribution} />

            <div
              data-aquarium-overview
              className="
                mt-2 flex items-center justify-between rounded-xl
                p-3
              "
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="
                  flex size-10 shrink-0 items-center justify-center rounded-lg
                ">
                  <Fish size={29} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate type-title">Fish Overview</span>
                  <span className="mt-0.5 block type-caption italic">
                    {stats.uniqueSpecies} species
                  </span>
                  <span className="mt-0.5 block type-caption">
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

            <CollapsibleContent
              expanded={aquariumOverviewExpanded}
              className="p-[0_12px_16px_12px]"
            >
                  <div className="grid grid-cols-1 gap-3">
                    <DetailChip
                      icon={<Maximize2 size={14} />}
                      label="Ideal Tank Min"
                      value={stats.idealTankSizeL != null ? `${stats.idealTankSizeL} L` : '—'}
                    />
                    <DetailChip
                      icon={<Thermometer size={14} />}
                      label="Ideal Temp"
                      value={
                        stats.tempResult.range != null
                          ? formatRange(stats.tempResult.range[0], stats.tempResult.range[1], '°C')
                          : '—'
                      }
                    />
                    <DetailChip
                      icon={<Droplets size={14} />}
                      label="Ideal pH"
                      value={
                        stats.phResult.range != null
                          ? formatRange(stats.phResult.range[0], stats.phResult.range[1], '', 1)
                          : '—'
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <div className="
                      mb-2 type-caption
                      text-slate-grey uppercase
                    ">
                      Tank Compatibility
                    </div>
                    <div className="
                      flex items-center gap-2 border-b border-azure-mist-2 py-1.5
                      last:border-b-0
                    ">
                      <div
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: getCompatibilityColor(
                            getCompatibilityLevel(stats.overallCompatibility)
                          ),
                        }}
                      />
                      <span className="
                        flex-1 type-caption
                      ">Overall tank compatibility</span>
                      <span
                        className="type-caption"
                        style={{
                          color: getCompatibilityColor(
                            getCompatibilityLevel(stats.overallCompatibility)
                          ),
                        }}
                      >
                        {stats.overallCompatibility}%
                      </span>
                    </div>
                  </div>
            </CollapsibleContent>
          </GlassCard>
        </div>

        {/* Right Column — Fish Cards */}
        <div className="flex flex-col gap-4">
          {fishList.length === 0 && (
            <GlassCard className="p-0">
              <ScreenState
                icon={Fish}
                title="No fish in your inventory"
                description="Build your tank profile one species at a time."
                action={(
                  <GlassButton variant="primary" size="md" onClick={onToggleAddForm}>
                    <Plus size={18} aria-hidden="true" />
                    Add your first fish
                  </GlassButton>
                )}
              />
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
              <GlassCard
                key={fish.id}
                data-fish-card
                clickable
                className="flex flex-col overflow-hidden px-4! py-3!"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button')) return;
                  onToggleFish(fish.id);
                }}
              >
                {/* Main row — always visible */}
                <div className="flex items-center justify-between px-3 py-2.5">
                  <button
                    type="button"
                    className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent text-left focus-visible:outline-2 focus-visible:outline-pine-teal"
                    onClick={() => onToggleFish(fish.id)}
                    aria-expanded={isActive}
                  >
                    <FishThumbnail imagePath={display.imagePath} initials={display.initials} color={display.color} />
                    <div className="min-w-0 flex-1">
                      <span className="
                        block truncate type-strong
                      ">{display.name}</span>
                      {species?.scientificName && (
                        <span className="
                          mb-1 block truncate type-caption
                          text-slate-grey italic
                        ">{species.scientificName}</span>
                      )}
                      {!isActive && (
                        <span className="mt-0.5 block type-caption">
                          Visible: {fish.detected} / {fish.count}
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    {/* Visibility ring */}
                    <DetectionVisibilityRing
                      detected={fish.detected}
                      expected={fish.count}
                      showLabel={!isActive}
                    />

                    {isActive && (
                      <>
                        <FishCountStepper
                          count={fish.count}
                          onDecrement={() => onDecrementCount(fish.id, fish.count)}
                          onIncrement={() => onIncrementCount(fish.id, fish.count)}
                        />
                        <GlassIconButton
                          size="sm"
                          label="Delete fish"
                          onClick={() => onRequestDelete(fish.id)}
                          className="
                            size-9! border-none! bg-transparent! p-0! shadow-none!
                            backdrop-blur-none!
                            hover:bg-transparent! hover:shadow-none!
                          "
                        >
                          <Trash2 size={16} />
                        </GlassIconButton>
                      </>
                    )}
                  </div>
                </div>

                {/* ─── Expanded Detail Panel ─── */}
                <CollapsibleContent
                  expanded={isActive && species !== undefined}
                  className="p-[0_12px_16px_12px]"
                >
                      {species && (
                        <>
                          {/* Parameter chips — 2-column grid */}
                          <div className="
                            mb-3.5 grid grid-cols-1 gap-3
                            sm:grid-cols-2
                          ">
                            <DetailChip icon={<Ruler size={14} />} label="Size" value={`${species.sizeCm} cm`} />
                            <DetailChip icon={<Maximize2 size={14} />} label="Tank Min" value={`${species.minTankSizeL} L`} />
                            <DetailChip icon={<Thermometer size={14} />} label="Temp" value={`${species.tempMin}–${species.tempMax} °C`} />
                            <DetailChip icon={<Droplets size={14} />} label="pH" value={`${species.phMin}–${species.phMax}`} />
                            <DetailChip icon={<CheckCircle size={14} />} label="Availability" value={availabilityLabel[species.availability ?? 'common']} />
                            <DetailChip icon={<AlertTriangle size={14} />} label="Aggression" value={aggressionLabel[species.aggression ?? 'peaceful']} />
                            <DetailChip icon={<Fish size={14} />} label="Behavior" value={behaviorLabel[species.behavior ?? 'social']} />
                            <DetailChip icon={<Fish size={14} />} label="Swim Zone" value={swimLabel[species.swimLocation ?? 'middle']} />
                          </div>

                          {/* Compatibility section */}
                          {compResults.length > 0 && (
                            <div className="mt-4">
                              <div className="
                                mb-2 type-caption
                                text-slate-grey uppercase
                              ">
                                Tank Compatibility
                              </div>
                              {compResults.map(cr => {
                                const level = getCompatibilityLevel(cr.score);
                                const color = getCompatibilityColor(level);
                                return (
                                  <div key={cr.speciesId} className="
                                    flex items-center gap-2 border-b
                                    border-azure-mist-2 py-1.5
                                    last:border-b-0
                                  ">
                                    <div className="
                                      size-2 shrink-0 rounded-full
                                    " style={{ backgroundColor: color }} />
                                    <span className="
                                      flex-1 type-caption
                                    ">{cr.speciesName}</span>
                                    <span className="type-caption" style={{ color }}>{cr.score}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                      {!species && (
                        <p className="type-caption">
                          No detailed species data available for this entry.
                        </p>
                      )}
                </CollapsibleContent>
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
