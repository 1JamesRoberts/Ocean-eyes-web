import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/aquarium_hero.dart';
import '../widgets/data_visuals.dart';
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
        _CameraLifecycleCard(controller: controller),
        const SizedBox(height: 16),
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
      child: Column(
        children: [
          const CardHeader(
            title: 'Tank Management',
            icon: LucideIcons.settings,
            divider: true,
          ),
          const SizedBox(height: 12),
          if (!controller.tankConnected)
            GlassPanel(
              child: Row(
                children: [
                  const Icon(LucideIcons.unplug, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'No tank connected',
                          style: OceanTypography.strong,
                        ),
                        Text(
                          'Reconnect the demo tank to resume monitoring.',
                          style: OceanTypography.caption,
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: controller.connectDemoTank,
                    style: TextButton.styleFrom(
                      minimumSize: const Size(48, 48),
                      foregroundColor: OceanColors.darkCyan,
                    ),
                    child: const Text('Connect'),
                  ),
                ],
              ),
            )
          else ...[
            GlassPanel(
              child: _renaming
                  ? Column(
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
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerRight,
                          child: GlassButton(
                            label: 'Save',
                            icon: LucideIcons.save,
                            onPressed: _saveTankName,
                          ),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        const Icon(LucideIcons.fishSymbol, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                controller.tankName,
                                style: OceanTypography.strong,
                              ),
                              Text(
                                'Ref Code: tank-demo',
                                style: OceanTypography.caption,
                              ),
                            ],
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => setState(() {
                            _tankNameController.text = controller.tankName;
                            _renaming = true;
                          }),
                          icon: const Icon(LucideIcons.pencil, size: 15),
                          label: const Text('Rename'),
                          style: TextButton.styleFrom(
                            minimumSize: const Size(48, 48),
                            foregroundColor: OceanColors.ink,
                            textStyle: OceanTypography.caption,
                          ),
                        ),
                      ],
                    ),
            ),
            const SizedBox(height: 8),
            const GlassPanel(
              child: _StaticSettingsRow(
                icon: LucideIcons.radioTower,
                title: 'IoT Scanner Console',
                subtitle: 'Pair or review monitor hardware',
                highlighted: true,
              ),
            ),
            const SizedBox(height: 8),
            DisclosureCard(
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
                ],
              ),
            ),
            const SizedBox(height: 8),
            DisclosureCard(
              title: 'Background Canvas',
              subtitle: 'Video and background transition controls',
              icon: LucideIcons.palette,
              expanded: controller.debugSectionOpen,
              onChanged: (value) => controller.setDisclosure('debug', value),
              child: _BackgroundDebugControls(controller: controller),
            ),
            const SizedBox(height: 8),
            GlassPanel(
              onTap: () => _confirmDisconnect(context),
              child: const _StaticSettingsRow(
                icon: LucideIcons.unlink,
                title: 'Disconnect from Tank',
                subtitle: 'Remove this tank from the active dashboard',
                destructive: true,
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
      child: Column(
        children: [
          const CardHeader(
            title: 'Alerts & Thresholds',
            icon: LucideIcons.shield,
            divider: true,
          ),
          const SizedBox(height: 12),
          DisclosureCard(
            title: 'Alert sensitivity',
            subtitle:
                '${controller.clarityThreshold.toStringAsFixed(1)} FNU turbidity max, ${controller.visibleFishThreshold.round()}% fish visibility',
            icon: LucideIcons.triangleAlert,
            expanded: controller.thresholdSectionOpen,
            onChanged: (value) => controller.setDisclosure('threshold', value),
            child: Column(
              children: [
                OceanSlider(
                  label: 'Maximum turbidity',
                  value: controller.clarityThreshold,
                  min: 1,
                  max: 10,
                  divisions: 18,
                  valueLabel:
                      '${controller.clarityThreshold.toStringAsFixed(1)} FNU',
                  onChanged: (value) =>
                      controller.previewSetting('clarityThreshold', value),
                  onChangeEnd: (value) =>
                      controller.commitSetting('clarityThreshold', value),
                ),
                OceanSlider(
                  label: 'Minimum fish visible',
                  value: controller.visibleFishThreshold,
                  min: 20,
                  max: 100,
                  divisions: 8,
                  valueLabel: '${controller.visibleFishThreshold.round()}%',
                  onChanged: (value) =>
                      controller.previewSetting('visibleFishThreshold', value),
                  onChangeEnd: (value) =>
                      controller.commitSetting('visibleFishThreshold', value),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          GlassPanel(
            onTap: controller.openAlerts,
            child: const _StaticSettingsRow(
              icon: LucideIcons.bell,
              title: 'Safety Alert Logs',
              subtitle: 'Warnings and event history',
            ),
          ),
          const SizedBox(height: 8),
          DisclosureCard(
            title: 'AI Preferences',
            subtitle: controller.aiEnabled
                ? 'AI enabled, 10s polling'
                : 'AI disabled, 10s polling',
            icon: LucideIcons.cpu,
            expanded: controller.aiPreferencesOpen,
            onChanged: (value) => controller.setDisclosure('ai', value),
            child: Column(
              children: [
                SwitchRow(
                  title: 'Auto-start AI when stream connects',
                  subtitle:
                      'Begin local analysis as soon as the camera is ready.',
                  value: controller.aiEnabled,
                  onChanged: controller.toggleAI,
                ),
                SwitchRow(
                  title: 'Show detection boxes',
                  subtitle: 'Display species labels over the live camera.',
                  value: controller.showDetections,
                  onChanged: controller.setShowDetections,
                ),
                const Divider(height: 20),
                const SwitchRow(
                  title: 'Disease diagnosis',
                  subtitle: 'Coming in a later on-device model release.',
                  value: false,
                  enabled: false,
                  onChanged: _noopBool,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDisconnect(BuildContext context) async {
    await showOceanDialog<void>(
      context: context,
      child: GlassCard(
        overlay: true,
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Disconnect from Tank', style: OceanTypography.title),
            const SizedBox(height: 10),
            Text(
              'This will remove “${controller.tankName}” from your active monitoring dashboard. You can reconnect it later using the reference code: tank-demo.',
              style: OceanTypography.bodyMuted,
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: GlassButton(
                    label: 'Cancel',
                    style: GlassButtonStyle.outline,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GlassButton(
                    label: 'Yes, Disconnect',
                    style: GlassButtonStyle.destructive,
                    onPressed: () {
                      Navigator.of(context).pop();
                      controller.disconnectTank();
                    },
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

void _noopBool(bool _) {}

class _CameraLifecycleCard extends StatelessWidget {
  const _CameraLifecycleCard({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final (icon, title, description) = switch (controller.cameraStage) {
      CameraStage.beforePermission => (
        LucideIcons.camera,
        'Camera access',
        'OceanEyes needs camera permission to monitor your aquarium. The feed starts automatically after access is granted.',
      ),
      CameraStage.requestingPermission => (
        LucideIcons.loaderCircle,
        'Requesting permission',
        'Complete the system camera prompt to continue.',
      ),
      CameraStage.denied => (
        LucideIcons.cameraOff,
        'Permission denied',
        'Camera access is off. Retry the permission request or enable it in system settings.',
      ),
      CameraStage.unavailable => (
        LucideIcons.cameraOff,
        controller.tankConnected ? 'Camera unavailable' : 'Tank disconnected',
        controller.tankConnected
            ? 'OceanEyes could not find a compatible camera on this device.'
            : 'Reconnect your aquarium to resume camera monitoring.',
      ),
      CameraStage.idle => (
        LucideIcons.video,
        'Camera idle',
        'The camera is ready to start.',
      ),
      CameraStage.aiProcessing => (
        LucideIcons.sparkles,
        'AI analysis in progress',
        'The latest frame is being analyzed on this device.',
      ),
      CameraStage.measuringTurbidity => (
        LucideIcons.testTube2,
        'Measuring water clarity',
        'Hold the camera steady while OceanEyes samples the frame.',
      ),
      CameraStage.active => (
        LucideIcons.camera,
        'Camera active',
        '${controller.usingFrontCamera ? 'Device' : 'Tank'} camera is live and ready for local AI analysis.',
      ),
    };
    final busy =
        controller.cameraStage == CameraStage.requestingPermission ||
        controller.cameraStage == CameraStage.aiProcessing ||
        controller.cameraStage == CameraStage.measuringTurbidity;

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CardHeader(title: title, icon: icon, divider: true),
          const SizedBox(height: 12),
          Text(description, style: OceanTypography.bodyMuted),
          const SizedBox(height: 14),
          if (controller.cameraStage == CameraStage.beforePermission)
            GlassButton(
              label: 'Allow Camera Access',
              icon: LucideIcons.camera,
              expanded: true,
              onPressed: controller.requestCameraPermission,
            )
          else if (controller.cameraStage == CameraStage.denied)
            GlassButton(
              label: 'Retry Camera Permission',
              icon: LucideIcons.refreshCw,
              expanded: true,
              onPressed: controller.retryCamera,
            )
          else if (controller.cameraStage == CameraStage.unavailable)
            GlassButton(
              label: controller.tankConnected
                  ? 'Check Again'
                  : 'Reconnect Tank',
              icon: LucideIcons.refreshCw,
              expanded: true,
              onPressed: controller.tankConnected
                  ? () => controller.setCameraStage(CameraStage.idle)
                  : controller.connectDemoTank,
            )
          else if (controller.cameraStage == CameraStage.idle)
            GlassButton(
              label: 'Start Camera',
              icon: LucideIcons.camera,
              expanded: true,
              onPressed: () => controller.setCameraStage(CameraStage.active),
            )
          else if (busy)
            const LinearProgressIndicator(
              minHeight: 4,
              color: OceanColors.verdigris,
              backgroundColor: Color(0x1F828E97),
            )
          else
            Row(
              children: [
                Expanded(
                  child: GlassButton(
                    label: 'Measure Clarity',
                    icon: LucideIcons.testTube2,
                    style: GlassButtonStyle.outline,
                    onPressed: controller.measureTurbidity,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GlassButton(
                    label: 'Fullscreen',
                    icon: LucideIcons.maximize2,
                    onPressed: () => controller.setFullscreenCamera(true),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _AIAnalysisCard extends StatelessWidget {
  const _AIAnalysisCard({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CardHeader(
            title: 'AI Analysis',
            icon: LucideIcons.sparkles,
            trailing: GlassPill(
              foregroundColor: controller.aiEnabled
                  ? OceanColors.darkCyan
                  : OceanColors.inkMuted,
              color: controller.aiEnabled
                  ? OceanColors.turquoise.withValues(alpha: 0.14)
                  : OceanColors.slateGrey.withValues(alpha: 0.10),
              child: Text(controller.aiEnabled ? 'On-device' : 'Paused'),
            ),
            divider: true,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: GlassPanel(
                  child: _MetricValue(
                    label: 'Fish Detected',
                    value: controller.aiEnabled
                        ? '${controller.detectedFish}'
                        : '—',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: GlassPanel(
                  child: _MetricValue(
                    label: 'Water Clarity',
                    value: controller.lastTurbidityResult ?? 'Measuring…',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text('Species Breakdown', style: OceanTypography.strong),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: controller.fish
                .map(
                  (fish) =>
                      GlassPill(child: Text('${fish.name} · ${fish.detected}')),
                )
                .toList(growable: false),
          ),
          const SizedBox(height: 12),
          GlassPanel(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final details = Row(
                  children: [
                    Icon(
                      LucideIcons.stethoscope,
                      size: 18,
                      color: OceanColors.inkMuted.withValues(alpha: 0.55),
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Fish Health Diagnosis',
                            style: OceanTypography.strong.copyWith(
                              color: OceanColors.inkMuted,
                            ),
                          ),
                          Text(
                            'Visible but disabled for this release.',
                            style: OceanTypography.caption,
                          ),
                        ],
                      ),
                    ),
                  ],
                );
                final largeText =
                    MediaQuery.textScalerOf(context).scale(13) > 17.5;
                if (largeText || constraints.maxWidth < 280) {
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      details,
                      const SizedBox(height: 6),
                      const Align(
                        alignment: Alignment.centerRight,
                        child: GlassPill(child: Text('Coming soon')),
                      ),
                    ],
                  );
                }
                return Row(
                  children: [
                    Expanded(child: details),
                    const SizedBox(width: 6),
                    const GlassPill(child: Text('Coming soon')),
                  ],
                );
              },
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

class _StaticSettingsRow extends StatelessWidget {
  const _StaticSettingsRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.highlighted = false,
    this.destructive = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool highlighted;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive
        ? OceanColors.criticalInk
        : highlighted
        ? OceanColors.darkCyan
        : OceanColors.ink;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 44),
      child: Row(
        children: [
          Icon(icon, size: 19, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: OceanTypography.strong.copyWith(color: color),
                ),
                const SizedBox(height: 2),
                Text(subtitle, style: OceanTypography.caption),
              ],
            ),
          ),
          Icon(LucideIcons.chevronRight, size: 18, color: color),
        ],
      ),
    );
  }
}

class _BackgroundDebugControls extends StatelessWidget {
  const _BackgroundDebugControls({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        OceanSlider(
          label: 'Sample opacity',
          value: controller.ambientOpacity * 100,
          min: 0,
          max: 100,
          divisions: 20,
          valueLabel: '${(controller.ambientOpacity * 100).round()}%',
          onChanged: (value) =>
              controller.previewSetting('ambientOpacity', value / 100),
          onChangeEnd: (value) =>
              controller.commitSetting('ambientOpacity', value / 100),
        ),
        OceanSlider(
          label: 'Ambient blur',
          value: controller.ambientBlur,
          min: 0,
          max: 48,
          divisions: 12,
          valueLabel: '${controller.ambientBlur.round()}px',
          onChanged: (value) => controller.previewSetting('ambientBlur', value),
          onChangeEnd: (value) =>
              controller.commitSetting('ambientBlur', value),
        ),
        const SizedBox(height: 4),
        DropdownButtonFormField<FixtureScenario>(
          initialValue: controller.fixtureScenario,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Visual fixture state'),
          items: FixtureScenario.values
              .map(
                (scenario) => DropdownMenuItem(
                  value: scenario,
                  child: Text(_scenarioLabel(scenario)),
                ),
              )
              .toList(growable: false),
          onChanged: (scenario) {
            if (scenario != null) controller.applyFixture(scenario);
          },
        ),
        const SizedBox(height: 8),
        GlassButton(
          label: 'Reset defaults',
          icon: LucideIcons.refreshCw,
          style: GlassButtonStyle.outline,
          expanded: true,
          onPressed: () {
            controller.updateSetting('ambientBlur', 48);
            controller.updateSetting('ambientOpacity', 1);
          },
        ),
      ],
    );
  }

  String _scenarioLabel(FixtureScenario scenario) {
    return switch (scenario) {
      FixtureScenario.populated => 'Populated',
      FixtureScenario.dashboardWaiting => 'Dashboard · waiting',
      FixtureScenario.dashboardWarning => 'Dashboard · warning',
      FixtureScenario.fishEmpty => 'My Fish · empty',
      FixtureScenario.analyticsLoading => 'Analytics · loading',
      FixtureScenario.analyticsEmpty => 'Analytics · empty',
      FixtureScenario.analyticsError => 'Analytics · error',
      FixtureScenario.cameraPermission => 'Camera · permission',
      FixtureScenario.cameraDenied => 'Camera · denied',
      FixtureScenario.cameraUnavailable => 'Camera · unavailable',
      FixtureScenario.alertsEmpty => 'Alerts · empty',
      FixtureScenario.historyEmpty => 'History · empty',
    };
  }
}

class FullscreenCameraOverlay extends StatelessWidget {
  const FullscreenCameraOverlay({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final portraitFallback = width < 640;
    final drawerWidth = portraitFallback
        ? width
        : math.min(320.0, width * 0.42);
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
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Color(0x4D000000),
                            Colors.transparent,
                            Color(0x66000000),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: GlassPill(
                        foregroundColor: OceanColors.white,
                        color: OceanColors.prussianBlue.withValues(alpha: 0.28),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(LucideIcons.camera, size: 14),
                            const SizedBox(width: 6),
                            Text('${controller.detectedFish} fish · Live'),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: Row(
                        children: [
                          GlassIconButton(
                            icon: LucideIcons.panelRight,
                            tooltip: controller.inventoryDrawerOpen
                                ? 'Close inventory drawer'
                                : 'Open inventory drawer',
                            color: OceanColors.white,
                            background: OceanColors.prussianBlue.withValues(
                              alpha: 0.28,
                            ),
                            onPressed: controller.toggleInventoryDrawer,
                          ),
                          const SizedBox(width: 4),
                          GlassIconButton(
                            icon: LucideIcons.x,
                            tooltip: 'Exit fullscreen',
                            color: OceanColors.white,
                            background: OceanColors.prussianBlue.withValues(
                              alpha: 0.28,
                            ),
                            onPressed: () =>
                                controller.setFullscreenCamera(false),
                          ),
                        ],
                      ),
                    ),
                    Positioned(
                      left: 12,
                      right: 12,
                      bottom: 12,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Expanded(
                            child: GlassButton(
                              label: 'Measure clarity',
                              icon: LucideIcons.testTube2,
                              style: GlassButtonStyle.outline,
                              expanded: true,
                              onPressed: controller.measureTurbidity,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: GlassButton(
                              label: controller.aiEnabled
                                  ? 'AI active'
                                  : 'Start AI',
                              icon: LucideIcons.sparkles,
                              expanded: true,
                              onPressed: () =>
                                  controller.toggleAI(!controller.aiEnabled),
                            ),
                          ),
                        ],
                      ),
                    ),
                    AnimatedPositioned(
                      duration: OceanMotion.responsive(
                        context,
                        const Duration(milliseconds: 300),
                      ),
                      curve: OceanMotion.smoothCurve,
                      top: 0,
                      bottom: 0,
                      right: controller.inventoryDrawerOpen ? 0 : -drawerWidth,
                      width: drawerWidth,
                      child: ExcludeFocus(
                        excluding: !controller.inventoryDrawerOpen,
                        child: ExcludeSemantics(
                          excluding: !controller.inventoryDrawerOpen,
                          child: controller.inventoryDrawerOpen
                              ? BlockSemantics(
                                  child: Semantics(
                                    container: true,
                                    scopesRoute: true,
                                    namesRoute: true,
                                    explicitChildNodes: true,
                                    label: 'Fullscreen fish inventory',
                                    child: _FullscreenInventory(
                                      controller: controller,
                                      fullScreenFallback: portraitFallback,
                                    ),
                                  ),
                                )
                              : _FullscreenInventory(
                                  controller: controller,
                                  fullScreenFallback: portraitFallback,
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

class _FullscreenInventory extends StatelessWidget {
  const _FullscreenInventory({
    required this.controller,
    required this.fullScreenFallback,
  });

  final OceanEyesController controller;
  final bool fullScreenFallback;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: OceanColors.prussianBlue.withValues(alpha: 0.88),
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 10),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Aquarium Inventory',
                      style: OceanTypography.title.copyWith(
                        color: OceanColors.white,
                      ),
                    ),
                  ),
                  GlassIconButton(
                    icon: LucideIcons.x,
                    tooltip: 'Close inventory',
                    color: OceanColors.white,
                    background: OceanColors.white.withValues(alpha: 0.10),
                    onPressed: controller.toggleInventoryDrawer,
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: _InverseStat(
                      label: 'TOTAL FISH',
                      value: '${controller.totalFish}',
                    ),
                  ),
                  Expanded(
                    child: _InverseStat(
                      label: 'DETECTION',
                      value:
                          '${controller.detectedFish}/${controller.totalFish}',
                    ),
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Visibility by species',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 13,
                    color: OceanColors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                itemCount: controller.fish.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final fish = controller.fish[index];
                  return Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: OceanColors.white.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: OceanColors.white.withValues(alpha: 0.16),
                      ),
                    ),
                    child: Row(
                      children: [
                        FishAvatar(
                          assetPath: fish.assetPath,
                          name: fish.name,
                          size: 58,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                fish.name,
                                style: OceanTypography.strong.copyWith(
                                  color: OceanColors.white,
                                ),
                              ),
                              Text(
                                '${fish.detected} / ${fish.count} detected',
                                style: OceanTypography.caption.copyWith(
                                  color: OceanColors.white.withValues(
                                    alpha: 0.70,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        VisibilityRing(progress: fish.visibility, size: 38),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InverseStat extends StatelessWidget {
  const _InverseStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: OceanTypography.caption.copyWith(
            fontSize: 10,
            color: OceanColors.white.withValues(alpha: 0.65),
          ),
        ),
        Text(
          value,
          style: OceanTypography.section.copyWith(color: OceanColors.white),
        ),
      ],
    );
  }
}
