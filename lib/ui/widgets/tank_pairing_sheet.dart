import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../view_models/oceaneyes_controller.dart';
import 'glass.dart';

Future<void> showTankPairingSheet({
  required BuildContext context,
  required OceanEyesController controller,
}) {
  return showModalBottomSheet<void>(
    context: context,
    useSafeArea: true,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: OceanColors.prussianBlue.withValues(alpha: 0.58),
    builder: (context) => _TankPairingSheet(controller: controller),
  );
}

enum _PairingMode { scan, manual, create }

class _TankPairingSheet extends StatefulWidget {
  const _TankPairingSheet({required this.controller});

  final OceanEyesController controller;

  @override
  State<_TankPairingSheet> createState() => _TankPairingSheetState();
}

class _TankPairingSheetState extends State<_TankPairingSheet> {
  final _manualController = TextEditingController();
  final _tankNameController = TextEditingController(text: 'My Aquarium');
  final _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );

  _PairingMode _mode = _PairingMode.scan;
  bool _submitting = false;
  String? _localError;
  String? _lastScannedPayload;

  OceanEyesController get controller => widget.controller;
  bool get _busy => _submitting || controller.pairingInProgress;

  @override
  void dispose() {
    _manualController.dispose();
    _tankNameController.dispose();
    unawaited(_scannerController.dispose());
    super.dispose();
  }

  void _selectMode(_PairingMode mode) {
    if (_mode == mode || _busy) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _mode = mode;
      _localError = null;
      _lastScannedPayload = null;
    });

    if (mode == _PairingMode.scan) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || _mode != _PairingMode.scan) return;
        unawaited(_startScanner());
      });
    } else {
      unawaited(_stopScanner());
    }
  }

  Future<void> _startScanner() async {
    try {
      await _scannerController.start();
    } on MobileScannerException {
      // The scanner widget renders actionable permission/platform failures.
    }
  }

  Future<void> _stopScanner() async {
    try {
      await _scannerController.stop();
    } on MobileScannerException {
      // A stop can race scanner initialization when switching modes quickly.
    }
  }

  void _handleDetection(BarcodeCapture capture) {
    if (_busy || _mode != _PairingMode.scan) return;
    String? payload;
    for (final barcode in capture.barcodes) {
      final candidate = barcode.rawValue?.trim();
      if (candidate != null && candidate.isNotEmpty) {
        payload = candidate;
        break;
      }
    }
    if (payload == null || payload == _lastScannedPayload) return;
    _lastScannedPayload = payload;
    unawaited(_pairScannedPayload(payload));
  }

  Future<void> _pairScannedPayload(String payload) async {
    await _stopScanner();
    final paired = await _runOperation(
      () => controller.pairTankPayload(payload),
    );
    if (!paired && mounted && _mode == _PairingMode.scan) {
      _lastScannedPayload = null;
      await _startScanner();
    }
  }

  Future<void> _submitManualPayload() async {
    final payload = _manualController.text.trim();
    if (payload.isEmpty) {
      setState(() {
        _localError = 'Enter a tank ID or paste the complete pairing payload.';
      });
      return;
    }
    await _runOperation(() => controller.pairTankPayload(payload));
  }

  Future<void> _createTank() async {
    final name = _tankNameController.text.trim();
    if (name.isEmpty) {
      setState(() => _localError = 'Enter a name for the new tank.');
      return;
    }
    await _runOperation(() => controller.createProductionTank(name));
  }

  Future<bool> _runOperation(Future<void> Function() operation) async {
    if (_busy) return false;
    setState(() {
      _submitting = true;
      _localError = null;
    });

    try {
      await operation();
      if (!mounted) return false;
      final paired = controller.tankConnected;
      if (paired && controller.productionError == null) {
        Navigator.of(context).pop();
        return true;
      }
      return false;
    } catch (error) {
      if (!mounted) return false;
      setState(() {
        _localError = 'Tank pairing failed. Check the code and try again.';
      });
      return false;
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;
    return AnimatedPadding(
      duration: OceanMotion.responsive(context, OceanMotion.fade),
      curve: OceanMotion.smoothCurve,
      padding: EdgeInsets.only(bottom: keyboardInset),
      child: FractionallySizedBox(
        heightFactor: 0.92,
        child: Align(
          alignment: Alignment.bottomCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: OceanGeometry.referenceWidth,
            ),
            child: Material(
              key: const ValueKey('tank-pairing-sheet'),
              color: OceanColors.azureMist,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(OceanRadii.card),
              ),
              clipBehavior: Clip.antiAlias,
              child: AnimatedBuilder(
                animation: controller,
                builder: (context, _) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildHeader(context),
                    _buildModeSelector(),
                    if (_busy) const LinearProgressIndicator(minHeight: 2),
                    if (_errorMessage case final message?)
                      _ErrorBanner(message: message),
                    Expanded(child: _buildModeBody()),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String? get _errorMessage {
    final local = _localError?.trim();
    if (local != null && local.isNotEmpty) return local;
    final production = controller.productionError?.trim();
    return production == null || production.isEmpty ? null : production;
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 12, 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: OceanColors.verdigris.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              LucideIcons.qrCode,
              size: 20,
              color: OceanColors.darkCyan,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Connect a tank', style: OceanTypography.title),
                Text(
                  'Pair existing hardware or create a new tank.',
                  style: OceanTypography.caption,
                ),
              ],
            ),
          ),
          GlassIconButton(
            icon: LucideIcons.x,
            tooltip: 'Close tank pairing',
            onPressed: _busy ? null : () => Navigator.of(context).pop(),
            background: Colors.transparent,
            iconSize: 18,
          ),
        ],
      ),
    );
  }

  Widget _buildModeSelector() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: Row(
        children: [
          Expanded(
            child: _ModeButton(
              key: const ValueKey('tank-pairing-mode-scan'),
              label: 'Scan QR',
              icon: LucideIcons.scanLine,
              selected: _mode == _PairingMode.scan,
              onTap: _busy ? null : () => _selectMode(_PairingMode.scan),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _ModeButton(
              key: const ValueKey('tank-pairing-mode-manual'),
              label: 'Enter code',
              icon: LucideIcons.keyboard,
              selected: _mode == _PairingMode.manual,
              onTap: _busy ? null : () => _selectMode(_PairingMode.manual),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _ModeButton(
              key: const ValueKey('tank-pairing-mode-create'),
              label: 'Create',
              icon: LucideIcons.plus,
              selected: _mode == _PairingMode.create,
              onTap: _busy ? null : () => _selectMode(_PairingMode.create),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModeBody() => switch (_mode) {
    _PairingMode.scan => _buildScanner(),
    _PairingMode.manual => _buildManualEntry(),
    _PairingMode.create => _buildCreateTank(),
  };

  Widget _buildScanner() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  MobileScanner(
                    key: const ValueKey('tank-qr-scanner'),
                    controller: _scannerController,
                    fit: BoxFit.cover,
                    onDetect: _handleDetection,
                    placeholderBuilder: (context, _) => const ColoredBox(
                      color: OceanColors.prussianBlue,
                      child: Center(
                        child: CircularProgressIndicator(
                          color: OceanColors.turquoise,
                        ),
                      ),
                    ),
                    errorBuilder: (context, error, _) => ColoredBox(
                      color: OceanColors.prussianBlue,
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              LucideIcons.camera,
                              size: 28,
                              color: OceanColors.white,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Camera access is unavailable',
                              textAlign: TextAlign.center,
                              style: OceanTypography.strong.copyWith(
                                color: OceanColors.white,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Allow camera access, or use Enter code instead.',
                              textAlign: TextAlign.center,
                              style: OceanTypography.caption.copyWith(
                                color: OceanColors.white.withValues(
                                  alpha: 0.78,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  IgnorePointer(
                    child: Center(
                      child: Container(
                        width: 210,
                        height: 170,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: OceanColors.turquoise,
                            width: 3,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Point the camera at the QR code supplied with your OceanEyes monitor.',
            textAlign: TextAlign.center,
            style: OceanTypography.bodyMuted,
          ),
        ],
      ),
    );
  }

  Widget _buildManualEntry() {
    return SingleChildScrollView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Tank ID or pairing payload', style: OceanTypography.strong),
          const SizedBox(height: 6),
          Text(
            'Enter the tank reference directly, or paste the complete JSON payload from the monitor.',
            style: OceanTypography.bodyMuted,
          ),
          const SizedBox(height: 14),
          TextField(
            key: const ValueKey('tank-pairing-manual-input'),
            controller: _manualController,
            enabled: !_busy,
            autofocus: true,
            minLines: 3,
            maxLines: 6,
            textInputAction: TextInputAction.done,
            autocorrect: false,
            enableSuggestions: false,
            onSubmitted: (_) => _submitManualPayload(),
            decoration: const InputDecoration(
              labelText: 'Tank ID or JSON payload',
              hintText: 'tank-abc123 or {"v":1,"tank_id":"tank-abc123"}',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 18),
          GlassButton(
            label: 'Pair tank',
            icon: LucideIcons.link,
            expanded: true,
            loading: _busy,
            onPressed: _busy ? null : _submitManualPayload,
          ),
        ],
      ),
    );
  }

  Widget _buildCreateTank() {
    return SingleChildScrollView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Create a new tank', style: OceanTypography.strong),
          const SizedBox(height: 6),
          Text(
            'A unique reference code will be generated so an OceanEyes monitor can be paired later.',
            style: OceanTypography.bodyMuted,
          ),
          const SizedBox(height: 14),
          TextField(
            key: const ValueKey('tank-pairing-create-name'),
            controller: _tankNameController,
            enabled: !_busy,
            autofocus: true,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _createTank(),
            decoration: const InputDecoration(
              labelText: 'Tank name',
              hintText: 'Living Room Reef',
            ),
          ),
          const SizedBox(height: 18),
          GlassButton(
            label: 'Create tank',
            icon: LucideIcons.plus,
            expanded: true,
            loading: _busy,
            onPressed: _busy ? null : _createTank,
          ),
        ],
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    super.key,
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = selected ? OceanColors.white : OceanColors.ink;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected
            ? OceanColors.action
            : OceanColors.white.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 52),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 17, color: foreground),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: OceanTypography.caption.copyWith(color: foreground),
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

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: GlassPanel(
        color: OceanColors.criticalInk.withValues(alpha: 0.08),
        borderColor: OceanColors.criticalInk.withValues(alpha: 0.22),
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
      ),
    );
  }
}
