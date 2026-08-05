import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../models/classifiable_species.dart';
import '../../models/fish_insights_service.dart';
import '../../models/species_catalog.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/data_visuals.dart';
import '../widgets/glass.dart';
import '../widgets/pill_navigation.dart';
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
    final transitionDuration = OceanMotion.responsive(
      context,
      OceanMotion.sheet,
    );
    await showGeneralDialog<void>(
      context: context,
      useRootNavigator: true,
      barrierDismissible: true,
      barrierLabel: 'Dismiss add fish',
      barrierColor: Colors.transparent,
      transitionDuration: transitionDuration,
      pageBuilder: (sheetContext, _, _) {
        final keyboardInset = MediaQuery.viewInsetsOf(sheetContext).bottom;
        return AnimatedBuilder(
          animation: widget.controller,
          builder: (context, _) {
            if (widget.controller.activeTab != PrimaryTab.myFish) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (Navigator.of(sheetContext, rootNavigator: true).canPop()) {
                  Navigator.of(sheetContext, rootNavigator: true).pop();
                }
              });
            }
            return Stack(
              children: [
                Positioned.fill(
                  child: AnimatedPadding(
                    duration: transitionDuration,
                    curve: OceanMotion.smoothCurve,
                    padding: EdgeInsets.fromLTRB(
                      0,
                      OceanGeometry.heroHeight - OceanGeometry.contentGutter,
                      0,
                      keyboardInset,
                    ),
                    child: Material(
                      type: MaterialType.transparency,
                      child: _AddFishSheet(
                        controller: widget.controller,
                        onClose: () => Navigator.of(
                          sheetContext,
                          rootNavigator: true,
                        ).pop(),
                      ),
                    ),
                  ),
                ),
                if (widget.controller.activeTab == PrimaryTab.myFish)
                  PillNavigation(controller: widget.controller),
              ],
            );
          },
        );
      },
      transitionBuilder: (context, animation, _, child) {
        final eased = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOut,
          reverseCurve: Curves.easeIn,
        );
        return AnimatedBuilder(
          animation: eased,
          child: child,
          builder: (context, child) => Opacity(
            opacity: eased.value,
            child: Transform.translate(
              offset: Offset(0, 12 * (1 - eased.value)),
              child: child,
            ),
          ),
        );
      },
    );
  }

  Future<void> _requestDelete(FishEntry fish) async {
    final transitionDuration = OceanMotion.responsive(
      context,
      OceanMotion.sheet,
    );
    final confirmed = await showGeneralDialog<bool>(
      context: context,
      useRootNavigator: true,
      barrierDismissible: true,
      barrierLabel: 'Dismiss dialog',
      barrierColor: Colors.transparent,
      transitionDuration: transitionDuration,
      pageBuilder: (dialogContext, _, _) => Stack(
        children: [
          Positioned.fill(
            child: IgnorePointer(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
                child: ColoredBox(
                  color: OceanColors.prussianBlue.withValues(alpha: 0.50),
                ),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Material(
                  color: Colors.transparent,
                  child: _DeleteFishDialog(fish: fish),
                ),
              ),
            ),
          ),
        ],
      ),
      transitionBuilder: (context, animation, _, child) => FadeTransition(
        opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
        child: child,
      ),
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
                ],
              ),
            ),
            _CollapsibleContent(
              expanded: expanded,
              child: Padding(
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
                        letterSpacing: -0.13,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _CompatibilityRow(
                      label: 'Overall tank compatibility',
                      score: stats.compatibility,
                    ),
                  ],
                ),
              ),
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
    if (entries.isEmpty) return const SizedBox.expand();
    return Padding(
      padding: EdgeInsets.fromLTRB(
        alignRight ? 0 : 4,
        8,
        alignRight ? 4 : 0,
        8,
      ),
      child: Column(
        children: [
          const Spacer(),
          for (var index = 0; index < entries.length; index++) ...[
            _SpeciesLabel(fish: entries[index].value, alignRight: alignRight),
            if (index != entries.length - 1) ...[
              const SizedBox(height: 8),
              const Spacer(),
            ],
          ],
          const Spacer(),
        ],
      ),
    );
  }
}

class _SpeciesLabel extends StatelessWidget {
  const _SpeciesLabel({required this.fish, required this.alignRight});

  final FishEntry fish;
  final bool alignRight;

