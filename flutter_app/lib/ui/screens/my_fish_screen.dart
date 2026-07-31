import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../models/fish_insights_service.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/data_visuals.dart';
import '../widgets/glass.dart';
import '../widgets/screen_primitives.dart';

/// Inventory content rendered below the shared aquarium hero.
class MyFishScreen extends StatefulWidget {
  const MyFishScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  State<MyFishScreen> createState() => _MyFishScreenState();
}

class _MyFishScreenState extends State<MyFishScreen> {
  bool _overviewExpanded = false;

  Future<void> _openAddSpecies() async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: OceanColors.prussianBlue.withValues(alpha: 0.28),
      constraints: const BoxConstraints(maxWidth: OceanGeometry.referenceWidth),
      builder: (sheetContext) => _AddFishSheet(
        controller: widget.controller,
        onClose: () => Navigator.of(sheetContext).pop(),
      ),
    );
  }

  Future<void> _requestDelete(FishEntry fish) async {
    final confirmed = await showOceanDialog<bool>(
      context: context,
      child: _DeleteFishDialog(fish: fish),
    );
    if (confirmed == true) widget.controller.deleteFish(fish.id);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.controller,
      builder: (context, _) {
        if (widget.controller.consumeAddFishRequest()) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _openAddSpecies();
          });
        }
        final fish = widget.controller.fish;
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _AquariumOverviewCard(
              fish: fish,
              stats: widget.controller.tankStats,
              expanded: _overviewExpanded,
              onToggle: () {
                setState(() => _overviewExpanded = !_overviewExpanded);
              },
            ),
            const SizedBox(height: OceanSpacing.md),
            if (fish.isEmpty)
              StateCard(
                icon: LucideIcons.fish,
                title: 'No fish in your inventory',
                description: 'Build your tank profile one species at a time.',
                action: GlassButton(
                  label: 'Add your first fish',
                  icon: LucideIcons.plus,
                  onPressed: _openAddSpecies,
                ),
              )
            else
              for (var index = 0; index < fish.length; index++) ...[
                _FishCard(
                  fish: fish[index],
                  facts: widget.controller.speciesFactsFor(
                    fish[index].speciesId,
                  ),
                  compatibilities: widget.controller.compatibilitiesFor(
                    fish[index].id,
                  ),
                  expanded: widget.controller.expandedFishId == fish[index].id,
                  onToggle: () =>
                      widget.controller.toggleFishExpanded(fish[index].id),
                  onIncrement: () =>
                      widget.controller.adjustFishCount(fish[index].id, 1),
                  onDecrement: () =>
                      widget.controller.adjustFishCount(fish[index].id, -1),
                  onDelete: () => _requestDelete(fish[index]),
                ),
                if (index != fish.length - 1)
                  const SizedBox(height: OceanSpacing.md),
              ],
          ],
        );
      },
    );
  }
}

class _AquariumOverviewCard extends StatelessWidget {
  const _AquariumOverviewCard({
    required this.fish,
    required this.stats,
    required this.expanded,
    required this.onToggle,
  });

  final List<FishEntry> fish;
  final TankStats stats;
  final bool expanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final total = fish.fold<int>(0, (sum, entry) => sum + entry.count);
    final detected = fish.fold<int>(0, (sum, entry) => sum + entry.detected);
    final progress = total == 0 ? 0.0 : detected / total;
    return Semantics(
      button: true,
      expanded: expanded,
      label:
          'Fish Overview. ${fish.length} species. $detected of $total fish visible.',
      child: GlassCard(
        onTap: onToggle,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SpeciesDistribution(fish: fish),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  const SizedBox.square(
                    dimension: 40,
                    child: Center(
                      child: Icon(
                        LucideIcons.fish,
                        size: 29,
                        color: OceanColors.ink,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Fish Overview',
                          style: OceanTypography.title,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${fish.length} species',
                          style: OceanTypography.caption.copyWith(
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Visible: $detected / $total',
                          style: OceanTypography.caption,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  VisibilityRing(progress: progress),
                  AnimatedRotation(
                    turns: expanded ? 0.25 : 0,
                    duration: OceanMotion.responsive(
                      context,
                      OceanMotion.smooth,
                    ),
                    child: const Icon(
                      LucideIcons.chevronRight,
                      size: 18,
                      color: OceanColors.inkMuted,
                    ),
                  ),
                ],
              ),
            ),
            AnimatedSize(
              alignment: Alignment.topCenter,
              duration: OceanMotion.responsive(
                context,
                const Duration(milliseconds: 350),
              ),
              curve: OceanMotion.smoothCurve,
              child: expanded
                  ? Padding(
                      padding: const EdgeInsets.fromLTRB(10, 0, 10, 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _DetailChip(
                            icon: LucideIcons.maximize2,
                            label: 'Ideal Tank Min',
                            value: stats.idealTankLitres == null
                                ? '—'
                                : '${stats.idealTankLitres} L',
                          ),
                          const SizedBox(height: 12),
                          _DetailChip(
                            icon: LucideIcons.thermometer,
                            label: 'Ideal Temp',
                            value: stats.temperatureRange,
                          ),
                          const SizedBox(height: 12),
                          _DetailChip(
                            icon: LucideIcons.droplets,
                            label: 'Ideal pH',
                            value: stats.phRange,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Tank Compatibility'.toUpperCase(),
                            style: OceanTypography.caption.copyWith(
                              color: OceanColors.inkMuted,
                              fontSize: 11,
                              letterSpacing: 0.35,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _CompatibilityRow(
                            label: 'Overall tank compatibility',
                            score: stats.compatibility,
                          ),
                        ],
                      ),
                    )
                  : const SizedBox(width: double.infinity),
            ),
          ],
        ),
      ),
    );
  }
}

