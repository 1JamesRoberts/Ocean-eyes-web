import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../models/species_catalog.dart';
import '../../models/fish_insights_service.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/glass.dart';

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
    final sheetTop =
        OceanGeometry.statusBarHeight + OceanGeometry.heroHeight - 16;
    final sheetHeight = math.max(
      0.0,
      MediaQuery.sizeOf(context).height - sheetTop,
    );
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: false,
      useRootNavigator: true,
      isScrollControlled: true,
      enableDrag: false,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.transparent,
      constraints: BoxConstraints(
        minHeight: sheetHeight,
        maxHeight: sheetHeight,
        maxWidth: OceanGeometry.referenceWidth,
      ),
      sheetAnimationStyle: AnimationStyle(
        duration: OceanMotion.responsive(context, OceanMotion.sheet),
        reverseDuration: OceanMotion.responsive(context, OceanMotion.sheet),
      ),
      builder: (sheetContext) => SizedBox(
        height: sheetHeight,
        child: _AddFishSheet(
          controller: widget.controller,
          onClose: () => Navigator.of(sheetContext).pop(),
        ),
      ),
    );
  }

  Future<void> _requestDelete(FishEntry fish) async {
    final confirmed = await _showMyFishDialog<bool>(
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
              _MyFishEmptyCard(onAdd: _openAddSpecies)
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

class _MyFishEmptyCard extends StatelessWidget {
  const _MyFishEmptyCard({required this.onAdd});

  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      semanticLabel:
          'No fish in your inventory. '
          'Build your tank profile one species at a time.',
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: OceanSpacing.xl,
          vertical: 40,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: OceanColors.pineTeal.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                LucideIcons.fish,
                size: 22,
                color: OceanColors.pineTeal,
              ),
            ),
            const SizedBox(height: OceanSpacing.sm),
            const Text(
              'No fish in your inventory',
              textAlign: TextAlign.center,
              style: OceanTypography.title,
            ),
            const SizedBox(height: OceanSpacing.xxs),
            const Text(
              'Build your tank profile one species at a time.',
              textAlign: TextAlign.center,
              style: OceanTypography.caption,
            ),
            const SizedBox(height: OceanSpacing.md),
            _AddFirstFishButton(label: 'Add your first fish', onTap: onAdd),
          ],
        ),
      ),
    );
  }
}