  @override
  Widget build(BuildContext context) {
    final displayName = _catalogSpeciesFor(fish.speciesId)?.name ?? fish.name;
    const style = TextStyle(
      fontFamily: 'Inter',
      fontSize: 11,
      height: 1.25,
      fontWeight: FontWeight.w500,
      letterSpacing: -0.11,
      color: OceanColors.inkMuted,
      decoration: TextDecoration.none,
    );
    return Row(
      mainAxisAlignment: alignRight
          ? MainAxisAlignment.end
          : MainAxisAlignment.start,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: SpeciesDonut.colorForSpeciesId(fish.speciesId),
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            displayName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: alignRight ? TextAlign.right : TextAlign.left,
            style: style,
          ),
        ),
        const SizedBox(width: 4),
        Text('(${fish.count})', maxLines: 1, style: style),
      ],
    );
  }
}

class _CollapsibleContent extends StatelessWidget {
  const _CollapsibleContent({required this.expanded, required this.child});

  final bool expanded;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final resizeDuration = OceanMotion.responsive(
      context,
      const Duration(milliseconds: 350),
    );
    final fadeDuration = OceanMotion.responsive(
      context,
      const Duration(milliseconds: 300),
    );
    final translated = AnimatedOpacity(
      opacity: expanded ? 1 : 0,
      duration: fadeDuration,
      curve: Curves.ease,
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(
          begin: expanded ? 0 : -12,
          end: expanded ? 0 : -12,
        ),
        duration: resizeDuration,
        curve: OceanMotion.smoothCurve,
        child: child,
        builder: (context, offset, child) =>
            Transform.translate(offset: Offset(0, offset), child: child),
      ),
    );
    return IgnorePointer(
      ignoring: !expanded,
      child: ExcludeSemantics(
        excluding: !expanded,
        child: TweenAnimationBuilder<double>(
          tween: Tween<double>(begin: expanded ? 1 : 0, end: expanded ? 1 : 0),
          duration: resizeDuration,
          curve: OceanMotion.smoothCurve,
          child: translated,
          builder: (context, factor, child) => ClipRect(
            child: Align(
              alignment: Alignment.topCenter,
              heightFactor: factor,
              child: child,
            ),
          ),
        ),
      ),
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
    final catalogSpecies = _catalogSpeciesFor(fish.speciesId);
    final displayName = catalogSpecies?.name ?? fish.name;
    final scientificName =
        catalogSpecies?.scientificName ?? fish.scientificName;
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      semanticLabel: '${fish.name}. ${fish.detected} of ${fish.count} visible.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: expanded ? 72 : 80),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
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
                          child: Row(
                            children: [
                              FishAvatar(
                                assetPath: fish.assetPath,
                                name: fish.name,
                                size: 56,
                                radius: 8,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      displayName,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: OceanTypography.strong,
                                    ),
                                    if (scientificName.isNotEmpty)
                                      Text(
                                        scientificName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: OceanTypography.caption.copyWith(
                                          fontStyle: FontStyle.italic,
                                        ),
                                      ),
                                    if (!expanded) ...[
                                      SizedBox(
                                        height: scientificName.isEmpty ? 2 : 4,
                                      ),
                                      Text(
                                        'Visible: ${fish.detected} / ${fish.count}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: OceanTypography.caption,
                                      ),
                                    ] else if (scientificName.isNotEmpty)
                                      const SizedBox(height: 4),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      VisibilityRing(
                        progress: fish.visibility,
                        showLabel: !expanded,
                      ),
                      if (expanded) ...[
                        const SizedBox(width: 4),
                        _CountStepper(
                          count: fish.count,
                          onDecrement: onDecrement,
                          onIncrement: onIncrement,
                        ),
                        const SizedBox(width: 4),
                        _TransparentIconButton(
                          icon: LucideIcons.trash2,
                          tooltip: 'Delete ${fish.name}',
                          onPressed: onDelete,
                          iconSize: 16,
                          color: OceanColors.inkMuted,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
          _CollapsibleContent(
            expanded: expanded && facts != null,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (facts != null) ...[
                    _DetailChip(
                      icon: LucideIcons.ruler,
                      label: 'Size',
                      value: '${_number(facts.sizeCm)} cm',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.maximize2,
                      label: 'Tank Min',
                      value: '${facts.tankLitres} L',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.thermometer,
                      label: 'Temp',
                      value:
                          '${_number(facts.tempMin)}–${_number(facts.tempMax)} °C',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.droplets,
                      label: 'pH',
                      value: '${_number(facts.phMin)}–${_number(facts.phMax)}',
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.circleCheck,
                      label: 'Availability',
                      value: facts.availability,
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.triangleAlert,
                      label: 'Aggression',
                      value: facts.aggressionLabel,
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.fish,
                      label: 'Behavior',
                      value: facts.behaviorLabel,
                    ),
                    const SizedBox(height: 12),
                    _DetailChip(
                      icon: LucideIcons.fish,
                      label: 'Swim Zone',
                      value: facts.swimZone,
                    ),
                    if (compatibilities.isEmpty)
                      const SizedBox(height: 14)
                    else ...[
                      const SizedBox(height: 16),
                      Text(
                        'Tank Compatibility'.toUpperCase(),
                        style: OceanTypography.caption,
                      ),
                      const SizedBox(height: 8),
                      for (
                        var index = 0;
                        index < compatibilities.length;
                        index++
                      ) ...[
                        _CompatibilityRow(
                          label:
                              _catalogSpeciesFor(
                                compatibilities[index].fish.speciesId,
                              )?.name ??
                              compatibilities[index].fish.name,
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
                ],
              ),
            ),
          ),
          _CollapsibleContent(
            expanded: expanded && facts == null,
            child: const Padding(
              padding: EdgeInsets.fromLTRB(10, 0, 10, 14),
              child: Text(
                'No detailed species data available for this entry.',
                style: OceanTypography.caption,
              ),
            ),
          ),
        ],
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
        _TransparentIconButton(
          icon: LucideIcons.minus,
          tooltip: 'Decrease fish count',
          onPressed: onDecrement,
          iconSize: 14,
          color: OceanColors.ink,
        ),
        const SizedBox(width: 2),
        SizedBox(
          width: 20,
          child: Semantics(
            label: 'Inventory count $count',
            child: Text(
              '$count',
              textAlign: TextAlign.center,
              style: OceanTypography.strong,
            ),
          ),
        ),
        const SizedBox(width: 2),
        _TransparentIconButton(
          icon: LucideIcons.plus,
          tooltip: 'Increase fish count',
          onPressed: onIncrement,
          iconSize: 14,
          color: OceanColors.ink,
        ),
      ],
    );
  }
}

class _TransparentIconButton extends StatelessWidget {
  const _TransparentIconButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    required this.iconSize,
    required this.color,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;
  final double iconSize;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: tooltip,
      child: Tooltip(
        message: tooltip,
        child: SizedBox.square(
          dimension: 36,
          child: IconButton(
            onPressed: onPressed,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints.tightFor(width: 36, height: 36),
            style: IconButton.styleFrom(
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              backgroundColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            icon: Icon(icon, size: iconSize, color: color),
          ),
        ),
      ),
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
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: OceanColors.prussianBlue.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: OceanColors.ink),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: OceanTypography.caption.copyWith(
                  height: 1.25,
                  color: OceanColors.ink,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: OceanTypography.caption.copyWith(
                  height: 1.25,
                  color: OceanColors.ink,
                ),
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
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
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
  final _searchFocusNode = FocusNode();
  String _query = '';
  bool _searchFocused = false;

  @override
  void initState() {
    super.initState();
    _searchFocusNode.addListener(_handleSearchFocus);
  }

  void _handleSearchFocus() {
    if (!mounted || _searchFocused == _searchFocusNode.hasFocus) return;
    setState(() => _searchFocused = _searchFocusNode.hasFocus);
  }

  @override
  void dispose() {
    _searchFocusNode.removeListener(_handleSearchFocus);
    _searchFocusNode.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final existingIds = widget.controller.fish
        .map((entry) => ClassifiableSpeciesCatalog.resolveId(entry.speciesId))
        .toSet();
    final tokens = _speciesSearchTokens(_query);
    final species = widget.controller.availableSpecies
        .where((option) {
          if (existingIds.contains(
            ClassifiableSpeciesCatalog.resolveId(option.id),
          )) {
            return false;
          }
          if (tokens.isEmpty) return true;
          final searchable = [
            option.name.toLowerCase(),
            option.scientificName.toLowerCase(),
            option.altName.toLowerCase(),
          ];
          return tokens.every(
            (token) => searchable.any((field) => field.contains(token)),
          );
        })
        .toList(growable: false);
    final bottomSafe = MediaQuery.viewPaddingOf(context).bottom;

    return Semantics(
      container: true,
      scopesRoute: true,
      namesRoute: true,
      explicitChildNodes: true,
      label: 'Add fish',
      child: LayoutBuilder(
        builder: (context, constraints) {
          final visibleHeight = constraints.maxHeight;
          return ClipRect(
            key: const ValueKey('add-fish-sheet-surface'),
            clipper: const _BelowHeroSheetClipper(),
            child: OverflowBox(
              alignment: Alignment.topCenter,
              minWidth: constraints.maxWidth,
              maxWidth: constraints.maxWidth,
              minHeight: visibleHeight + OceanRadii.card,
              maxHeight: visibleHeight + OceanRadii.card,
              child: GlassCard(
                overlay: true,
                radius: OceanRadii.card,
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                child: Padding(
                  // Push the card's rounded lower corners below the clipped
                  // sheet viewport so only the 28 px top radii remain visible.
                  padding: const EdgeInsets.only(bottom: OceanRadii.card),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: AnimatedContainer(
                              duration: OceanMotion.responsive(
                                context,
                                OceanMotion.smooth,
                              ),
                              curve: OceanMotion.smoothCurve,
                              constraints: const BoxConstraints(minHeight: 49),
                              decoration: BoxDecoration(
                                color: OceanColors.white.withValues(
                                  alpha: 0.55,
                                ),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: _searchFocused
                                      ? OceanColors.verdigris.withValues(
                                          alpha: 0.40,
                                        )
                                      : OceanColors.pearlAqua,
                                ),
                                boxShadow: _searchFocused
                                    ? [
                                        BoxShadow(
                                          color: OceanColors.verdigris
                                              .withValues(alpha: 0.10),
                                          spreadRadius: 3,
                                        ),
                                      ]
                                    : const [],
                              ),
                              child: TextField(
                                controller: _searchController,
                                focusNode: _searchFocusNode,
                                autofocus: true,
                                onChanged: (value) =>
                                    setState(() => _query = value),
                                textInputAction: TextInputAction.search,
                                style: OceanTypography.body.copyWith(
                                  fontSize: 16,
                                ),
                                decoration: const InputDecoration(
                                  hintText: 'Search common or scientific name',
                                  isDense: true,
                                  filled: false,
                                  contentPadding: EdgeInsets.only(
                                    top: 12,
                                    right: 12,
                                    bottom: 12,
                                  ),
                                  prefixIconConstraints: BoxConstraints(
                                    minWidth: 40,
                                  ),
                                  prefixIcon: Icon(
                                    LucideIcons.search,
                                    size: 16,
                                    color: OceanColors.inkMuted,
                                  ),
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  errorBorder: InputBorder.none,
                                  disabledBorder: InputBorder.none,
                                  focusedErrorBorder: InputBorder.none,
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
                            iconSize: 18,
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Expanded(
                        child: species.isEmpty
                            ? Align(
                                alignment: Alignment.topCenter,
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 24,
                                  ),
                                  child: Text(
                                    'No species found',
                                    textAlign: TextAlign.center,
                                    style: OceanTypography.bodyMuted,
                                  ),
                                ),
                              )
                            : ListView.builder(
                                keyboardDismissBehavior:
                                    ScrollViewKeyboardDismissBehavior.onDrag,
                                padding: EdgeInsets.only(
                                  bottom: 76 + bottomSafe,
                                ),
                                itemCount: species.length,
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
                                                        MainAxisAlignment
                                                            .center,
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment
                                                            .start,
                                                    children: [
                                                      Text(
                                                        option.name,
                                                        maxLines: 1,
                                                        overflow: TextOverflow
                                                            .ellipsis,
                                                        style: OceanTypography
                                                            .strong,
                                                      ),
                                                      const SizedBox(height: 2),
                                                      Text(
                                                        option.scientificName,
                                                        maxLines: 1,
                                                        overflow: TextOverflow
                                                            .ellipsis,
                                                        style: OceanTypography
                                                            .caption
                                                            .copyWith(
                                                              fontStyle:
                                                                  FontStyle
                                                                      .italic,
                                                            ),
                                                      ),
                                                    ],
                                                  ),
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
        },
      ),
    );
  }
}

class _BelowHeroSheetClipper extends CustomClipper<Rect> {
  const _BelowHeroSheetClipper();

  @override
  Rect getClip(Size size) =>
      Rect.fromLTRB(-64, -64, size.width + 64, size.height);

  @override
  bool shouldReclip(covariant _BelowHeroSheetClipper oldClipper) => false;
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

List<String> _speciesSearchTokens(String query) => query
    .toLowerCase()
    .trim()
    .replaceAll(RegExp(r'''[(){}\[\]"',.;:!?]'''), '')
    .split(RegExp(r'\s+'))
    .where((token) => token.length > 1)
    .toList(growable: false);

SpeciesOption? _catalogSpeciesFor(String speciesId) {
  final normalized = speciesId.toLowerCase().trim().replaceAll('-', '_');
  final catalogId = normalized == 'black_skirt_tetra'
      ? 'black_widow_tetra'
      : normalized;
  for (final species in SpeciesCatalog.options) {
    if (species.id == catalogId) return species;
  }
  return null;
}

Color _compatibilityColor(int score) {
  if (score >= 80) return OceanColors.goodInk;
  if (score >= 60) return const Color(0xFF3B82F6);
  if (score >= 40) return OceanColors.warningInk;
  if (score >= 20) return OceanColors.criticalInk;
  return const Color(0xFFDC2626);
}
