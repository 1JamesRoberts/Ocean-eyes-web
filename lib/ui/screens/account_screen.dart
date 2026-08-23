import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/aquarium_models.dart';
import '../../models/tank_pairing_codec.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/aquarium_hero.dart';
import '../widgets/data_visuals.dart';
import '../widgets/glass.dart';
import '../widgets/screen_primitives.dart';
import '../widgets/tank_pairing_sheet.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _renaming = false;
  bool _showDisconnectConfirmation = false;
  bool _signingOut = false;
  String? _accountActionError;
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

  Future<void> _openTankPairing() async {
    FocusScope.of(context).unfocus();
    await controller.suspendCameraForPairing();
    try {
      if (!mounted) return;
      await showTankPairingSheet(context: context, controller: controller);
    } finally {
      await controller.resumeCameraAfterPairing();
    }
    if (!mounted) return;
    _tankNameController.text = controller.tankName;
    setState(() {
      _renaming = false;
      _showDisconnectConfirmation = false;
    });
  }

  Future<void> _signOut() async {
    if (_signingOut) return;
    setState(() {
      _signingOut = true;
      _accountActionError = null;
    });
    try {
      await controller.signOut();
    } catch (_) {
      if (mounted) {
        setState(() {
          _accountActionError = 'Sign-out failed. Please try again.';
        });
      }
    } finally {
      if (mounted) setState(() => _signingOut = false);
    }
  }

  Future<void> _showTankPairingCode() async {
    final tankId = controller.productionEnabled
        ? controller.activeTankId
        : 'tank-demo';
    if (tankId == null) return;
    final payload = TankPairingCodec.encode(TankPairingPayload(tankId: tankId));
    await showDialog<void>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: OceanColors.azureMist,
        insetPadding: const EdgeInsets.all(24),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(OceanRadii.card),
        ),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 340),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Tank pairing code', style: OceanTypography.title),
                const SizedBox(height: 6),
                Text(
                  'Scan this only on a device you want to connect to ${controller.tankName}.',
                  textAlign: TextAlign.center,
                  style: OceanTypography.caption,
                ),
                const SizedBox(height: 16),
                Semantics(
                  image: true,
                  label: 'QR code for tank $tankId',
                  child: QrImageView(
                    data: payload,
                    size: 220,
                    backgroundColor: Colors.white,
                    eyeStyle: const QrEyeStyle(
                      eyeShape: QrEyeShape.square,
                      color: OceanColors.prussianBlue,
                    ),
                    dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: OceanColors.prussianBlue,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SelectableText(
                  tankId,
                  textAlign: TextAlign.center,
                  style: OceanTypography.strong,
                ),
                const SizedBox(height: 16),
                GlassButton(
                  label: 'Done',
                  compact: true,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String get _tankReferenceCode {
    if (!controller.productionEnabled) return 'tank-demo';
    final code = controller.tankReferenceCode.trim();
    return code.isEmpty ? 'Pending' : code;
  }

  String? get _productionErrorMessage {
    final local = _accountActionError?.trim();
    if (local != null && local.isNotEmpty) return local;
    final production = controller.productionError?.trim();
    return production == null || production.isEmpty ? null : production;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_isStreaming) ...[
          _AIAnalysisCard(controller: controller),
          const SizedBox(height: 16),
        ],
        _buildTankManagement(),
        const SizedBox(height: 12),
        _buildSharedVisualSettings(),
        const SizedBox(height: 16),
        _buildAlertsAndThresholds(),
      ],
    );
  }

  bool get _isStreaming => switch (controller.cameraStage) {
    CameraStage.active ||
    CameraStage.aiProcessing ||
    CameraStage.measuringTurbidity => true,
    _ => false,
  };

  Widget _buildTankManagement() {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      child: Column(
        children: [
          const CardHeader(
            title: 'Tank Management',
            icon: LucideIcons.shieldAlert,
            divider: true,
          ),
          if (controller.productionEnabled &&
              _productionErrorMessage != null) ...[
            _buildProductionError(_productionErrorMessage!),
            const SizedBox(height: 12),
          ],
          if (controller.productionEnabled) ...[
            _buildGoogleAccount(),
            const SizedBox(height: 12),
            _buildNotificationPermission(),
            const SizedBox(height: 12),
          ],
          if (!controller.tankConnected)
            GlassPanel(
              color: Colors.transparent,
              borderColor: Colors.transparent,
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
                          'Scan its QR code, enter a tank ID, or create a new tank.',
                          style: OceanTypography.caption,
                        ),
                      ],
                    ),
                  ),
                  Flexible(
                    child: TextButton(
                      onPressed: controller.pairingInProgress
                          ? null
                          : _openTankPairing,
                      style: TextButton.styleFrom(
                        minimumSize: const Size(48, 48),
                        foregroundColor: OceanColors.darkCyan,
                      ),
                      child: const Text('Pair'),
                    ),
                  ),
                ],
              ),
            )
          else ...[
            GlassPanel(
              color: Colors.transparent,
              borderColor: Colors.transparent,
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
                            compact: true,
                            onPressed: _saveTankName,
                          ),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        const SizedBox.square(
                          dimension: 36,
                          child: Center(
                            child: Icon(
                              LucideIcons.fish,
                              size: 17,
                              color: OceanColors.inkMuted,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                controller.tankName,
                                style: OceanTypography.strong,
                              ),
                              Text(
                                'Ref Code: $_tankReferenceCode',
                                style: OceanTypography.caption,
                              ),
                            ],
                          ),
                        ),
                        if (controller.canEditTankSettings) ...[
                          GlassIconButton(
                            icon: LucideIcons.qrCode,
                            tooltip: 'Show tank pairing QR code',
                            size: 40,
                            iconSize: 17,
                            onPressed: _showTankPairingCode,
                          ),
                          const SizedBox(width: 8),
                        ],
                        GlassButton(
                          label: 'Rename',
                          icon: LucideIcons.pencil,
                          compact: true,
                          style: GlassButtonStyle.outline,
                          onPressed:
                              controller.productionEnabled &&
                                  !controller.canEditTankSettings
                              ? null
                              : () => setState(() {
                                  _tankNameController.text =
                                      controller.tankName;
                                  _renaming = true;
                                }),
                        ),
                      ],
                    ),
            ),
            const SizedBox(height: 12),
            GlassPanel(
              color: Colors.transparent,
              borderColor: Colors.transparent,
              onTap: _openTankPairing,
              child: const _StaticSettingsRow(
                icon: LucideIcons.monitor,
                title: 'IoT Scanner Console',
                subtitle: 'Scan, pair, or create monitor hardware',
                highlighted: true,
              ),
            ),
            if (controller.productionEnabled &&
                controller.canCalibrateTank) ...[
              const SizedBox(height: 12),
              GlassPanel(
                color: Colors.transparent,
                borderColor: Colors.transparent,
                child: Column(
                  children: [
                    _StaticSettingsRow(
                      icon: LucideIcons.scanLine,
                      title: 'Water-line calibration',
                      subtitle: controller.recalibrationRequested
                          ? 'Recalibration requested on the monitor'
                          : 'Set where the below-water camera crop begins',
                      highlighted: controller.recalibrationRequested,
                    ),
                    const SizedBox(height: 12),
                    OceanSlider(
                      label: 'Water line',
                      value: controller.waterLineCalibration * 100,
                      min: 0,
                      max: 100,
                      divisions: 100,
                      valueLabel:
                          '${(controller.waterLineCalibration * 100).round()}%',
                      onChanged: (value) =>
                          controller.previewWaterLineCalibration(value / 100),
                      onChangeEnd: (value) =>
                          controller.setWaterLineCalibration(value / 100),
                    ),
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: controller.recalibrationRequested
                            ? null
                            : controller.requestTankRecalibration,
                        child: Text(
                          controller.recalibrationRequested
                              ? 'Calibration requested'
                              : 'Request automatic calibration',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            if (_showDisconnectConfirmation)
              Container(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
                decoration: BoxDecoration(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'This will remove “${controller.tankName}” from your active monitoring dashboard. You can reconnect it later using the reference code: $_tankReferenceCode.',
                      style: OceanTypography.caption,
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 10,
                      runSpacing: 8,
                      children: [
                        GlassButton(
                          label: 'Cancel',
                          compact: true,
                          style: GlassButtonStyle.outline,
                          onPressed: () => setState(
                            () => _showDisconnectConfirmation = false,
                          ),
                        ),
                        GlassButton(
                          label: 'Yes, Disconnect',
                          compact: true,
                          style: GlassButtonStyle.destructive,
                          onPressed: controller.disconnectTank,
                        ),
                      ],
                    ),
                  ],
                ),
              )
            else
              GlassPanel(
                color: Colors.transparent,
                borderColor: Colors.transparent,
                onTap: () => setState(() => _showDisconnectConfirmation = true),
                child: const _StaticSettingsRow(
                  icon: LucideIcons.x,
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

  Widget _buildGoogleAccount() {
    final user = controller.productionUser;
    final accountLabel = user?.email?.trim().isNotEmpty ?? false
        ? user!.email!.trim()
        : user?.displayName?.trim().isNotEmpty ?? false
        ? user!.displayName!.trim()
        : 'Google account';
    return GlassPanel(
      color: Colors.transparent,
      borderColor: Colors.transparent,
      child: Row(
        children: [
          const SizedBox.square(
            dimension: 36,
            child: Center(
              child: Icon(
                LucideIcons.userRoundCheck,
                size: 18,
                color: OceanColors.darkCyan,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Signed in with Google', style: OceanTypography.strong),
                Text(accountLabel, style: OceanTypography.caption),
              ],
            ),
          ),
          const SizedBox(width: 8),
          GlassButton(
            label: 'Sign out',
            icon: LucideIcons.logOut,
            compact: true,
            style: GlassButtonStyle.outline,
            loading: _signingOut,
            onPressed: _signingOut ? null : _signOut,
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationPermission() {
    final servicesAvailable = controller.productionServicesAvailable;
    final enabled = controller.notificationPermissionGranted;
    return GlassPanel(
      color: Colors.transparent,
      borderColor: Colors.transparent,
      child: Row(
        children: [
          const SizedBox.square(
            dimension: 36,
            child: Center(
              child: Icon(
                LucideIcons.bell,
                size: 18,
                color: OceanColors.darkCyan,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Safety notifications',
                  style: OceanTypography.strong,
                ),
                Text(
                  enabled
                      ? 'Alert notifications are enabled on this device.'
                      : 'Enable alerts for water and fish safety events.',
                  style: OceanTypography.caption,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          GlassButton(
            label: enabled ? 'Enabled' : 'Enable',
            icon: enabled ? LucideIcons.check : LucideIcons.bell,
            compact: true,
            loading: controller.notificationPermissionRequesting,
            onPressed: enabled || !servicesAvailable
                ? null
                : controller.requestNotificationPermission,
          ),
        ],
      ),
    );
  }

  Widget _buildSharedVisualSettings() {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      child: Column(
        children: [
          const CardHeader(
            title: 'Appearance',
            icon: LucideIcons.palette,
            divider: true,
          ),
          DisclosureCard(
            panelColor: Colors.transparent,
            panelBorderColor: Colors.transparent,
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
          DisclosureCard(
            panelColor: Colors.transparent,
            panelBorderColor: Colors.transparent,
            title: 'Background Canvas',
            subtitle: 'Video and background transition controls',
            icon: LucideIcons.image,
            expanded: controller.debugSectionOpen,
            onChanged: (value) => controller.setDisclosure('debug', value),
            child: _BackgroundDebugControls(controller: controller),
          ),
        ],
      ),
    );
  }

  Widget _buildProductionError(String message) {
    return GlassPanel(
      color: Colors.transparent,
      borderColor: Colors.transparent,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 1),
            child: Icon(
              LucideIcons.circleAlert,
              size: 17,
              color: OceanColors.critical,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: OceanTypography.caption.copyWith(
                color: OceanColors.criticalInk,
              ),
            ),
          ),
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

  String _temperatureLabel(double value) {
    final rounded = value.round();
    if (rounded > 0) return 'Warm (+$rounded)';
    if (rounded < 0) return 'Cool ($rounded)';
    return 'Neutral';
  }

  String _tintLabel(double value) {
    final rounded = value.round();
    if (rounded > 0) return 'Magenta (+$rounded)';
    if (rounded < 0) return 'Green ($rounded)';
    return 'Neutral';
  }

  Widget _buildAlertsAndThresholds() {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      child: Column(
        children: [
          const CardHeader(
            title: 'Alerts & Thresholds',
            icon: LucideIcons.shieldCheck,
            divider: true,
          ),
          DisclosureCard(
            panelColor: Colors.transparent,
            panelBorderColor: Colors.transparent,
            title: 'Alert sensitivity',
            subtitle:
                '${controller.clarityThreshold.toStringAsFixed(1)} FNU turbidity max, ${controller.visibleFishThreshold.round()}% fish visibility change',
            icon: LucideIcons.bell,
            expanded: controller.thresholdSectionOpen,
            onChanged: (value) => controller.setDisclosure('threshold', value),
            child: IgnorePointer(
              ignoring:
                  controller.productionEnabled &&
                  !controller.canEditTankSettings,
              child: Opacity(
                opacity:
                    controller.productionEnabled &&
                        !controller.canEditTankSettings
                    ? 0.55
                    : 1,
                child: Column(
                  children: [
                    OceanSlider(
                      label: 'Maximum FNU Threshold',
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
                    const SizedBox(height: 16),
                    OceanSlider(
                      label: 'Discrepancy Alarm Trigger',
                      value: controller.visibleFishThreshold,
                      min: 20,
                      max: 80,
                      divisions: 6,
                      valueLabel:
                          '${controller.visibleFishThreshold.round()}% visibility',
                      onChanged: (value) => controller.previewSetting(
                        'visibleFishThreshold',
                        value,
                      ),
                      onChangeEnd: (value) => controller.commitSetting(
                        'visibleFishThreshold',
                        value,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          GlassPanel(
            color: Colors.transparent,
            borderColor: Colors.transparent,
            onTap: controller.openAlerts,
            child: const _StaticSettingsRow(
              icon: LucideIcons.bell,
              title: 'Safety Alert Logs',
              subtitle: 'Warnings and event history',
            ),
          ),
          const SizedBox(height: 12),
          DisclosureCard(
            panelColor: Colors.transparent,
            panelBorderColor: Colors.transparent,
            title: 'AI Preferences',
            subtitle:
                '${controller.autoConnect ? 'Auto-start enabled' : 'Auto-start disabled'}, ${(controller.pollingIntervalMs / 1000).round()}s polling',
            icon: LucideIcons.brain,
            expanded: controller.aiPreferencesOpen,
            onChanged: (value) => controller.setDisclosure('ai', value),
            child: Column(
              children: [
                SwitchRow(
                  title: 'Auto-start AI when stream connects',
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
                  min: 10,
                  max: 90,
                ),
                const SizedBox(height: 16),
                _confidenceSlider(
                  label: 'Species Confidence Threshold',
                  setting: 'speciesConfidenceThreshold',
                  value: controller.speciesConfidenceThreshold,
                  min: 10,
                  max: 90,
                ),
                const SizedBox(height: 16),
                _confidenceSlider(
                  label: 'Diagnosis Minimum Confidence',
                  setting: 'diagnosisMinConfidence',
                  value: controller.diagnosisMinConfidence,
                  min: 30,
                  max: 90,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _confidenceSlider({
    required String label,
    required String setting,
    required double value,
    required double min,
    required double max,
  }) {
    final percent = value * 100;
    return OceanSlider(
      label: label,
      value: percent,
      min: min,
      max: max,
      divisions: ((max - min) / 5).round(),
      valueLabel: '${percent.round()}%',
      onChanged: (next) => controller.previewSetting(setting, next / 100),
      onChangeEnd: (next) => controller.commitSetting(setting, next / 100),
    );
  }
}

class _AIAnalysisCard extends StatelessWidget {
  const _AIAnalysisCard({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CardHeader(
            title: 'AI Analysis',
            icon: LucideIcons.brain,
            trailing: Text(
              controller.aiEnabled ? '8:00:00 PM' : '—',
              style: OceanTypography.caption,
            ),
            divider: true,
          ),
          Row(
            children: [
              Expanded(
                child: GlassPanel(
                  color: Colors.transparent,
                  borderColor: Colors.transparent,
                  child: _MetricValue(
                    label: 'Fish Detected',
                    value: controller.aiEnabled
                        ? '${controller.detectedFish}'
                        : '—',
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GlassPanel(
                  color: Colors.transparent,
                  borderColor: Colors.transparent,
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
            color: Colors.transparent,
            borderColor: Colors.transparent,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Species Breakdown', style: OceanTypography.caption),
                const SizedBox(height: 10),
                if (!controller.aiEnabled)
                  Text('Awaiting analysis…', style: OceanTypography.caption)
                else
                  MediaQuery.withClampedTextScaling(
                    maxScaleFactor: 1,
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (
                          var index = 0;
                          index < controller.fish.length;
                          index++
                        )
                          DecoratedBox(
                            key: ValueKey(
                              'account-species-${controller.fish[index].id}',
                            ),
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: OceanColors.white.withValues(
                                  alpha: 0.25,
                                ),
                              ),
                              borderRadius: BorderRadius.circular(
                                OceanRadii.pill,
                              ),
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
                                      shape: BoxShape.circle,
                                      color:
                                          SpeciesDonut.colors[index %
                                              SpeciesDonut.colors.length],
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    controller.fish[index].name,
                                    style: OceanTypography.caption.copyWith(
                                      color: OceanColors.ink,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '${controller.fish[index].detected}',
                                    style: OceanTypography.caption.copyWith(
                                      color: OceanColors.ink,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          GlassPanel(
            color: Colors.transparent,
            borderColor: Colors.transparent,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Fish Health Diagnosis', style: OceanTypography.caption),
                const SizedBox(height: 8),
                Text('Awaiting diagnosis…', style: OceanTypography.caption),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _fnuValue(String? result) {
    if (!controller.aiEnabled || result == null) return '—';
    final value = double.tryParse(result.split(' ').first);
    return value?.toStringAsFixed(2) ?? '—';
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
        const SizedBox(height: 4),
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
    final iconColor = destructive
        ? OceanColors.criticalInk
        : highlighted
        ? OceanColors.darkCyan
        : OceanColors.inkMuted;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 44),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: destructive
                  ? OceanColors.criticalInk.withValues(alpha: 0.10)
                  : Colors.transparent,
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
                  style: OceanTypography.strong.copyWith(
                    color: destructive
                        ? OceanColors.criticalInk
                        : OceanColors.ink,
                  ),
                ),
                const SizedBox(height: 2),
                Text(subtitle, style: OceanTypography.caption),
              ],
            ),
          ),
          const Icon(
            LucideIcons.chevronRight,
            size: 18,
            color: OceanColors.inkMuted,
          ),
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
    final fadeStartMax = math.min(80.0, controller.ambientFadeEnd - 5);
    final fadeEndMin = math.max(20.0, controller.ambientFadeStart + 5);
    return Column(
      children: [
        OceanSlider(
          label: 'Base grey',
          value: controller.ambientBaseGrey,
          min: 0,
          max: 255,
          divisions: 255,
          valueLabel: _greyHex(controller.ambientBaseGrey),
          onChanged: (value) =>
              controller.previewSetting('ambientBaseGrey', value),
          onChangeEnd: (value) =>
              controller.commitSetting('ambientBaseGrey', value),
        ),
        const SizedBox(height: 12),
        OceanSlider(
          label: 'Sample opacity',
          value: controller.ambientOpacity * 10,
          min: 0,
          max: 100,
          divisions: 100,
          valueLabel: '${(controller.ambientOpacity * 10).round()}%',
          onChanged: (value) =>
              controller.previewSetting('ambientOpacity', value / 10),
          onChangeEnd: (value) =>
              controller.commitSetting('ambientOpacity', value / 10),
        ),
        const SizedBox(height: 12),
        OceanSlider(
          label: 'Blur radius',
          value: controller.ambientBlur,
          min: 0,
          max: 48,
          divisions: 48,
          valueLabel: '${controller.ambientBlur.round()}px',
          onChanged: (value) => controller.previewSetting('ambientBlur', value),
          onChangeEnd: (value) =>
              controller.commitSetting('ambientBlur', value),
        ),
        const SizedBox(height: 12),
        OceanSlider(
          label: 'Fade start',
          value: controller.ambientFadeStart.clamp(0.0, fadeStartMax),
          min: 0.0,
          max: fadeStartMax,
          divisions: fadeStartMax.round(),
          valueLabel: '${controller.ambientFadeStart.round()}%',
          onChanged: (value) =>
              controller.previewSetting('ambientFadeStart', value),
          onChangeEnd: (value) =>
              controller.commitSetting('ambientFadeStart', value),
        ),
        const SizedBox(height: 12),
        OceanSlider(
          label: 'Fade end',
          value: controller.ambientFadeEnd.clamp(fadeEndMin, 100.0),
          min: fadeEndMin,
          max: 100.0,
          divisions: (100.0 - fadeEndMin).round(),
          valueLabel: '${controller.ambientFadeEnd.round()}%',
          onChanged: (value) =>
              controller.previewSetting('ambientFadeEnd', value),
          onChangeEnd: (value) =>
              controller.commitSetting('ambientFadeEnd', value),
        ),
        const SizedBox(height: 12),
        OceanSlider(
          label: 'Hero fade start',
          value: controller.heroFadeStart,
          min: 0,
          max: 80,
          divisions: 80,
          valueLabel: '${controller.heroFadeStart.round()}%',
          onChanged: (value) =>
              controller.previewSetting('heroFadeStart', value),
          onChangeEnd: (value) =>
              controller.commitSetting('heroFadeStart', value),
        ),
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerLeft,
          child: GlassButton(
            label: 'Reset defaults',
            icon: LucideIcons.rotateCcw,
            compact: true,
            style: GlassButtonStyle.outline,
            onPressed: controller.resetAmbientCanvas,
          ),
        ),
      ],
    );
  }

  String _greyHex(double value) {
    final channel = value
        .round()
        .clamp(0, 255)
        .toRadixString(16)
        .padLeft(2, '0');
    return '#$channel$channel$channel';
  }
}

class FullscreenCameraOverlay extends StatelessWidget {
  const FullscreenCameraOverlay({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final drawerWidth = math.min(320.0, width);
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
              child: Stack(
                fit: StackFit.expand,
                children: [
                  AquariumStreamImage(
                    controller: controller,
                    fit: BoxFit.cover,
                  ),
                  _FullscreenCameraControls(controller: controller),
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
                                  ),
                                ),
                              )
                            : _FullscreenInventory(controller: controller),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FullscreenCameraControls extends StatelessWidget {
  const _FullscreenCameraControls({required this.controller});

  final OceanEyesController controller;

  @override
  Widget build(BuildContext context) {
    final busy =
        controller.cameraStage == CameraStage.aiProcessing ||
        controller.cameraStage == CameraStage.measuringTurbidity;
    final controls = <Widget>[
      _FullscreenControlButton(
        icon: LucideIcons.switchCamera,
        tooltip: controller.usingFrontCamera
            ? 'Switch to Rear Camera'
            : 'Switch to Front Camera',
        onPressed: busy ? null : controller.switchCamera,
      ),
      _FullscreenControlButton(
        icon: LucideIcons.eye,
        tooltip: 'Measure Water Clarity',
        loading: controller.cameraStage == CameraStage.measuringTurbidity,
        onPressed: busy ? null : controller.measureTurbidity,
      ),
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
      const _FullscreenControlButton(
        icon: LucideIcons.stethoscope,
        tooltip: 'Disease diagnosis is disabled in the on-device prototype',
      ),
      _FullscreenControlButton(
        icon: LucideIcons.fish,
        tooltip: controller.inventoryDrawerOpen
            ? 'Hide Fish Inventory'
            : 'Show Fish Inventory',
        active: controller.inventoryDrawerOpen,
        onPressed: controller.toggleInventoryDrawer,
      ),
      _FullscreenControlButton(
        icon: LucideIcons.minimize2,
        tooltip: 'Exit Fullscreen',
        onPressed: () => controller.setFullscreenCamera(false),
      ),
    ];
    return AnimatedPositioned(
      duration: OceanMotion.responsive(
        context,
        const Duration(milliseconds: 300),
      ),
      curve: Curves.easeInOut,
      right: controller.inventoryDrawerOpen ? 332 : 16,
      bottom: 6,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var index = 0; index < controls.length; index++) ...[
            if (index > 0) const SizedBox(width: 8),
            controls[index],
          ],
        ],
      ),
    );
  }
}

class _FullscreenControlButton extends StatelessWidget {
  const _FullscreenControlButton({
    required this.icon,
    required this.tooltip,
    this.onPressed,
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
    return Semantics(
      button: true,
      enabled: onPressed != null,
      label: tooltip,
      child: SizedBox(
        width: 32,
        height: 44,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: Center(
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: active
                    ? OceanColors.turquoise.withValues(alpha: 0.06)
                    : Colors.transparent,
                boxShadow: [
                  BoxShadow(
                    color: OceanColors.prussianBlue.withValues(alpha: 0.05),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: loading
                  ? const Padding(
                      padding: EdgeInsets.all(8),
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: OceanColors.white,
                      ),
                    )
                  : Icon(
                      icon,
                      size: 14,
                      color: onPressed == null
                          ? OceanColors.white.withValues(alpha: 0.35)
                          : OceanColors.white,
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
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Material(
          color: OceanColors.prussianBlue.withValues(alpha: 0.55),
          child: Stack(
            children: [
              Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 48, 12),
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
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Visibility by species',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13,
                          height: 1.35,
                          letterSpacing: -0.13,
                          color: Color(0x8CFFFFFF),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                      itemCount: controller.fish.length,
                      itemBuilder: (context, index) {
                        final fish = controller.fish[index];
                        final percent = (fish.visibility * 100).round();
                        final statusColor = fish.detected == fish.count
                            ? OceanColors.good
                            : fish.visibility >= 0.5
                            ? OceanColors.warning
                            : OceanColors.critical;
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: Image.asset(
                                  fish.assetPath,
                                  width: 64,
                                  height: 64,
                                  fit: BoxFit.contain,
                                  semanticLabel: '${fish.name} species artwork',
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
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
                              Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  VisibilityRing(
                                    progress: fish.visibility,
                                    size: 34,
                                    showLabel: false,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '$percent%',
                                    style: OceanTypography.caption.copyWith(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: statusColor,
                                    ),
                                  ),
                                ],
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
                top: 14,
                right: 6,
                child: Semantics(
                  button: true,
                  label: 'Close fish inventory',
                  child: IconButton(
                    onPressed: controller.toggleInventoryDrawer,
                    icon: Icon(
                      LucideIcons.x,
                      size: 17,
                      color: OceanColors.white.withValues(alpha: 0.65),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
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
            color: OceanColors.white.withValues(alpha: 0.70),
          ),
        ),
        Text(
          value,
          style: OceanTypography.strong.copyWith(
            color: valueColor,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