class _AddFirstFishButton extends StatelessWidget {
  const _AddFirstFishButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [OceanColors.verdigris, OceanColors.pineTeal],
          ),
          boxShadow: [
            BoxShadow(
              color: OceanColors.pineTeal.withValues(alpha: 0.20),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(OceanRadii.pill),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 44),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: OceanSpacing.lg,
                  vertical: 10,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      LucideIcons.plus,
                      size: 18,
                      color: OceanColors.white,
                    ),
                    const SizedBox(width: OceanSpacing.xs),
                    Flexible(
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: OceanTypography.strong.copyWith(
                          color: OceanColors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
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
    return Semantics(
      button: true,
      expanded: expanded,
      label:
          'Fish Overview. ${fish.length} species. $detected of $total fish visible.',
      child: GlassCard(
        onTap: onToggle,
        padding: const EdgeInsets.all(OceanSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SpeciesDistribution(fish: fish),
            const SizedBox(height: OceanSpacing.xs),
            Padding(
              padding: const EdgeInsets.all(OceanSpacing.sm),
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
                  const SizedBox(width: OceanSpacing.sm),
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
                  _DetectionVisibilityRing(detected: detected, expected: total),
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
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
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
                          const SizedBox(height: OceanSpacing.sm),
                          _DetailChip(
                            icon: LucideIcons.thermometer,
                            label: 'Ideal Temp',
                            value: stats.temperatureRange,
                          ),
                          const SizedBox(height: OceanSpacing.sm),
                          _DetailChip(
                            icon: LucideIcons.droplets,
                            label: 'Ideal pH',
                            value: stats.phRange,
                          ),
                          const SizedBox(height: OceanSpacing.md),
                          Text(
                            'Tank Compatibility'.toUpperCase(),
                            style: OceanTypography.caption.copyWith(
                              color: OceanColors.inkMuted,
                            ),
                          ),
                          const SizedBox(height: OceanSpacing.xs),
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
    if (fish.isEmpty) return _SpeciesDonut(fish: fish, size: 200);
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
              fish.length > 4 ? 176.0 : 216.0,
            );
        return SizedBox(
          height: donutSize,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: _SpeciesLabels(entries: left, alignRight: true)),
              _SpeciesDonut(fish: ordered, size: donutSize),
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: OceanSpacing.xs),
      child: Column(
        children: [
          const Spacer(),
          for (var index = 0; index < entries.length; index++) ...[
            Row(
              mainAxisAlignment: alignRight
                  ? MainAxisAlignment.end
                  : MainAxisAlignment.start,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _speciesColor(entries[index].value.speciesId),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: OceanSpacing.xxs),
                Flexible(
                  child: Text(
                    entries[index].value.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: alignRight ? TextAlign.right : TextAlign.left,
                    style: OceanTypography.caption.copyWith(
                      fontSize: 11,
                      height: 1.2,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: OceanSpacing.xxs),
                Text(
                  '(${entries[index].value.count})',
                  style: OceanTypography.caption.copyWith(
                    fontSize: 11,
                    height: 1.2,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            if (index != entries.length - 1) ...[
              const SizedBox(height: OceanSpacing.xs),
              const Spacer(),
            ],
          ],
          const Spacer(),
        ],
      ),
    );
  }
}

class _SpeciesDonut extends StatelessWidget {
  const _SpeciesDonut({required this.fish, required this.size});

  final List<FishEntry> fish;
  final double size;

  @override
  Widget build(BuildContext context) {
    final total = fish.fold<int>(0, (sum, entry) => sum + entry.count);
    if (total <= 0) {
      return SizedBox(
        width: double.infinity,
        height: 200,
        child: Center(
          child: Text(
            'No fish data available',
            style: OceanTypography.bodyMuted,
          ),
        ),
      );
    }

    return Semantics(
      image: true,
      label:
          'Species distribution for $total fish. '
          '${fish.map((entry) => '${entry.name}: ${entry.count}').join(', ')}',
      child: SizedBox.square(
        dimension: size,
        child: Stack(
          alignment: Alignment.center,
          children: [
            CustomPaint(
              size: Size.square(size),
              painter: _SpeciesDonutPainter(
                values: fish.map((entry) => entry.count).toList(),
                colors: fish
                    .map((entry) => _speciesColor(entry.speciesId))
                    .toList(),
              ),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$total',
                  style: const TextStyle(
                    fontFamily: OceanTypography.family,
                    fontSize: 30,
                    height: 1,
                    fontWeight: FontWeight.w800,
                    color: OceanColors.ink,
                  ),
                ),
                Text(
                  'Total Fish',
                  style: OceanTypography.caption.copyWith(
                    fontSize: 11,
                    height: 1.25,
                    fontWeight: FontWeight.w400,
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

class _SpeciesDonutPainter extends CustomPainter {
  const _SpeciesDonutPainter({required this.values, required this.colors});

  final List<int> values;
  final List<Color> colors;

  @override
  void paint(Canvas canvas, Size size) {
    final total = values.fold<int>(0, (sum, value) => sum + value);
    if (total <= 0) return;
    final radius = size.shortestSide * 0.40;
    final strokeWidth = size.shortestSide * 0.096;
    final separatorLength = values.length > 1
        ? size.shortestSide * (3 / 200)
        : 0.0;
    final separatorAngle = separatorLength / radius;
    final rect = Rect.fromCircle(
      center: size.center(Offset.zero),
      radius: radius,
    );
    var start = -math.pi / 2;
    for (var index = 0; index < values.length; index++) {
      final sweep = math.pi * 2 * values[index] / total;
      canvas.drawArc(
        rect,
        start,
        math.max(0, sweep - separatorAngle),
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = strokeWidth
          ..strokeCap = StrokeCap.butt
          ..color = colors[index],
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant _SpeciesDonutPainter oldDelegate) => true;
}

class _DetectionVisibilityRing extends StatelessWidget {
  const _DetectionVisibilityRing({
    required this.detected,
    required this.expected,
    this.showLabel = true,
  });

  final int detected;
  final int expected;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final percent = expected > 0 ? (detected / expected * 100).round() : 0;
    final color = _visibilityColor(percent / 100);
    return Semantics(
      label: '$detected of $expected fish detected ($percent percent)',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox.square(
            dimension: 44,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: const Size.square(44),
                  painter: _VisibilityRingPainter(
                    progress: math.min(1.0, math.max(0.0, percent / 100)),
                    color: color,
                  ),
                ),
                Icon(LucideIcons.eye, size: 44 * 0.36, color: color),
              ],
            ),
          ),
          if (showLabel) ...[
            const SizedBox(width: 10),
            ConstrainedBox(
              constraints: BoxConstraints(
                minWidth: MediaQuery.sizeOf(context).width <= 600 ? 0 : 36,
              ),
              child: Text(
                '$percent%',
                style: OceanTypography.strong.copyWith(color: color),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _VisibilityRingPainter extends CustomPainter {
  const _VisibilityRingPainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    const strokeWidth = 5.0;
    final center = size.center(Offset.zero);
    final radius = (size.shortestSide - strokeWidth) / 2;
    final trackPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..color = OceanColors.azureMist;
    canvas.drawCircle(center, radius, trackPaint);
    final progressPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..color = color;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      math.pi * 2 * progress,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _VisibilityRingPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}

class _SpeciesImage extends StatelessWidget {
  const _SpeciesImage({
    required this.assetPath,
    required this.name,
    required this.speciesId,
    required this.size,
    required this.radius,
    this.fallbackScale = 0.30,
  });

  final String assetPath;
  final String name;
  final String speciesId;
  final double size;
  final double radius;
  final double fallbackScale;

  @override
  Widget build(BuildContext context) {
    final initials = name
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .map((word) => word[0])
        .join();
    return Semantics(
      image: true,
      label: '$name species artwork',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: SizedBox.square(
          dimension: size,
          child: Image.asset(
            assetPath,
            fit: BoxFit.contain,
            errorBuilder: (_, _, _) => DecoratedBox(
              decoration: BoxDecoration(
                color: _speciesColor(speciesId),
                border: Border.all(
                  color: OceanColors.white.withValues(alpha: 0.20),
                ),
              ),
              child: Center(
                child: Text(
                  initials,
                  style: TextStyle(
                    fontFamily: OceanTypography.family,
                    fontSize: math.max(9.0, size * fallbackScale),
                    fontWeight: FontWeight.w700,
                    color: OceanColors.white,
                    shadows: const [
                      Shadow(
                        color: Color(0x4D051E32),
                        offset: Offset(0, 1),
                        blurRadius: 2,
                      ),
                    ],
                  ),
                ),
              ),
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
    return TapRegion(
      onTapOutside: expanded ? (_) => onToggle() : null,
      child: AnimatedSize(
        alignment: Alignment.topCenter,
        duration: OceanMotion.responsive(
          context,
          const Duration(milliseconds: 350),
        ),
        curve: OceanMotion.smoothCurve,
        child: GlassCard(
          onTap: onToggle,
          padding: const EdgeInsets.symmetric(
            horizontal: OceanSpacing.md,
            vertical: OceanSpacing.sm,
          ),
          semanticLabel:
              '${fish.name}. ${fish.detected} of ${fish.count} visible.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: OceanSpacing.sm,
                  vertical: 10,
                ),
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
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(minHeight: 44),
                              child: Row(
                                children: [
                                  _SpeciesImage(
                                    assetPath: fish.assetPath,
                                    name: fish.name,
                                    speciesId: fish.speciesId,
                                    size: 40,
                                    radius: 8,
                                  ),
                                  const SizedBox(width: OceanSpacing.sm),
                                  Expanded(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
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
                                          Padding(
                                            padding: const EdgeInsets.only(
                                              bottom: OceanSpacing.xxs,
                                            ),
                                            child: Text(
                                              fish.scientificName,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: OceanTypography.caption
                                                  .copyWith(
                                                    fontStyle: FontStyle.italic,
                                                  ),
                                            ),
                                          ),
                                        ],
                                        if (!expanded) ...[
                                          const SizedBox(height: 2),
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
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _DetectionVisibilityRing(
                          detected: fish.detected,
                          expected: fish.count,
                          showLabel: !expanded,
                        ),
                        if (expanded) ...[
                          const SizedBox(width: OceanSpacing.xxs),
                          _CountStepper(
                            count: fish.count,
                            onDecrement: onDecrement,
                            onIncrement: onIncrement,
                          ),
                          const SizedBox(width: OceanSpacing.xxs),
                          _BareIconButton(
                            icon: LucideIcons.trash2,
                            iconSize: 16,
                            tooltip: 'Delete ${fish.name}',
                            onPressed: onDelete,
                            color: OceanColors.inkMuted,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              if (expanded)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _ResponsiveDetailGrid(
                        children: [
                          _DetailChip(
                            icon: LucideIcons.ruler,
                            label: 'Size',
                            value: facts == null
                                ? '—'
                                : '${_number(facts.sizeCm)} cm',
                          ),
                          _DetailChip(
                            icon: LucideIcons.maximize2,
                            label: 'Tank Min',
                            value: facts == null
                                ? '—'
                                : '${facts.tankLitres} L',
                          ),
                          _DetailChip(
                            icon: LucideIcons.thermometer,
                            label: 'Temp',
                            value: facts == null
                                ? '—'
                                : '${_number(facts.tempMin)}–'
                                      '${_number(facts.tempMax)} °C',
                          ),
                          _DetailChip(
                            icon: LucideIcons.droplets,
                            label: 'pH',
                            value: facts == null
                                ? '—'
                                : '${_number(facts.phMin)}–'
                                      '${_number(facts.phMax)}',
                          ),
                          _DetailChip(
                            icon: LucideIcons.circleCheck,
                            label: 'Availability',
                            value: facts?.availability ?? '—',
                          ),
                          _DetailChip(
                            icon: LucideIcons.triangleAlert,
                            label: 'Aggression',
                            value: facts?.aggressionLabel ?? '—',
                          ),
                          _DetailChip(
                            icon: LucideIcons.fish,
                            label: 'Behavior',
                            value: facts?.behaviorLabel ?? '—',
                          ),
                          _DetailChip(
                            icon: LucideIcons.fish,
                            label: 'Swim Zone',
                            value: facts?.swimZone ?? '—',
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      if (compatibilities.isNotEmpty) ...[
                        const SizedBox(height: OceanSpacing.md),
                        Text(
                          'Tank Compatibility'.toUpperCase(),
                          style: OceanTypography.caption.copyWith(
                            color: OceanColors.inkMuted,
                          ),
                        ),
                        const SizedBox(height: OceanSpacing.xs),
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
                            Divider(height: 1, color: OceanColors.azureMist2),
                        ],
                      ],
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResponsiveDetailGrid extends StatelessWidget {
  const _ResponsiveDetailGrid({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final twoColumns = MediaQuery.sizeOf(context).width >= 768;
    if (!twoColumns) {
      return Column(
        children: [
          for (var index = 0; index < children.length; index++) ...[
            children[index],
            if (index != children.length - 1)
              const SizedBox(height: OceanSpacing.sm),
          ],
        ],
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = (constraints.maxWidth - OceanSpacing.sm) / 2;
        return Wrap(
          spacing: OceanSpacing.sm,
          runSpacing: OceanSpacing.sm,
          children: [
            for (final child in children) SizedBox(width: width, child: child),
          ],
        );
      },
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
        _BareIconButton(
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
        _BareIconButton(
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

class _BareIconButton extends StatelessWidget {
  const _BareIconButton({
    required this.icon,
    required this.iconSize,
    required this.tooltip,
    required this.onPressed,
    required this.color,
  });

  final IconData icon;
  final double iconSize;
  final String tooltip;
  final VoidCallback onPressed;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: tooltip,
      child: Tooltip(
        message: tooltip,
        child: InkResponse(
          onTap: onPressed,
          radius: 20,
          child: SizedBox.square(
            dimension: 36,
            child: Icon(icon, size: iconSize, color: color),
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
        padding: const EdgeInsets.symmetric(
          horizontal: OceanSpacing.sm,
          vertical: 6,
        ),
        decoration: BoxDecoration(
          color: OceanColors.azureMist,
          borderRadius: BorderRadius.circular(OceanRadii.inline),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: OceanColors.ink),
            const SizedBox(width: OceanSpacing.xs),
            Expanded(child: Text(label, style: OceanTypography.caption)),
            const SizedBox(width: OceanSpacing.xs),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: OceanTypography.caption,
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
  final _speciesScrollController = ScrollController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _searchFocusNode.addListener(_handleFocusChanged);
  }

  void _handleFocusChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _searchFocusNode
      ..removeListener(_handleFocusChanged)
      ..dispose();
    _speciesScrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final existingIds = widget.controller.fish
        .map((entry) => entry.speciesId)
        .toSet();
    final normalized = _query.trim().toLowerCase();
    final queryTokens = normalized
        .replaceAll(RegExp(r'''[(){}\[\]"',.;:!?]'''), '')
        .split(RegExp(r'\s+'))
        .where((token) => token.length > 1)
        .toList(growable: false);
    final species = widget.controller.availableSpecies
        .where((option) {
          if (existingIds.contains(option.id)) return false;
          if (queryTokens.isEmpty) return true;
          final searchable = [
            option.name.toLowerCase(),
            option.scientificName.toLowerCase(),
            option.altName.toLowerCase(),
          ];
          return queryTokens.every(
            (token) => searchable.any((field) => field.contains(token)),
          );
        })
        .toList(growable: false);
    final visibleSpecies = species.take(60).toList(growable: false);
    final hasMore = species.length > visibleSpecies.length;
    final showCustomOption =
        normalized.isNotEmpty &&
        !widget.controller.availableSpecies.any(
          (option) =>
              option.id.toLowerCase() == normalized ||
              option.name.toLowerCase() == normalized,
        );
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;
    final safeBottom = MediaQuery.paddingOf(context).bottom;

    return Semantics(
      container: true,
      scopesRoute: true,
      namesRoute: true,
      explicitChildNodes: true,
      label: 'Add fish',
      child: AnimatedPadding(
        duration: OceanMotion.responsive(context, OceanMotion.sheet),
        padding: EdgeInsets.only(bottom: keyboardInset),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: GlassCard(
            overlay: true,
            radius: 0,
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 49,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: _searchFocusNode.hasFocus
                                ? [
                                    BoxShadow(
                                      color: OceanColors.pineTeal.withValues(
                                        alpha: 0.10,
                                      ),
                                      spreadRadius: 3,
                                    ),
                                  ]
                                : null,
                          ),
                          child: TextField(
                            controller: _searchController,
                            focusNode: _searchFocusNode,
                            autofocus: true,
                            onChanged: (value) =>
                                setState(() => _query = value),
                            textInputAction: TextInputAction.search,
                            style: OceanTypography.body,
                            decoration: InputDecoration(
                              isDense: true,
                              filled: true,
                              fillColor: OceanColors.white.withValues(
                                alpha: 0.55,
                              ),
                              hintText: 'Search common or scientific name',
                              hintStyle: OceanTypography.bodyMuted,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 12,
                              ),
                              prefixIconConstraints: const BoxConstraints(
                                minWidth: 36,
                              ),
                              prefixIcon: const Icon(
                                LucideIcons.search,
                                size: 16,
                                color: OceanColors.inkMuted,
                              ),
                              border: _searchBorder(OceanColors.azureMist2),
                              enabledBorder: _searchBorder(
                                OceanColors.azureMist2,
                              ),
                              focusedBorder: _searchBorder(
                                OceanColors.pineTeal.withValues(alpha: 0.40),
                              ),
                            ),
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
                      size: 44,
                    ),
                  ],
                ),
                const SizedBox(height: OceanSpacing.xl),
                Expanded(
                  child: visibleSpecies.isEmpty && !showCustomOption
                      ? Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: OceanSpacing.md,
                            vertical: OceanSpacing.xl,
                          ),
                          child: Text(
                            'No species found',
                            textAlign: TextAlign.center,
                            style: OceanTypography.bodyMuted,
                          ),
                        )
                      : ScrollbarTheme(
                          data: const ScrollbarThemeData(
                            thumbColor: WidgetStatePropertyAll(
                              OceanColors.scrollbarThumb,
                            ),
                            crossAxisMargin: 2,
                            mainAxisMargin: 18,
                          ),
                          child: Scrollbar(
                            controller: _speciesScrollController,
                            thumbVisibility: true,
                            thickness: 8,
                            radius: const Radius.circular(4),
                            child: ListView.builder(
                              controller: _speciesScrollController,
                              keyboardDismissBehavior:
                                  ScrollViewKeyboardDismissBehavior.onDrag,
                              padding: EdgeInsets.only(bottom: 76 + safeBottom),
                              itemCount:
                                  visibleSpecies.length +
                                  (hasMore ? 1 : 0) +
                                  (showCustomOption ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index >= visibleSpecies.length) {
                                  final isMore =
                                      hasMore && index == visibleSpecies.length;
                                  if (isMore) {
                                    return Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                        vertical: 12,
                                      ),
                                      child: Text(
                                        'Keep typing to narrow ${species.length} matches.',
                                        textAlign: TextAlign.center,
                                        style: OceanTypography.caption,
                                      ),
                                    );
                                  }
                                  final customName = _query.trim();
                                  return _CustomSpeciesRow(
                                    name: customName,
                                    onTap: () {
                                      widget.controller.addSpecies(
                                        SpeciesOption(
                                          id: _customSpeciesId(customName),
                                          name: customName,
                                          scientificName: '',
                                          assetPath: '',
                                          compatibility:
                                              'Compatibility data unavailable',
                                          careLevel: 'Unknown',
                                        ),
                                      );
                                      widget.onClose();
                                    },
                                  );
                                }
                                final option = visibleSpecies[index];
                                return Semantics(
                                  button: true,
                                  label:
                                      '${option.name}, ${option.scientificName}. Add species.',
                                  child: Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      onTap: () {
                                        widget.controller.addSpecies(option);
                                        widget.onClose();
                                      },
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: OceanSpacing.sm,
                                          vertical: OceanSpacing.xs,
                                        ),
                                        child: Row(
                                          children: [
                                            _SpeciesImage(
                                              assetPath: option.assetPath,
                                              name: option.name,
                                              speciesId: option.id,
                                              size: 38,
                                              radius: 10,
                                              fallbackScale: 0.34,
                                            ),
                                            const SizedBox(
                                              width: OceanSpacing.sm,
                                            ),
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
                                                    style:
                                                        OceanTypography.strong,
                                                  ),
                                                  if (option
                                                      .scientificName
                                                      .isNotEmpty)
                                                    Text(
                                                      option.scientificName,
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                      style: OceanTypography
                                                          .caption
                                                          .copyWith(
                                                            fontStyle: FontStyle
                                                                .italic,
                                                          ),
                                                    ),
                                                ],
                                              ),
                                            ),
                                            if (option.creatureType !=
                                                'fish') ...[
                                              const SizedBox(width: 8),
                                              _CreatureBadge(
                                                type: option.creatureType,
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  OutlineInputBorder _searchBorder(Color color) => OutlineInputBorder(
    borderRadius: BorderRadius.circular(16),
    borderSide: BorderSide(color: color),
  );
}

class _CreatureBadge extends StatelessWidget {
  const _CreatureBadge({required this.type});

  final String type;

  @override
  Widget build(BuildContext context) {
    final background = switch (type) {
      'shrimp' => const Color(0xFFFF9800),
      'snail' => const Color(0xFF8BC34A),
      'crab' => const Color(0xFFE91E63),
      _ => OceanColors.azureMist2,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(2),
      ),
      child: Text(
        type,
        style: OceanTypography.caption.copyWith(
          color: OceanColors.white.withValues(alpha: 0.70),
          letterSpacing: -0.14,
        ),
      ),
    );
  }
}

class _CustomSpeciesRow extends StatelessWidget {
  const _CustomSpeciesRow({required this.name, required this.onTap});

  final String name;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Add custom species $name',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: OceanColors.pineTeal.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    '+',
                    style: TextStyle(
                      fontFamily: OceanTypography.family,
                      fontSize: 16,
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.16,
                      color: OceanColors.pineTeal,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Add custom species “$name”',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: OceanTypography.body.copyWith(
                      color: OceanColors.pineTeal,
                    ),
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
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
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

Future<T?> _showMyFishDialog<T>({
  required BuildContext context,
  required Widget child,
}) {
  return showGeneralDialog<T>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Dismiss dialog',
    barrierColor: Colors.transparent,
    transitionDuration: OceanMotion.responsive(context, OceanMotion.sheet),
    pageBuilder: (dialogContext, _, _) => Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => Navigator.of(dialogContext).pop(),
            child: BackdropFilter(
              filter: ui.ImageFilter.blur(sigmaX: 4, sigmaY: 4),
              child: ColoredBox(
                color: OceanColors.prussianBlue.withValues(alpha: 0.50),
              ),
            ),
          ),
        ),
        Center(
          child: Padding(
            padding: const EdgeInsets.all(OceanSpacing.md),
            child: Material(color: Colors.transparent, child: child),
          ),
        ),
      ],
    ),
    transitionBuilder: (context, animation, _, child) => FadeTransition(
      opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
      child: child,
    ),
  );
}

String _number(double value) => value == value.roundToDouble()
    ? value.round().toString()
    : value.toStringAsFixed(value * 10 == (value * 10).round() ? 1 : 2);

Color _visibilityColor(double progress) {
  if (progress >= 0.8) return const Color(0xFF16A34A);
  if (progress >= 0.5) return const Color(0xFFD97706);
  return const Color(0xFFDC2626);
}

Color _compatibilityColor(int score) {
  if (score >= 80) return const Color(0xFF10B981);
  if (score >= 60) return const Color(0xFF3B82F6);
  if (score >= 40) return const Color(0xFFF59E0B);
  if (score >= 20) return const Color(0xFFEF4444);
  return const Color(0xFFDC2626);
}

Color _speciesColor(String speciesId) => switch (speciesId) {
  'cardinal_tetra' => const Color(0xFF4169E1),
  'guppy' => const Color(0xFFFF69B4),
  'corydoras' => const Color(0xFFDAA520),
  'cherry_barb' => const Color(0xFFDC143C),
  'neon_tetra' => const Color(0xFF00CED1),
  'dwarf_gourami' => const Color(0xFF20B2AA),
  'angelfish' => const Color(0xFFE8D5B7),
  'betta' => const Color(0xFFFFB6C1),
  _ => Color(SpeciesCatalog.colorValueFor(speciesId)),
};

String _customSpeciesId(String name) {
  final slug = name
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
      .replaceAll(RegExp(r'^_+|_+$'), '');
  return 'custom_${slug.isEmpty ? 'species' : slug}';
}
