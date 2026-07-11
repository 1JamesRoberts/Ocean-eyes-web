import React from 'react';
import { useMyFish } from '../../hooks/pages/useMyFish';
import {
  Trash2, Fish, Plus, X,
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
  GlassIconButton,
  GlassModal,
  ScreenHeader,
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
  <div className="
    flex items-center rounded-xl border border-white/20 bg-white/30 p-0.5
  ">
    <button
      className="
        flex size-6 cursor-pointer items-center justify-center border-none
        bg-transparent type-strong
      "
      onClick={onDecrement}
    >
      -
    </button>
    <span className="w-6 text-center type-strong">{count}</span>
    <button
      className="
        flex size-6 cursor-pointer items-center justify-center border-none
        bg-transparent type-strong
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
      placement="bottom"
      labelledBy="add-fish-title"
      className="flex flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <h2 id="add-fish-title" className="sr-only">Add fish</h2>
        <div className="flex justify-end px-3 pt-3">
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-5">
          <SpeciesSelector
            selectedSpeciesId={null}
            onSelect={onSpeciesSelect}
            placeholder="Search common or scientific name"
            excludeSpeciesIds={fishList.map((fish) => fish.speciesId)}
            presentation="inline"
          />
        </div>
      </div>
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
    <div className="flex flex-col">
      <ScreenHeader
        eyebrow="Aquarium inventory"
        className="relative items-start mb-4"
        action={(
          <div className="absolute top-0 right-0 -translate-y-2.5">
            <GlassButton
              variant="outline"
              size="sm"
              onClick={onToggleAddForm}
              aria-label="Add fish"
              className="!h-9 !gap-1.5 !rounded-full !px-3"
            >
              <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
              <span className="font-semibold">Add fish</span>
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
      <div className="flex flex-col gap-6">
        {/* Chart & Stats */}
        <div className="flex flex-col gap-4">
          <GlassCard
            className="!p-5"
            clickable
            hover
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
                  <Fish size={29} className="text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="
                    block truncate type-strong
                  ">Fish Overview</span>
                  <span className="
                    mb-1 block truncate type-caption
                    italic
                  ">{stats.uniqueSpecies} species</span>
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
                  <div className="grid grid-cols-1 gap-3">
                    <DetailChip
                      icon={<Maximize2 size={14} />}
                      label="Ideal Tank Min"
                      value={stats.idealTankSizeL != null ? `${stats.idealTankSizeL} L` : '—'}
                      colorClass="bg-[rgba(16,185,129,0.08)]"
                    />
                    <DetailChip
                      icon={<Thermometer size={14} />}
                      label="Ideal Temp"
                      value={
                        stats.tempResult.range != null
                          ? formatRange(stats.tempResult.range[0], stats.tempResult.range[1], '°C')
                          : '—'
                      }
                      colorClass="bg-[rgba(245,158,11,0.08)]"
                    />
                    <DetailChip
                      icon={<Droplets size={14} />}
                      label="Ideal pH"
                      value={
                        stats.phResult.range != null
                          ? formatRange(stats.phResult.range[0], stats.phResult.range[1], '', 1)
                          : '—'
                      }
                      colorClass="bg-[rgba(147,112,219,0.08)]"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="
                      mb-2 type-caption
                      text-text-muted uppercase
                    ">
                      Tank Compatibility
                    </div>
                    <div className="
                      flex items-center gap-2 border-b border-border py-1.5
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
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column — Fish Cards */}
        <div className="flex flex-col gap-3">
          {fishList.length === 0 && (
            <GlassCard className="p-6 text-center">
              <span className="mb-2 block text-5xl">🐟</span>
              <p className="type-strong">No fish in your inventory</p>
              <p className="mt-1 type-caption">Build your tank profile one species at a time.</p>
              <GlassButton
                variant="primary"
                size="md"
                onClick={onToggleAddForm}
                className="mt-4"
              >
                <Plus size={18} aria-hidden="true" />
                Add your first fish
              </GlassButton>
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
                  flex cursor-pointer flex-col overflow-hidden p-4!
                "
                onClick={() => onToggleFish(fish.id)}
              >
                {/* Main row — always visible */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <FishThumbnail imagePath={display.imagePath} initials={display.initials} color={display.color} />
                    <div className="min-w-0 flex-1">
                      <span className="
                        block truncate type-strong
                      ">{display.name}</span>
                      {species?.scientificName && (
                        <span className="
                          mb-1 block truncate type-caption
                          text-text-muted italic
                        ">{species.scientificName}</span>
                      )}
                      <span className="mt-0.5 block type-caption">
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
                            <DetailChip icon={<CheckCircle size={14} />} label="Availability" value={availabilityLabel[species.availability ?? 'common']} colorClass="bg-[rgba(16,185,129,0.08)]" />
                            <DetailChip icon={<AlertTriangle size={14} />} label="Aggression" value={aggressionLabel[species.aggression ?? 'peaceful']} colorClass="bg-[rgba(239,68,68,0.08)]" />
                            <DetailChip icon={<Fish size={14} />} label="Behavior" value={behaviorLabel[species.behavior ?? 'social']} colorClass="bg-[rgba(59,130,246,0.08)]" />
                            <DetailChip icon={<Fish size={14} />} label="Swim Zone" value={swimLabel[species.swimLocation ?? 'middle']} colorClass="bg-[rgba(147,112,219,0.08)]" />
                          </div>

                          {/* Compatibility section */}
                          {compResults.length > 0 && (
                            <div className="mt-4">
                              <div className="
                                mb-2 type-caption
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