class _SpeciesDistribution extends StatelessWidget {
  const _SpeciesDistribution({required this.fish});

  final List<FishEntry> fish;

  @override
  Widget build(BuildContext context) {
    if (fish.isEmpty) return SpeciesDonut(fish: fish);
    final ordered = [...fish]..sort((a, b) => b.count.compareTo(a.count));
    final left = <MapEntry<int, FishEntry>>[];
    final right = <MapEntry<int, FishEntry>>[];
    for (var index = 0; index < ordered.length; index++) {
      (index.isEven ? left : right).add(MapEntry(index, ordered[index]));
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final donutSize =
            (constraints.maxWidth * (fish.length > 4 ? 0.40 : 0.50)).clamp(
              112.0,
              fish.length > 4 ? 176.0 : 165.0,
            );
        return SizedBox(
          height: donutSize,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: _SpeciesLabels(entries: left, alignRight: true)),
              SpeciesDonut(fish: ordered, size: donutSize),
              Expanded(child: _SpeciesLabels(entries: right)),
            ],
          ),
        );
      },
    );
  }
}

class _SpeciesLabels extends StatelessWidget {
  const _SpeciesLabels({required this.entries, this.alignRight = false});

  final List<MapEntry<int, FishEntry>> entries;
  final bool alignRight;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        for (final entry in entries)
          Row(
            mainAxisAlignment: alignRight
                ? MainAxisAlignment.end
                : MainAxisAlignment.start,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: SpeciesDonut
                      .colors[entry.key % SpeciesDonut.colors.length],
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  '${entry.value.name} (${entry.value.count})',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: alignRight ? TextAlign.right : TextAlign.left,
                  style: OceanTypography.caption.copyWith(fontSize: 10.5),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

class _FishCard extends StatelessWidget {
  const _FishCard({
    required this.fish,
    required this.facts,
    required this.compatibilities,
    required this.expanded,
    required this.onToggle,
    required this.onIncrement,
    required this.onDecrement,
    required this.onDelete,
  });

  final FishEntry fish;
  final SpeciesFacts? facts;
  final List<FishCompatibility> compatibilities;
  final bool expanded;
  final VoidCallback onToggle;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final facts = this.facts;
    return AnimatedSize(
      alignment: Alignment.topCenter,
      duration: OceanMotion.responsive(
        context,
        const Duration(milliseconds: 350),
      ),
      curve: OceanMotion.smoothCurve,
      child: GlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        semanticLabel:
            '${fish.name}. ${fish.detected} of ${fish.count} visible.',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 80),
              child: Row(
                children: [
                  Expanded(
                    child: Semantics(
                      button: true,
                      expanded: expanded,
                      label: '${fish.name} details',
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: onToggle,
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            child: Row(
                              children: [
                                FishAvatar(
                                  assetPath: fish.assetPath,
                                  name: fish.name,
                                  size: 56,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        fish.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: OceanTypography.strong,
                                      ),
                                      if (fish.scientificName.isNotEmpty) ...[
                                        const SizedBox(height: 1),
                                        Text(
                                          fish.scientificName,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: OceanTypography.caption
                                              .copyWith(
                                                fontStyle: FontStyle.italic,
                                              ),
                                        ),
                                      ],
                                      if (!expanded) ...[
                                        const SizedBox(height: 3),
                                        Text(
                                          'Visible: ${fish.detected} / ${fish.count}',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: OceanTypography.caption,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  VisibilityRing(progress: fish.visibility, showLabel: false),
                  if (!expanded) ...[
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 36,
                      child: Text(
                        '${(fish.visibility * 100).round()}%',
                        textAlign: TextAlign.center,
                        style: OceanTypography.strong.copyWith(
                          color: _visibilityColor(fish.visibility),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (expanded) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 0, 10, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Visible: ${fish.detected} / ${fish.count}',
                        maxLines: 2,
                        style: OceanTypography.caption,
                      ),
                    ),
                    _CountStepper(
                      count: fish.count,
                      onDecrement: onDecrement,
                      onIncrement: onIncrement,
                    ),
                    const SizedBox(width: 4),
                    GlassIconButton(
                      icon: LucideIcons.trash2,
                      tooltip: 'Delete ${fish.name}',
                      onPressed: onDelete,
                      color: OceanColors.critical,
                      background: Colors.transparent,
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 0, 10, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _DetailChip(
                      icon: LucideIcons.ruler,
                      label: 'Size',
                      value: facts == null
                          ? '—'
                          : '${_number(facts.sizeCm)} cm',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.maximize2,
                      label: 'Tank Min',
                      value: facts == null ? '—' : '${facts.tankLitres} L',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.thermometer,
                      label: 'Temp',
                      value: facts == null
                          ? '—'
                          : '${_number(facts.tempMin)}–${_number(facts.tempMax)} °C',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.droplets,
                      label: 'pH',
                      value: facts == null
                          ? '—'
                          : '${_number(facts.phMin)}–${_number(facts.phMax)}',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.circleCheck,
                      label: 'Availability',
                      value: facts?.availability ?? '—',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.triangleAlert,
                      label: 'Aggression',
                      value: facts?.aggressionLabel ?? '—',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.fish,
                      label: 'Behavior',
                      value: facts?.behaviorLabel ?? '—',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.fish,
                      label: 'Swim Zone',
                      value: facts?.swimZone ?? '—',
                    ),
                    if (compatibilities.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Text(
                        'Tank Compatibility'.toUpperCase(),
                        style: OceanTypography.caption.copyWith(
                          fontSize: 11,
                          letterSpacing: 0.35,
                        ),
                      ),
                      const SizedBox(height: 8),
                      for (
                        var index = 0;
                        index < compatibilities.length;
                        index++
                      ) ...[
                        _CompatibilityRow(
                          label: compatibilities[index].fish.name,
                          score: compatibilities[index].score,
                        ),
                        if (index != compatibilities.length - 1)
                          Divider(
                            height: 1,
                            color: OceanColors.slateGrey.withValues(
                              alpha: 0.15,
                            ),
                          ),
                      ],
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CountStepper extends StatelessWidget {
  const _CountStepper({
    required this.count,
    required this.onDecrement,
    required this.onIncrement,
  });

  final int count;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        GlassIconButton(
          icon: LucideIcons.minus,
          tooltip: 'Decrease fish count',
          onPressed: count > 1 ? onDecrement : null,
          iconSize: 15,
          background: Colors.transparent,
        ),
        SizedBox(
          width: 18,
          child: Semantics(
            label: 'Inventory count $count',
            child: Text(
              '$count',
              textAlign: TextAlign.center,
              style: OceanTypography.strong,
            ),
          ),
        ),
        GlassIconButton(
          icon: LucideIcons.plus,
          tooltip: 'Increase fish count',
          onPressed: count < 99 ? onIncrement : null,
          iconSize: 15,
          background: Colors.transparent,
        ),
      ],
    );
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $value',
      child: GlassPanel(
        radius: 12,
        color: OceanColors.prussianBlue.withValues(alpha: 0.03),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Icon(icon, size: 14, color: OceanColors.ink),
            const SizedBox(width: 8),
            Expanded(child: Text(label, style: OceanTypography.caption)),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: OceanTypography.caption.copyWith(color: OceanColors.ink),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CompatibilityRow extends StatelessWidget {
  const _CompatibilityRow({required this.label, required this.score});

  final String label;
  final int? score;

  @override
  Widget build(BuildContext context) {
    final score = this.score;
    final color = score == null
        ? OceanColors.inkMuted
        : _compatibilityColor(score);
    return Semantics(
      label: score == null
          ? '$label, compatibility not available'
          : '$label, $score percent compatible',
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 32),
        child: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Expanded(child: Text(label, style: OceanTypography.caption)),
            Text(
              score == null ? '—' : '$score%',
              style: OceanTypography.caption.copyWith(color: color),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddFishSheet extends StatefulWidget {
  const _AddFishSheet({required this.controller, required this.onClose});

  final OceanEyesController controller;
  final VoidCallback onClose;

  @override
  State<_AddFishSheet> createState() => _AddFishSheetState();
}

class _AddFishSheetState extends State<_AddFishSheet> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final existingIds = widget.controller.fish
        .map((entry) => entry.speciesId)
        .toSet();
    final normalized = _query.trim().toLowerCase();
    final species = widget.controller.availableSpecies
        .where((option) {
          if (existingIds.contains(option.id)) return false;
          if (normalized.isEmpty) return true;
          return option.name.toLowerCase().contains(normalized) ||
              option.scientificName.toLowerCase().contains(normalized);
        })
        .toList(growable: false);
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;

    return Semantics(
      container: true,
      scopesRoute: true,
      namesRoute: true,
      explicitChildNodes: true,
      label: 'Add fish',
      child: FractionallySizedBox(
        heightFactor: 1,
        child: AnimatedPadding(
          duration: OceanMotion.responsive(context, OceanMotion.sheet),
          padding: EdgeInsets.only(bottom: keyboardInset),
          child: GlassCard(
            overlay: true,
            radius: OceanRadii.card,
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        autofocus: true,
                        onChanged: (value) => setState(() => _query = value),
                        textInputAction: TextInputAction.search,
                        style: OceanTypography.body.copyWith(fontSize: 16),
                        decoration: InputDecoration(
                          hintText: 'Search common or scientific name',
                          prefixIcon: const Icon(
                            LucideIcons.search,
                            size: 18,
                            color: OceanColors.inkMuted,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GlassIconButton(
                      icon: LucideIcons.x,
                      tooltip: 'Close add fish',
                      onPressed: widget.onClose,
                      background: Colors.transparent,
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Expanded(
                  child: species.isEmpty
                      ? Center(
                          child: Text(
                            'No species found',
                            style: OceanTypography.bodyMuted,
                          ),
                        )
                      : ListView.separated(
                          keyboardDismissBehavior:
                              ScrollViewKeyboardDismissBehavior.onDrag,
                          padding: const EdgeInsets.only(bottom: 76),
                          itemCount: species.length,
                          separatorBuilder: (_, _) => Divider(
                            height: 1,
                            color: OceanColors.slateGrey.withValues(
                              alpha: 0.12,
                            ),
                          ),
                          itemBuilder: (context, index) {
                            final option = species[index];
                            return Semantics(
                              button: true,
                              label:
                                  '${option.name}, ${option.scientificName}. Add species.',
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () {
                                    widget.controller.addSpecies(option);
                                    Navigator.of(context).pop();
                                  },
                                  borderRadius: BorderRadius.circular(16),
                                  child: ConstrainedBox(
                                    constraints: const BoxConstraints(
                                      minHeight: 80,
                                    ),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 8,
                                      ),
                                      child: Row(
                                        children: [
                                          FishAvatar(
                                            assetPath: option.assetPath,
                                            name: option.name,
                                            size: 64,
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  option.name,
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                  style: OceanTypography.strong,
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  option.scientificName,
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                  style: OceanTypography.caption
                                                      .copyWith(
                                                        fontStyle:
                                                            FontStyle.italic,
                                                      ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const Icon(
                                            LucideIcons.plus,
                                            size: 18,
                                            color: OceanColors.verdigris,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DeleteFishDialog extends StatelessWidget {
  const _DeleteFishDialog({required this.fish});

  final FishEntry fish;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      scopesRoute: true,
      namesRoute: true,
      explicitChildNodes: true,
      label: 'Delete Fish Entry',
      child: GlassCard(
        overlay: true,
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Delete Fish Entry', style: OceanTypography.title),
            const SizedBox(height: 8),
            Text(
              'Are you sure you want to delete this fish entry? This action '
              'cannot be undone.',
              style: OceanTypography.bodyMuted,
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Flexible(
                  child: GlassButton(
                    label: 'Cancel',
                    style: GlassButtonStyle.outline,
                    onPressed: () => Navigator.of(context).pop(false),
                  ),
                ),
                const SizedBox(width: 12),
                Flexible(
                  child: GlassButton(
                    label: 'Delete',
                    style: GlassButtonStyle.destructive,
                    onPressed: () => Navigator.of(context).pop(true),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

String _number(double value) => value == value.roundToDouble()
    ? value.round().toString()
    : value.toStringAsFixed(value * 10 == (value * 10).round() ? 1 : 2);

Color _visibilityColor(double progress) {
  if (progress >= 0.8) return OceanColors.goodInk;
  if (progress >= 0.5) return OceanColors.warningInk;
  return OceanColors.criticalInk;
}

Color _compatibilityColor(int score) {
  if (score >= 80) return OceanColors.goodInk;
  if (score >= 60) return const Color(0xFF1D4ED8);
  if (score >= 40) return OceanColors.warningInk;
  return OceanColors.criticalInk;
}
