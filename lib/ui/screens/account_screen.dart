import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/aquarium_hero.dart';
import '../widgets/glass.dart';
import '../widgets/screen_primitives.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _renaming = false;
  bool _confirmingDisconnect = false;
  late final TextEditingController _tankNameController;

  OceanEyesController get controller => widget.controller;

  @override
  void initState() {
    super.initState();
    _tankNameController = TextEditingController(text: controller.tankName);
  }

  @override
  void dispose() {
    _tankNameController.dispose();
    super.dispose();
  }

  void _saveTankName() {
    final value = _tankNameController.text.trim();
    if (value.isEmpty) {
      _tankNameController.text = controller.tankName;
    } else {
      controller.renameTank(value);
    }
    setState(() => _renaming = false);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (controller.tankConnected && !_isStreaming)
          const SizedBox(height: 16),
        if (!controller.tankConnected) ...[
          const _UnlinkedTankNotice(),
          const SizedBox(height: 16),
        ],
        if (_isStreaming) ...[
          _AIAnalysisCard(controller: controller),
          const SizedBox(height: 16),
        ],
        _buildTankManagement(context),
        const SizedBox(height: 16),
        _buildAlertsAndThresholds(context),
      ],
    );
  }

  bool get _isStreaming => switch (controller.cameraStage) {
    CameraStage.active ||
    CameraStage.aiProcessing ||
    CameraStage.measuringTurbidity => true,
    _ => false,
  };

  Widget _buildTankManagement(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
      child: Column(
        children: [
          const CardHeader(
            title: 'Tank Management',
            icon: LucideIcons.shieldAlert,
            divider: true,
          ),
          if (!controller.tankConnected)
            GlassPanel(
              child: _SettingsPanelRow(
                icon: LucideIcons.fish,
                title: 'No tank connected',
                subtitle: 'Reconnect the demo tank to resume monitoring.',
                highlighted: true,
                action: _SmallGlassButton(
                  label: 'Connect',
                  onPressed: controller.connectDemoTank,
                ),
              ),
            )
          else ...[
            GlassPanel(
              child: _renaming
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Tank name', style: OceanTypography.caption),
                              const SizedBox(height: 6),
                              TextField(
                                controller: _tankNameController,
                                autofocus: true,
                                textInputAction: TextInputAction.done,
                                onSubmitted: (_) => _saveTankName(),
                                decoration: const InputDecoration(
                                  hintText: 'Aquarium name',
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        _SmallGlassButton(
                          label: 'Save',
                          icon: LucideIcons.save,
                          onPressed: _saveTankName,
                        ),
                      ],
                    )
                  : _SettingsPanelRow(
                      icon: LucideIcons.fish,
                      title: controller.tankName,
                      subtitle: 'Ref Code: tank-demo',
                      action: _SmallGlassButton(
                        label: 'Rename',
                        icon: LucideIcons.pencil,
                        style: GlassButtonStyle.outline,
                        onPressed: () => setState(() {
                          _tankNameController.text = controller.tankName;
                          _renaming = true;
                        }),
                      ),
                    ),
            ),
            const SizedBox(height: 12),
            const GlassPanel(
              padding: EdgeInsets.fromLTRB(12, 12, 12, 7),
              child: _SettingsPanelRow(
                icon: LucideIcons.monitor,
                title: 'IoT Scanner Console',
                subtitle: 'Pair or review monitor hardware',
                highlighted: true,
                showChevron: true,
              ),
            ),
            const SizedBox(height: 12),
            _AccountDisclosure(
              title: 'Stream Image Adjustments',
              subtitle:
                  'Contrast ${(controller.contrast * 100).round()}%, brightness ${(controller.brightness * 100).round()}%, saturation ${(controller.saturation * 100).round()}%',
              icon: LucideIcons.slidersHorizontal,
              expanded: controller.streamSectionOpen,
              onChanged: (value) => controller.setDisclosure('stream', value),
              child: Column(
                children: [
                  _settingSlider(
                    label: 'Contrast',
                    setting: 'contrast',
                    value: controller.contrast * 100,
                    min: 50,
                    max: 150,
                    divisions: 20,
                    divisor: 100,
                    suffix: '%',
                  ),
                  const SizedBox(height: 16),
                  _settingSlider(
                    label: 'Brightness',
                    setting: 'brightness',
                    value: controller.brightness * 100,
                    min: 70,
                    max: 130,
                    divisions: 12,
                    divisor: 100,
                    suffix: '%',
                  ),
                  const SizedBox(height: 16),
                  _settingSlider(
                    label: 'Saturation',
                    setting: 'saturation',
                    value: controller.saturation * 100,
                    min: 50,
                    max: 150,
                    divisions: 20,
                    divisor: 100,
                    suffix: '%',
                  ),
                  const SizedBox(height: 16),
                  OceanSlider(
                    label: 'Temperature (Cool / Warm)',
                    value: controller.temperature,
                    min: -80,
                    max: 80,
                    divisions: 32,
                    valueLabel: _temperatureLabel(controller.temperature),
                    onChanged: (value) =>
                        controller.previewSetting('temperature', value),
                    onChangeEnd: (value) =>
                        controller.commitSetting('temperature', value),
                  ),
                  const SizedBox(height: 16),
                  OceanSlider(
                    label: 'Tint (Green / Magenta)',
                    value: controller.tint,
                    min: -80,
                    max: 80,
                    divisions: 32,
                    valueLabel: _tintLabel(controller.tint),
                    onChanged: (value) =>
                        controller.previewSetting('tint', value),
                    onChangeEnd: (value) =>
                        controller.commitSetting('tint', value),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (_confirmingDisconnect)
              _buildInlineDisconnectConfirmation()
            else
              GlassPanel(
                onTap: () => setState(() => _confirmingDisconnect = true),
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 7),
                child: const _SettingsPanelRow(
                  icon: LucideIcons.x,
                  title: 'Disconnect from Tank',
                  subtitle: 'Remove this tank from the active dashboard',
                  destructive: true,
                  showChevron: true,
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _settingSlider({
    required String label,
    required String setting,
    required double value,
    required double min,
    required double max,
    required int divisions,
    required double divisor,
    required String suffix,
  }) {
    return OceanSlider(
      label: label,
      value: value,
      min: min,
      max: max,
      divisions: divisions,
      valueLabel: '${value.round()}$suffix',
      onChanged: (next) => controller.previewSetting(setting, next / divisor),
      onChangeEnd: (next) => controller.commitSetting(setting, next / divisor),
    );
  }

  Widget _buildAlertsAndThresholds(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
      child: Column(
        children: [
          const CardHeader(
            title: 'Alerts & Thresholds',
            icon: LucideIcons.shieldCheck,
            divider: true,
          ),
          _AccountDisclosure(
            title: 'Alert sensitivity',
            subtitle:
                '${_formatThreshold(controller.clarityThreshold)} FNU turbidity max, ${controller.visibleFishThreshold.clamp(20, 80).round()}% fish visibility change',
            icon: LucideIcons.bell,
            expanded: controller.thresholdSectionOpen,
            onChanged: (value) => controller.setDisclosure('threshold', value),
            child: Column(
              children: [
                OceanSlider(
                  label: 'Maximum FNU Threshold',
                  value: controller.clarityThreshold,
                  min: 1,
                  max: 10,
                  divisions: 18,
                  valueLabel:
                      '${_formatThreshold(controller.clarityThreshold)} FNU',
                  onChanged: (value) =>
                      controller.previewSetting('clarityThreshold', value),
                  onChangeEnd: (value) =>
                      controller.commitSetting('clarityThreshold', value),
                ),
                const SizedBox(height: 16),
                OceanSlider(
                  label: 'Discrepancy Alarm Trigger',
                  value: controller.visibleFishThreshold.clamp(20, 80),
                  min: 20,
                  max: 80,
                  divisions: 6,
                  valueLabel:
                      '${controller.visibleFishThreshold.clamp(20, 80).round()}% visibility',
                  onChanged: (value) =>
                      controller.previewSetting('visibleFishThreshold', value),
                  onChangeEnd: (value) =>
                      controller.commitSetting('visibleFishThreshold', value),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          GlassPanel(
            onTap: controller.openAlerts,
            child: const _SettingsPanelRow(
              icon: LucideIcons.bell,
              title: 'Safety Alert Logs',
              subtitle: 'Warnings and event history',
              showChevron: true,
            ),
          ),
          const SizedBox(height: 12),
          _AccountDisclosure(
            title: 'AI Preferences',
            subtitle:
                '${controller.autoConnect ? 'Auto-start enabled' : 'Auto-start disabled'}, ${(controller.pollingIntervalMs / 1000).round()}s polling',
            icon: LucideIcons.brain,
            expanded: controller.aiPreferencesOpen,
            onChanged: (value) => controller.setDisclosure('ai', value),
            child: Column(
              children: [
                _AutoStartRow(
                  value: controller.autoConnect,
                  onChanged: controller.setAutoConnect,
                ),
                const SizedBox(height: 16),
                OceanSlider(
                  label: 'AI Polling Interval',
                  value: controller.pollingIntervalMs,
                  min: 2000,
                  max: 60000,
                  divisions: 58,
                  valueLabel:
                      '${(controller.pollingIntervalMs / 1000).round()}s',
                  onChanged: (value) =>
                      controller.previewSetting('pollingIntervalMs', value),
                  onChangeEnd: (value) =>
                      controller.commitSetting('pollingIntervalMs', value),
                ),
                const SizedBox(height: 16),
                _confidenceSlider(
                  label: 'Detection Confidence Threshold',
                  setting: 'detectionConfidenceThreshold',
                  value: controller.detectionConfidenceThreshold,
                  minPercent: 10,
                  maxPercent: 90,
                ),
                const SizedBox(height: 16),
                _confidenceSlider(
                  label: 'Species Confidence Threshold',
                  setting: 'speciesConfidenceThreshold',
                  value: controller.speciesConfidenceThreshold,
                  minPercent: 10,
                  maxPercent: 90,
                ),
                const SizedBox(height: 16),
                _confidenceSlider(
                  label: 'Diagnosis Minimum Confidence',
                  setting: 'diagnosisMinConfidence',
                  value: controller.diagnosisMinConfidence,
                  minPercent: 30,
                  maxPercent: 90,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInlineDisconnectConfirmation() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      decoration: BoxDecoration(
        color: OceanColors.critical.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: OceanColors.critical.withValues(alpha: 0.20)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'This will remove "${controller.tankName}" from your active monitoring dashboard. You can reconnect it later using the reference code: tank-demo.',
            style: OceanTypography.caption,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _SmallGlassButton(
                label: 'Cancel',
                style: GlassButtonStyle.outline,
                onPressed: () => setState(() => _confirmingDisconnect = false),
              ),
              const SizedBox(width: 10),
              _SmallGlassButton(
                label: 'Yes, Disconnect',
                style: GlassButtonStyle.destructive,
                onPressed: () {
                  setState(() => _confirmingDisconnect = false);
                  controller.disconnectTank();
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatThreshold(double value) => value == value.roundToDouble()
      ? value.round().toString()
      : value.toStringAsFixed(1);

  String _temperatureLabel(double value) {
    final rounded = value.round();
    if (rounded == 0) return 'Neutral';
    return rounded > 0 ? 'Warm (+$rounded)' : 'Cool ($rounded)';
  }

  String _tintLabel(double value) {
    final rounded = value.round();
    if (rounded == 0) return 'Neutral';
    return rounded > 0 ? 'Magenta (+$rounded)' : 'Green ($rounded)';
  }

  Widget _confidenceSlider({
    required String label,
    required String setting,
    required double value,
    required int minPercent,
    required int maxPercent,
  }) {
    final percent = value * 100;
    return OceanSlider(
      label: label,
      value: percent,
      min: minPercent.toDouble(),
      max: maxPercent.toDouble(),
      divisions: (maxPercent - minPercent) ~/ 5,
      valueLabel: '${percent.round()}%',
      onChanged: (next) => controller.previewSetting(setting, next / 100),
      onChangeEnd: (next) => controller.commitSetting(setting, next / 100),
    );
  }
}

class _UnlinkedTankNotice extends StatelessWidget {
  const _UnlinkedTankNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: OceanColors.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: OceanColors.warning),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '!',
            style: OceanTypography.strong.copyWith(color: OceanColors.warning),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'No aquarium linked. Link a tank from the Dashboard to save camera feeds and enable AI detection.',
              style: OceanTypography.body.copyWith(color: OceanColors.warning),
            ),
          ),
        ],
      ),
    );
  }
}

class _AccountDisclosure extends StatelessWidget {
  const _AccountDisclosure({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.expanded,
    required this.onChanged,
    required this.child,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool expanded;
  final ValueChanged<bool> onChanged;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          Semantics(
            button: true,
            expanded: expanded,
            child: InkWell(
              onTap: () => onChanged(!expanded),
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 7),
                child: Row(
                  children: [
                    SizedBox.square(
                      dimension: 36,
                      child: Center(
                        child: Icon(
                          icon,
                          size: 17,
                          color: OceanColors.slateGrey,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: OceanTypography.strong),
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: OceanTypography.caption,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    AnimatedRotation(
                      turns: expanded ? 0.25 : 0,
                      duration: OceanMotion.responsive(
                        context,
                        const Duration(milliseconds: 300),
                      ),
                      curve: Curves.easeInOut,
                      child: const Icon(
                        LucideIcons.chevronRight,
                        size: 18,
                        color: OceanColors.slateGrey,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          ClipRect(
            child: AnimatedSize(
              duration: OceanMotion.responsive(
                context,
                const Duration(milliseconds: 300),
              ),
              curve: Curves.easeInOut,
              alignment: Alignment.topCenter,
              child: expanded
                  ? Padding(
                      padding: const EdgeInsets.fromLTRB(12, 16, 12, 8),
                      child: child,
                    )
                  : const SizedBox(width: double.infinity),
            ),
          ),
        ],
      ),
    );
  }
}

class _AutoStartRow extends StatelessWidget {
  const _AutoStartRow({required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            'Auto-start AI when stream connects',
            style: OceanTypography.bodyMuted,
          ),
        ),
        const SizedBox(width: 16),
        _AccountToggle(value: value, onChanged: onChanged),
      ],
    );
  }
}

class _AccountToggle extends StatelessWidget {
  const _AccountToggle({required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      toggled: value,
      label: 'Auto-start AI when stream connects',
      child: GestureDetector(
        onTap: () => onChanged(!value),
        child: AnimatedContainer(
          duration: OceanMotion.responsive(context, OceanMotion.smooth),
          width: 44,
          height: 24,
          decoration: BoxDecoration(
            color: value
                ? OceanColors.pineTeal
                : OceanColors.slateGrey.withValues(alpha: 0.20),
            borderRadius: BorderRadius.circular(999),
          ),
          child: AnimatedAlign(
            duration: OceanMotion.responsive(context, OceanMotion.smooth),
            alignment: value ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(
              width: 16,
              height: 16,
              margin: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: OceanColors.white,
                shape: BoxShape.circle,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SmallGlassButton extends StatelessWidget {
  const _SmallGlassButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.style = GlassButtonStyle.primary,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final GlassButtonStyle style;

  @override
  Widget build(BuildContext context) {
    final foreground = switch (style) {
      GlassButtonStyle.primary => OceanColors.white,
      GlassButtonStyle.outline => OceanColors.pineTeal,
      GlassButtonStyle.destructive => OceanColors.critical,
    };
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 44),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: style == GlassButtonStyle.destructive
              ? OceanColors.critical.withValues(alpha: 0.08)
              : Colors.transparent,
          gradient: style == GlassButtonStyle.primary
              ? const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [OceanColors.verdigris, OceanColors.pineTeal],
                )
              : null,
          borderRadius: BorderRadius.circular(OceanRadii.pill),
          border: style == GlassButtonStyle.destructive
              ? Border.all(color: OceanColors.critical.withValues(alpha: 0.30))
              : null,
          boxShadow: style == GlassButtonStyle.destructive
              ? null
              : [
                  BoxShadow(
                    color: OceanColors.pineTeal.withValues(
                      alpha: style == GlassButtonStyle.primary ? 0.20 : 0.05,
                    ),
                    blurRadius: style == GlassButtonStyle.primary ? 12 : 20,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: TextButton(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            foregroundColor: foreground,
            disabledForegroundColor: foreground.withValues(alpha: 0.50),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            minimumSize: const Size(0, 44),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            shape: const StadiumBorder(),
            textStyle: OceanTypography.caption,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 12, color: foreground),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: OceanTypography.caption.copyWith(color: foreground),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AIAnalysisCard extends StatelessWidget {
  const _AIAnalysisCard({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final diagnostics = controller.fishDiagnostics;
    final diagnosis = diagnostics.isEmpty ? null : diagnostics.first;
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CardHeader(
            title: 'AI Analysis',
            icon: LucideIcons.brain,
            trailing: Text(
              diagnosis == null
                  ? '—'
                  : TimeOfDay.fromDateTime(diagnosis.scannedAt).format(context),
              style: OceanTypography.caption,
            ),
            divider: true,
          ),
          Row(
            children: [
              Expanded(
                child: GlassPanel(
                  child: _MetricValue(
                    label: 'Fish Detected',
                    value: controller.fish.isEmpty
                        ? '—'
                        : '${controller.detectedFish}',
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GlassPanel(
                  child: _MetricValue(
                    label: 'FNU',
                    value: _fnuValue(controller.lastTurbidityResult),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          GlassPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Species Breakdown', style: OceanTypography.caption),
                const SizedBox(height: 10),
                if (controller.fish.isEmpty)
                  Text('Awaiting analysis…', style: OceanTypography.caption)
                else
                  LayoutBuilder(
                    builder: (context, constraints) => Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: controller.fish
                          .map(
                            (fish) => ConstrainedBox(
                              constraints: BoxConstraints(
                                maxWidth: constraints.maxWidth,
                              ),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: _speciesColor(fish.speciesId),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Flexible(
                                      child: Text(
                                        fish.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: OceanTypography.caption,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      '${fish.detected}',
                                      style: OceanTypography.caption.copyWith(
                                        color: OceanColors.ink,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          )
                          .toList(growable: false),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _DiagnosisPanel(diagnosis: diagnosis),
        ],
      ),
    );
  }

  static String _fnuValue(String? result) {
    if (result == null) return '—';
    final match = RegExp(r'-?\d+(?:\.\d+)?').firstMatch(result);
    final parsed = match == null ? null : double.tryParse(match.group(0)!);
    return parsed?.toStringAsFixed(2) ?? result;
  }

  static Color _speciesColor(String speciesId) => switch (speciesId) {
    'cardinal_tetra' => const Color(0xFF4169E1),
    'guppy' => const Color(0xFFFF69B4),
    'corydoras' => const Color(0xFFDAA520),
    'cherry_barb' => const Color(0xFFDC143C),
    _ => const Color(0xFF3B82F6),
  };
}

class _DiagnosisPanel extends StatelessWidget {
  const _DiagnosisPanel({required this.diagnosis});

  final FishDiagnostic? diagnosis;

  @override
  Widget build(BuildContext context) {
    final statusColor = diagnosis == null
        ? OceanColors.slateGrey
        : OceanColors.good;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: OceanColors.white.withValues(alpha: 0.20),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: OceanColors.white.withValues(alpha: 0.20)),
      ),
      child: Stack(
        children: [
          if (diagnosis != null)
            Positioned(
              top: 0,
              bottom: 0,
              left: 0,
              child: ColoredBox(
                color: statusColor,
                child: const SizedBox(width: 4),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Fish Health Diagnosis',
                  style: OceanTypography.caption.copyWith(color: statusColor),
                ),
                const SizedBox(height: 8),
                if (diagnosis == null)
                  Text('Awaiting diagnosis…', style: OceanTypography.caption)
                else ...[
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text('Status: ', style: OceanTypography.body),
                      Text(
                        diagnosis!.status.toUpperCase(),
                        style: OceanTypography.strong.copyWith(
                          color: statusColor,
                        ),
                      ),
                      Text(
                        ' (Confidence: ${diagnosis!.confidence}%)',
                        style: OceanTypography.caption,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Diagnosed Subject: ${diagnosis!.fish.name}',
                    style: OceanTypography.caption.copyWith(
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ConstrainedBox(
                    constraints: const BoxConstraints(
                      maxWidth: 200,
                      maxHeight: 140,
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(2),
                      child: Image.asset(
                        diagnosis!.fish.assetPath,
                        fit: BoxFit.contain,
                        errorBuilder: (_, _, _) => const SizedBox.shrink(),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text.rich(
                    TextSpan(
                      style: OceanTypography.body,
                      children: [
                        const TextSpan(
                          text: 'Observation: ',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                        TextSpan(text: diagnosis!.observation),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricValue extends StatelessWidget {
  const _MetricValue({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: OceanTypography.caption),
        const SizedBox(height: 3),
        Text(value, style: OceanTypography.title),
      ],
    );
  }
}

class _SettingsPanelRow extends StatelessWidget {
  const _SettingsPanelRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.highlighted = false,
    this.destructive = false,
    this.showChevron = false,
    this.action,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool highlighted;
  final bool destructive;
  final bool showChevron;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final iconColor = destructive
        ? OceanColors.criticalInk
        : highlighted
        ? OceanColors.darkCyan
        : OceanColors.slateGrey;
    final titleColor = destructive ? OceanColors.criticalInk : OceanColors.ink;
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: destructive
                ? OceanColors.critical.withValues(alpha: 0.10)
                : Colors.transparent,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 17, color: iconColor),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                title,
                style: OceanTypography.strong.copyWith(color: titleColor),
              ),
              const SizedBox(height: 2),
              Text(subtitle, style: OceanTypography.caption),
            ],
          ),
        ),
        if (action != null) ...[
          const SizedBox(width: 8),
          action!,
        ] else if (showChevron) ...[
          const SizedBox(width: 8),
          const Icon(
            LucideIcons.chevronRight,
            size: 18,
            color: OceanColors.slateGrey,
          ),
        ],
      ],
    );
  }
}

class FullscreenCameraOverlay extends StatefulWidget {
  const FullscreenCameraOverlay({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  State<FullscreenCameraOverlay> createState() =>
      _FullscreenCameraOverlayState();
}

class _FullscreenCameraOverlayState extends State<FullscreenCameraOverlay> {
  bool _flashActive = false;

  OceanEyesController get controller => widget.controller;

  Future<void> _captureSnapshot() async {
    setState(() => _flashActive = true);
    await Future<void>.delayed(const Duration(milliseconds: 120));
    if (mounted) setState(() => _flashActive = false);
  }

  @override
  Widget build(BuildContext context) {
    final drawerWidth = math.min(320.0, MediaQuery.sizeOf(context).width);
    return Positioned.fill(
      child: BlockSemantics(
        child: Semantics(
          container: true,
          scopesRoute: true,
          namesRoute: true,
          explicitChildNodes: true,
          label: 'Fullscreen aquarium camera',
          child: FocusTraversalGroup(
            child: ColoredBox(
              color: OceanColors.prussianBlue,
              child: SafeArea(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AquariumStreamImage(
                      controller: controller,
                      fit: BoxFit.cover,
                    ),
                    IgnorePointer(
                      child: AnimatedOpacity(
                        opacity: _flashActive ? 0.85 : 0,
                        duration: const Duration(milliseconds: 100),
                        child: const ColoredBox(color: OceanColors.white),
                      ),
                    ),
                    _FullscreenCameraControls(
                      controller: controller,
                      onCaptureSnapshot: _captureSnapshot,
                    ),
                    AnimatedPositioned(
                      duration: OceanMotion.responsive(
                        context,
                        const Duration(milliseconds: 300),
                      ),
                      curve: Curves.easeInOut,
                      top: 0,
                      bottom: 0,
                      right: controller.inventoryDrawerOpen ? 0 : -drawerWidth,
                      width: drawerWidth,
                      child: ExcludeFocus(
                        excluding: !controller.inventoryDrawerOpen,
                        child: ExcludeSemantics(
                          excluding: !controller.inventoryDrawerOpen,
                          child: Semantics(
                            container: true,
                            label: 'Fullscreen fish inventory',
                            child: _FullscreenInventory(controller: controller),
                          ),
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

class _FullscreenCameraControls extends StatelessWidget {
  const _FullscreenCameraControls({
    required this.controller,
    required this.onCaptureSnapshot,
  });

  final OceanEyesController controller;
  final VoidCallback onCaptureSnapshot;

  @override
  Widget build(BuildContext context) {
    final busy =
        controller.cameraStage == CameraStage.aiProcessing ||
        controller.cameraStage == CameraStage.measuringTurbidity;
    return AnimatedPositioned(
      duration: OceanMotion.responsive(
        context,
        const Duration(milliseconds: 300),
      ),
      curve: Curves.easeInOut,
      right: controller.inventoryDrawerOpen ? 332 : 16,
      bottom: 12,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _FullscreenControlButton(
            icon: LucideIcons.camera,
            tooltip: 'Capture Snapshot',
            onPressed: onCaptureSnapshot,
          ),
          const SizedBox(width: 8),
          _FullscreenControlButton(
            icon: LucideIcons.eye,
            tooltip: 'Measure Water Clarity',
            loading: controller.cameraStage == CameraStage.measuringTurbidity,
            onPressed: busy ? null : controller.measureTurbidity,
          ),
          const SizedBox(width: 8),
          _FullscreenControlButton(
            icon: LucideIcons.brain,
            tooltip: controller.aiEnabled
                ? 'Stop AI Analysis'
                : 'Start AI Analysis',
            active: controller.aiEnabled,
            loading: controller.cameraStage == CameraStage.aiProcessing,
            onPressed: busy
                ? null
                : () => controller.toggleAI(!controller.aiEnabled),
          ),
          const SizedBox(width: 8),
          const _FullscreenControlButton(
            icon: LucideIcons.stethoscope,
            tooltip: 'Run Fish Health Diagnosis',
            onPressed: null,
          ),
          const SizedBox(width: 8),
          _FullscreenControlButton(
            icon: LucideIcons.fish,
            tooltip: controller.inventoryDrawerOpen
                ? 'Hide Fish Inventory'
                : 'Show Fish Inventory',
            active: controller.inventoryDrawerOpen,
            onPressed: controller.toggleInventoryDrawer,
          ),
          const SizedBox(width: 8),
          _FullscreenControlButton(
            icon: LucideIcons.minimize2,
            tooltip: 'Exit Fullscreen',
            onPressed: () => controller.setFullscreenCamera(false),
          ),
        ],
      ),
    );
  }
}

class _FullscreenControlButton extends StatelessWidget {
  const _FullscreenControlButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.active = false,
    this.loading = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final bool active;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Semantics(
        button: true,
        enabled: onPressed != null,
        label: tooltip,
        child: Opacity(
          opacity: onPressed == null ? 0.35 : 1,
          child: SizedBox.square(
            dimension: 32,
            child: Material(
              color: Colors.transparent,
              shape: const CircleBorder(),
              child: InkResponse(
                onTap: onPressed,
                radius: 16,
                customBorder: const CircleBorder(),
                child: ClipOval(
                  child: BackdropFilter(
                    filter: ui.ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.transparent,
                        boxShadow: [
                          BoxShadow(
                            color: OceanColors.pineTeal.withValues(alpha: 0.05),
                            blurRadius: 20,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Center(
                        child: loading
                            ? const SizedBox.square(
                                dimension: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: OceanColors.white,
                                ),
                              )
                            : Icon(
                                icon,
                                size: 14,
                                color: OceanColors.white,
                                shadows: active
                                    ? const [
                                        Shadow(
                                          color: OceanColors.white,
                                          blurRadius: 5,
                                        ),
                                      ]
                                    : null,
                              ),
                      ),
                    ),
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

class _FullscreenInventory extends StatelessWidget {
  const _FullscreenInventory({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final detectionRate = controller.totalFish == 0
        ? 0
        : (controller.detectedFish / controller.totalFish * 100).round();
    return ClipRect(
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Material(
          color: OceanColors.prussianBlue.withValues(alpha: 0.55),
          child: SafeArea(
            child: Stack(
              children: [
                Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 24, 52, 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: _InverseStat(
                              label: 'TOTAL FISH',
                              value: '${controller.totalFish}',
                            ),
                          ),
                          const SizedBox(width: 32),
                          Expanded(
                            child: _InverseStat(
                              label: 'DETECTION',
                              value: '$detectionRate%',
                              valueColor: OceanColors.warning,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                        itemCount: controller.fish.length + 1,
                        itemBuilder: (context, index) {
                          if (index == 0) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(
                                'Visibility by species',
                                style: OceanTypography.caption.copyWith(
                                  color: OceanColors.white.withValues(
                                    alpha: 0.55,
                                  ),
                                ),
                              ),
                            );
                          }
                          final fish = controller.fish[index - 1];
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            child: Row(
                              children: [
                                SizedBox.square(
                                  dimension: 44,
                                  child: Center(
                                    child: FishAvatar(
                                      assetPath: fish.assetPath,
                                      name: fish.name,
                                      size: 38,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        fish.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: OceanTypography.strong.copyWith(
                                          color: OceanColors.white,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${fish.detected} / ${fish.count} detected',
                                        style: OceanTypography.caption.copyWith(
                                          color: OceanColors.white.withValues(
                                            alpha: 0.55,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                _FullscreenVisibility(
                                  detected: fish.detected,
                                  expected: fish.count,
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
                Positioned(
                  top: 20,
                  right: 12,
                  child: _DrawerCloseButton(
                    onPressed: controller.toggleInventoryDrawer,
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

class _DrawerCloseButton extends StatelessWidget {
  const _DrawerCloseButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Close fish inventory',
      child: SizedBox.square(
        dimension: 32,
        child: IconButton(
          padding: EdgeInsets.zero,
          onPressed: onPressed,
          color: OceanColors.white.withValues(alpha: 0.65),
          iconSize: 17,
          icon: const Icon(LucideIcons.x),
          style: IconButton.styleFrom(
            backgroundColor: Colors.transparent,
            shape: const CircleBorder(),
          ),
        ),
      ),
    );
  }
}

class _FullscreenVisibility extends StatelessWidget {
  const _FullscreenVisibility({required this.detected, required this.expected});

  final int detected;
  final int expected;

  @override
  Widget build(BuildContext context) {
    final percent = expected == 0
        ? 0
        : (detected / expected * 100).round().clamp(0, 100);
    final color = percent >= 80
        ? const Color(0xFF16A34A)
        : percent >= 50
        ? const Color(0xFFD97706)
        : const Color(0xFFDC2626);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox.square(
          dimension: 34,
          child: CustomPaint(
            painter: _VisibilityRingPainter(
              progress: percent / 100,
              color: color,
            ),
            child: Center(
              child: Icon(LucideIcons.eye, size: 12.2, color: color),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '$percent%',
          style: OceanTypography.caption.copyWith(
            fontSize: 10,
            height: 1.2,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _VisibilityRingPainter extends CustomPainter {
  const _VisibilityRingPainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 3.0;
    final center = size.center(Offset.zero);
    final radius = (size.shortestSide - stroke) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..color = OceanColors.azureMist,
    );
    canvas.drawArc(
      rect,
      -math.pi / 2,
      math.pi * 2 * progress.clamp(0, 1),
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(covariant _VisibilityRingPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}

class _InverseStat extends StatelessWidget {
  const _InverseStat({
    required this.label,
    required this.value,
    this.valueColor = OceanColors.white,
  });

  final String label;
  final String value;
  final Color valueColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: OceanTypography.caption.copyWith(
            color: OceanColors.white.withValues(alpha: 0.65),
          ),
        ),
        Text(value, style: OceanTypography.strong.copyWith(color: valueColor)),
      ],
    );
  }
}
