import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/theme/oceaneyes_tokens.dart';
import '../../models/onboarding_models.dart';
import '../../models/tank_pairing_codec.dart';
import '../../view_models/oceaneyes_controller.dart';
import '../widgets/glass.dart';

/// Dedicated full-screen first-run tank connection flow.
class OceanEyesOnboardingScreen extends StatefulWidget {
  const OceanEyesOnboardingScreen({super.key, required this.controller});

  final OceanEyesController controller;

  @override
  State<OceanEyesOnboardingScreen> createState() =>
      _OceanEyesOnboardingScreenState();
}

class _OceanEyesOnboardingScreenState extends State<OceanEyesOnboardingScreen> {
  late final TextEditingController _manualController = TextEditingController();
  late final MobileScannerController _scannerController =
      MobileScannerController(
        autoStart: false,
        detectionSpeed: DetectionSpeed.noDuplicates,
        formats: const [BarcodeFormat.qrCode],
      );

  bool _scannerStarted = false;
  bool _manualEntry = false;
  bool _scannerError = false;
  bool _submitting = false;
  String? _localError;
  String? _feedback;
  String? _lastScannedPayload;

  OceanEyesController get controller => widget.controller;
  OnboardingState get state => controller.onboardingState;
  bool get _busy => _submitting || controller.pairingInProgress;

  @override
  void dispose() {
    _manualController.dispose();
    unawaited(_scannerController.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        _scheduleScannerStopIfNeeded();
        final media = MediaQuery.of(context);
        return Material(
          color: OceanColors.azureMist,
          child: Semantics(
            container: true,
            scopesRoute: true,
            namesRoute: true,
            explicitChildNodes: true,
            label: 'OceanEyes tank setup',
            child: Stack(
              fit: StackFit.expand,
              children: [
                const _OnboardingBackdrop(),
                SafeArea(
                  minimum: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  child: Column(
                    children: [
                      _buildHeader(context),
                      const SizedBox(height: OceanSpacing.sm),
                      Expanded(
                        child: SingleChildScrollView(
                          key: const ValueKey('onboarding-scroll'),
                          keyboardDismissBehavior:
                              ScrollViewKeyboardDismissBehavior.onDrag,
                          padding: EdgeInsets.only(
                            bottom: math.max(20, media.viewInsets.bottom + 20),
                          ),
                          child: Center(
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 520),
                              child: AnimatedSwitcher(
                                duration: OceanMotion.responsive(
                                  context,
                                  OceanMotion.fade,
                                ),
                                switchInCurve: Curves.easeOut,
                                switchOutCurve: Curves.easeIn,
                                child: KeyedSubtree(
                                  key: ValueKey(state.step),
                                  child: _buildStep(context),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _scheduleScannerStopIfNeeded() {
    if (!_scannerStarted || state.step == OnboardingStep.joinTank) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || state.step == OnboardingStep.joinTank) return;
      unawaited(_stopScanner());
    });
  }

  Widget _buildHeader(BuildContext context) {
    final canGoBack = state.step != OnboardingStep.welcome;
    return Row(
      children: [
        SizedBox(
          width: 48,
          height: 48,
          child: canGoBack
              ? Semantics(
                  button: true,
                  label: 'Back in tank setup',
                  child: IconButton(
                    tooltip: 'Back',
                    onPressed: _busy ? null : controller.handleOnboardingBack,
                    icon: const Icon(LucideIcons.arrowLeft),
                  ),
                )
              : const SizedBox.shrink(),
        ),
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text.rich(
                const TextSpan(
                  children: [
                    TextSpan(text: 'Ocean'),
                    TextSpan(
                      text: 'Eyes',
                      style: TextStyle(color: OceanColors.turquoise),
                    ),
                  ],
                ),
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 22,
                  height: 1,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -1,
                  color: OceanColors.prussianBlue,
                ),
              ),
              const SizedBox(height: 8),
              _ProgressDots(step: state.step),
            ],
          ),
        ),
        const SizedBox(width: 48, height: 48),
      ],
    );
  }

  Widget _buildStep(BuildContext context) {
    return switch (state.step) {
      OnboardingStep.welcome => _buildWelcome(context),
      OnboardingStep.choosePath => _buildChoosePath(context),
      OnboardingStep.createTank => _buildCreateTank(context),
      OnboardingStep.joinTank => _buildJoinTank(context),
      OnboardingStep.ownerPairing => _buildOwnerPairing(context),
      OnboardingStep.success => _buildSuccess(context),
    };
  }

  Widget _buildWelcome(BuildContext context) {
    return _OnboardingCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const _OnboardingIcon(icon: LucideIcons.waves),
          const SizedBox(height: OceanSpacing.lg),
          const Text(
            'A clearer view of your aquarium',
            textAlign: TextAlign.center,
            style: OceanTypography.section,
          ),
          const SizedBox(height: OceanSpacing.sm),
          Text(
            'Connect a tank to turn your aquarium into a calmer, smarter daily ritual.',
            textAlign: TextAlign.center,
            style: OceanTypography.bodyMuted,
          ),
          const SizedBox(height: OceanSpacing.xl),
          GlassButton(
            label: 'Get started',
            icon: LucideIcons.arrowRight,
            expanded: true,
            size: GlassButtonSize.large,
            onPressed: controller.continueOnboardingFromWelcome,
          ),
          const SizedBox(height: OceanSpacing.xs),
          GlassButton(
            label: 'I’ll do this later',
            expanded: true,
            style: GlassButtonStyle.outline,
            onPressed: controller.postponeOnboarding,
          ),
        ],
      ),
    );
  }

  Widget _buildChoosePath(BuildContext context) {
    return _OnboardingCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _StepHeading(
            eyebrow: 'CONNECT YOUR TANK',
            title: 'How would you like to connect?',
            description:
                'Choose the path that matches what you have in front of you.',
          ),
          const SizedBox(height: OceanSpacing.lg),
          _PathOption(
            icon: LucideIcons.plus,
            title: 'Set up a new tank',
            description: 'Create your aquarium and get a pairing code for it.',
            onTap: _busy
                ? null
                : () => controller.chooseOnboardingPath(OnboardingPath.newTank),
          ),
          const SizedBox(height: OceanSpacing.sm),
          _PathOption(
            icon: LucideIcons.qrCode,
            title: 'Join an existing tank',
            description: 'Scan or enter the tank ID shared by its owner.',
            onTap: _busy
                ? null
                : () => controller.chooseOnboardingPath(
                    OnboardingPath.joinExisting,
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildCreateTank(BuildContext context) {
    return _OnboardingCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _StepHeading(
            eyebrow: 'NEW TANK',
            title: 'Create your aquarium',
            description:
                'We’ll start with a simple name. You can rename it later in Account.',
          ),
          const SizedBox(height: OceanSpacing.lg),
          GlassPanel(
            padding: const EdgeInsets.all(OceanSpacing.md),
            child: Row(
              children: [
                const _OnboardingIcon(icon: LucideIcons.fishSymbol, size: 44),
                const SizedBox(width: OceanSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Tank name', style: OceanTypography.caption),
                      const SizedBox(height: 2),
                      Text('My Aquarium', style: OceanTypography.title),
                    ],
                  ),
                ),
                const Icon(
                  LucideIcons.check,
                  size: 18,
                  color: OceanColors.good,
                ),
              ],
            ),
          ),
          const SizedBox(height: OceanSpacing.lg),
          if (_errorMessage case final message?) ...[
            _InlineError(message: message),
            const SizedBox(height: OceanSpacing.sm),
          ],
          GlassButton(
            label: 'Create tank',
            icon: LucideIcons.plus,
            expanded: true,
            size: GlassButtonSize.large,
            loading: _busy,
            onPressed: _busy ? null : _createTank,
          ),
        ],
      ),
    );
  }

  Widget _buildJoinTank(BuildContext context) {
    return _OnboardingCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _StepHeading(
            eyebrow: 'EXISTING TANK',
            title: 'Join a tank',
            description:
                'Scanning is the quickest option. Camera access is requested only when you start the scanner.',
          ),
          const SizedBox(height: OceanSpacing.lg),
          if (_manualEntry)
            _buildManualEntry(context)
          else
            _buildScannerEntry(context),
          if (_errorMessage case final message?) ...[
            const SizedBox(height: OceanSpacing.sm),
            _InlineError(message: message),
          ],
        ],
      ),
    );
  }

  Widget _buildScannerEntry(BuildContext context) {
    if (!_scannerStarted) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _ScannerPlaceholder(),
          const SizedBox(height: OceanSpacing.md),
          GlassButton(
            label: 'Start QR scanner',
            icon: LucideIcons.scanLine,
            expanded: true,
            size: GlassButtonSize.large,
            onPressed: _busy ? null : _startScanner,
          ),
          const SizedBox(height: OceanSpacing.xs),
          GlassButton(
            label: 'Enter tank ID manually',
            icon: LucideIcons.keyboard,
            expanded: true,
            style: GlassButtonStyle.outline,
            onPressed: _busy ? null : _showManualEntry,
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: 260,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(OceanRadii.inline),
            child: Stack(
              fit: StackFit.expand,
              children: [
                MobileScanner(
                  key: const ValueKey('onboarding-qr-scanner'),
                  controller: _scannerController,
                  fit: BoxFit.cover,
                  onDetect: _handleDetection,
                  errorBuilder: (context, error, child) =>
                      _ScannerFailure(onManual: _showManualEntry),
                ),
                IgnorePointer(
                  child: Center(
                    child: Container(
                      width: 210,
                      height: 160,
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
        const SizedBox(height: OceanSpacing.sm),
        Text(
          'Point the camera at the tank QR code.',
          textAlign: TextAlign.center,
          style: OceanTypography.caption,
        ),
        const SizedBox(height: OceanSpacing.sm),
        GlassButton(
          label: 'Enter tank ID manually',
          icon: LucideIcons.keyboard,
          expanded: true,
          style: GlassButtonStyle.outline,
          onPressed: _busy ? null : _showManualEntry,
        ),
      ],
    );
  }

  Widget _buildManualEntry(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GlassPanel(
          padding: const EdgeInsets.all(OceanSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Tank ID or pairing payload',
                style: OceanTypography.strong,
              ),
              const SizedBox(height: OceanSpacing.xs),
              const Text(
                'Paste the readable tank ID or the complete version-1 JSON payload.',
                style: OceanTypography.caption,
              ),
              const SizedBox(height: OceanSpacing.sm),
              TextField(
                key: const ValueKey('onboarding-manual-input'),
                controller: _manualController,
                enabled: !_busy,
                autofocus: true,
                minLines: 2,
                maxLines: 5,
                autocorrect: false,
                enableSuggestions: false,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _submitManualPayload(),
                decoration: const InputDecoration(
                  labelText: 'Tank ID or JSON payload',
                  hintText: 'tank-abc123 or {"v":1,"tank_id":"tank-abc123"}',
                  alignLabelWithHint: true,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: OceanSpacing.md),
        GlassButton(
          label: 'Join tank',
          icon: LucideIcons.link,
          expanded: true,
          size: GlassButtonSize.large,
          loading: _busy,
          onPressed: _busy ? null : _submitManualPayload,
        ),
        const SizedBox(height: OceanSpacing.xs),
        GlassButton(
          label: 'Back to QR scanner',
          icon: LucideIcons.scanLine,
          expanded: true,
          style: GlassButtonStyle.outline,
          onPressed: _busy ? null : _showScannerEntry,
        ),
      ],
    );
  }

  Widget _buildOwnerPairing(BuildContext context) {
    final tankId = controller.tankReferenceCode;
    final payload = TankPairingCodec.encode(TankPairingPayload(tankId: tankId));
    return _OnboardingCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _OnboardingIcon(
            icon: LucideIcons.check,
            color: OceanColors.good,
          ),
          const SizedBox(height: OceanSpacing.md),
          const Text(
            'Your tank is ready',
            textAlign: TextAlign.center,
            style: OceanTypography.section,
          ),
          const SizedBox(height: OceanSpacing.xs),
          const Text(
            'Use this QR code or tank ID to connect an OceanEyes monitor or invite someone you trust.',
            textAlign: TextAlign.center,
            style: OceanTypography.bodyMuted,
          ),
          const SizedBox(height: OceanSpacing.lg),
          Center(
            child: Semantics(
              image: true,
              label: 'QR code for tank $tankId',
              child: QrImageView(
                data: payload,
                size: _qrSize(context),
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
          ),
          const SizedBox(height: OceanSpacing.md),
          GlassPanel(
            padding: const EdgeInsets.symmetric(
              horizontal: OceanSpacing.md,
              vertical: OceanSpacing.sm,
            ),
            child: SelectableText(
              tankId,
              textAlign: TextAlign.center,
              style: OceanTypography.title,
            ),
          ),
          const SizedBox(height: OceanSpacing.sm),
          Row(
            children: [
              Expanded(
                child: GlassButton(
                  key: const ValueKey('onboarding-copy-tank-id'),
                  label: 'Copy tank ID',
                  icon: LucideIcons.copy,
                  compact: true,
                  onPressed: _copyTankId,
                ),
              ),
              const SizedBox(width: OceanSpacing.xs),
              Expanded(
                child: GlassButton(
                  label: kIsWeb ? 'Copy to share' : 'Share',
                  icon: kIsWeb ? LucideIcons.copy : LucideIcons.share2,
                  compact: true,
                  style: GlassButtonStyle.outline,
                  onPressed: _shareTankId,
                ),
              ),
            ],
          ),
          if (_feedback case final feedback?) ...[
            const SizedBox(height: OceanSpacing.sm),
            Text(
              feedback,
              textAlign: TextAlign.center,
              style: OceanTypography.caption.copyWith(
                color: OceanColors.darkCyan,
              ),
            ),
          ],
          const SizedBox(height: OceanSpacing.lg),
          GlassButton(
            label: 'Go to dashboard',
            icon: LucideIcons.arrowRight,
            expanded: true,
            size: GlassButtonSize.large,
            onPressed: controller.finishOnboarding,
          ),
        ],
      ),
    );
  }

  Widget _buildSuccess(BuildContext context) {
    return _OnboardingCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const _OnboardingIcon(
            icon: LucideIcons.check,
            color: OceanColors.good,
          ),
          const SizedBox(height: OceanSpacing.lg),
          const Text(
            'Tank connected',
            textAlign: TextAlign.center,
            style: OceanTypography.section,
          ),
          const SizedBox(height: OceanSpacing.sm),
          const Text(
            'Your tank is ready in OceanEyes. You can explore the dashboard while the first readings arrive.',
            textAlign: TextAlign.center,
            style: OceanTypography.bodyMuted,
          ),
          const SizedBox(height: OceanSpacing.xl),
          GlassButton(
            label: 'Go to dashboard',
            icon: LucideIcons.arrowRight,
            expanded: true,
            size: GlassButtonSize.large,
            onPressed: controller.finishOnboarding,
          ),
        ],
      ),
    );
  }

  String? get _errorMessage {
    final local = _localError?.trim();
    if (local != null && local.isNotEmpty) return local;
    if (controller.productionError == null ||
        controller.productionError!.isEmpty) {
      return null;
    }
    return 'We could not connect that tank. Check the ID and try again.';
  }

  Future<void> _createTank() async {
    if (_busy) return;
    setState(() {
      _submitting = true;
      _localError = null;
      _feedback = null;
    });
    final tankId = await controller.createProductionTank('My Aquarium');
    if (!mounted) return;
    setState(() {
      _submitting = false;
      if (tankId == null || !controller.tankConnected) {
        _localError =
            'Tank creation failed. Check your connection and try again.';
      }
    });
  }

  Future<void> _submitManualPayload() async {
    if (_busy) return;
    final payload = _manualController.text.trim();
    final validationError = _validatePayload(payload);
    if (validationError != null) {
      setState(() => _localError = validationError);
      return;
    }
    setState(() {
      _submitting = true;
      _localError = null;
      _feedback = null;
    });
    final joined = await controller.pairTankPayload(payload);
    if (!mounted) return;
    setState(() {
      _submitting = false;
      if (!joined || !controller.tankConnected) {
        _localError = 'That tank could not be joined. Check the ID and retry.';
      }
    });
  }

  String? _validatePayload(String value) {
    if (value.trim().isEmpty) {
      return 'Enter a tank ID or paste the complete pairing payload.';
    }
    try {
      final trimmed = value.trim();
      if (trimmed.startsWith('{')) {
        TankPairingCodec.decode(trimmed);
      } else {
        TankPairingCodec.normalizeTankId(trimmed);
      }
      return null;
    } on TankPairingFormatException catch (error) {
      return switch (error.code) {
        TankPairingErrorCode.invalidJson ||
        TankPairingErrorCode.invalidShape ||
        TankPairingErrorCode.unsupportedVersion ||
        TankPairingErrorCode.missingTankId =>
          'That pairing payload is not valid. Paste the complete version-1 payload.',
        TankPairingErrorCode.empty || TankPairingErrorCode.invalidTankId =>
          'Enter a valid tank ID or pairing payload.',
      };
    }
  }

  Future<void> _startScanner() async {
    if (_busy || _scannerStarted) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _scannerStarted = true;
      _scannerError = false;
      _localError = null;
      _manualEntry = false;
    });
    try {
      await _scannerController.start();
    } on MobileScannerException {
      if (!mounted) return;
      setState(() {
        _scannerError = true;
        _manualEntry = true;
        _localError =
            'Camera access is unavailable. Enter the tank ID manually instead.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _scannerError = true;
        _manualEntry = true;
        _localError =
            'Camera access is unavailable. Enter the tank ID manually instead.';
      });
    }
  }

  Future<void> _stopScanner() async {
    if (!_scannerStarted) return;
    try {
      await _scannerController.stop();
    } on MobileScannerException {
      // Permission denial and widget teardown can race a stop call.
    }
    if (!mounted) return;
    setState(() => _scannerStarted = false);
  }

  void _showManualEntry() {
    if (_busy) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _manualEntry = true;
      _localError = _scannerError
          ? 'Camera access is unavailable. Enter the tank ID manually instead.'
          : null;
    });
    unawaited(_stopScanner());
  }

  void _showScannerEntry() {
    if (_busy) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _manualEntry = false;
      _localError = null;
      _scannerError = false;
    });
  }

  void _handleDetection(BarcodeCapture capture) {
    if (_busy || !_scannerStarted || _manualEntry) return;
    String? payload;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue?.trim();
      if (value != null && value.isNotEmpty) {
        payload = value;
        break;
      }
    }
    if (payload == null || payload == _lastScannedPayload) return;
    _lastScannedPayload = payload;
    _manualController.text = payload;
    unawaited(_pairScannedPayload(payload));
  }

  Future<void> _pairScannedPayload(String payload) async {
    await _stopScanner();
    if (!mounted) return;
    setState(() {
      _submitting = true;
      _localError = null;
    });
    final joined = await controller.pairTankPayload(payload);
    if (!mounted) return;
    setState(() {
      _submitting = false;
      if (!joined || !controller.tankConnected) {
        _lastScannedPayload = null;
        _localError =
            'That QR code could not be joined. Try again or enter the ID manually.';
      }
    });
  }

  Future<void> _copyTankId() async {
    await Clipboard.setData(ClipboardData(text: controller.tankReferenceCode));
    if (!mounted) return;
    setState(() => _feedback = 'Tank ID copied to clipboard.');
  }

  Future<void> _shareTankId() async {
    if (kIsWeb) {
      await _copyTankId();
      return;
    }
    try {
      final renderObject = context.findRenderObject();
      final sharePositionOrigin = renderObject is RenderBox
          ? renderObject.localToGlobal(Offset.zero) & renderObject.size
          : null;
      await SharePlus.instance.share(
        ShareParams(
          text:
              'Connect to my OceanEyes tank with ID: ${controller.tankReferenceCode}',
          sharePositionOrigin: sharePositionOrigin,
        ),
      );
      if (!mounted) return;
      setState(() => _feedback = 'Tank ID ready to share.');
    } catch (_) {
      await _copyTankId();
    }
  }

  double _qrSize(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return math.min(240, math.max(150, width - 96));
  }
}

class _OnboardingBackdrop extends StatelessWidget {
  const _OnboardingBackdrop();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            OceanColors.azureMist,
            OceanColors.azureMist,
            OceanColors.tropicalTeal.withValues(alpha: 0.12),
          ],
          stops: const [0, 0.62, 1],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -100,
            right: -80,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: OceanColors.turquoise.withValues(alpha: 0.08),
              ),
            ),
          ),
          Positioned(
            bottom: -120,
            left: -80,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: OceanColors.prussianBlue.withValues(alpha: 0.04),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressDots extends StatelessWidget {
  const _ProgressDots({required this.step});

  final OnboardingStep step;

  @override
  Widget build(BuildContext context) {
    final active = switch (step) {
      OnboardingStep.welcome => 0,
      OnboardingStep.choosePath => 1,
      OnboardingStep.createTank || OnboardingStep.joinTank => 2,
      OnboardingStep.ownerPairing || OnboardingStep.success => 3,
    };
    return Semantics(
      label: 'Tank setup step ${active + 1} of 4',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var index = 0; index < 4; index++) ...[
            AnimatedContainer(
              duration: OceanMotion.responsive(context, OceanMotion.fade),
              width: index == active ? 22 : 7,
              height: 7,
              decoration: BoxDecoration(
                color: index <= active
                    ? OceanColors.verdigris
                    : OceanColors.pearlAqua,
                borderRadius: BorderRadius.circular(OceanRadii.pill),
              ),
            ),
            if (index != 3) const SizedBox(width: 4),
          ],
        ],
      ),
    );
  }
}

class _OnboardingCard extends StatelessWidget {
  const _OnboardingCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      overlay: true,
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
      semanticLabel: 'OceanEyes tank setup step',
      child: child,
    );
  }
}

class _OnboardingIcon extends StatelessWidget {
  const _OnboardingIcon({
    required this.icon,
    this.color = OceanColors.darkCyan,
    this.size = 52,
  });

  final IconData icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(size * 0.30),
      ),
      child: Icon(icon, size: size * 0.44, color: color),
    );
  }
}

class _StepHeading extends StatelessWidget {
  const _StepHeading({
    required this.eyebrow,
    required this.title,
    required this.description,
  });

  final String eyebrow;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow,
          style: OceanTypography.caption.copyWith(
            color: OceanColors.darkCyan,
            letterSpacing: 1.1,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: OceanSpacing.xs),
        Text(title, style: OceanTypography.section),
        const SizedBox(height: OceanSpacing.xs),
        Text(description, style: OceanTypography.bodyMuted),
      ],
    );
  }
}

class _PathOption extends StatelessWidget {
  const _PathOption({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String description;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onTap != null,
      label: '$title. $description',
      child: Material(
        color: OceanColors.white.withValues(alpha: 0.24),
        borderRadius: BorderRadius.circular(OceanRadii.inline),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(OceanRadii.inline),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 76),
            child: Padding(
              padding: const EdgeInsets.all(OceanSpacing.sm),
              child: Row(
                children: [
                  _OnboardingIcon(icon: icon, size: 44),
                  const SizedBox(width: OceanSpacing.sm),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: OceanTypography.strong),
                        const SizedBox(height: 2),
                        Text(description, style: OceanTypography.caption),
                      ],
                    ),
                  ),
                  const SizedBox(width: OceanSpacing.xs),
                  const Icon(
                    LucideIcons.chevronRight,
                    size: 18,
                    color: OceanColors.inkMuted,
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

class _ScannerPlaceholder extends StatelessWidget {
  const _ScannerPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'QR scanner is ready to start',
      child: Container(
        height: 220,
        decoration: BoxDecoration(
          color: OceanColors.prussianBlue,
          borderRadius: BorderRadius.circular(OceanRadii.inline),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              LucideIcons.scanLine,
              size: 38,
              color: OceanColors.turquoise,
            ),
            const SizedBox(height: OceanSpacing.sm),
            Text(
              'Ready to scan',
              style: OceanTypography.title.copyWith(color: OceanColors.white),
            ),
            const SizedBox(height: OceanSpacing.xs),
            Text(
              'Camera access starts only when you tap the button.',
              textAlign: TextAlign.center,
              style: OceanTypography.caption.copyWith(
                color: OceanColors.pearlAqua,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScannerFailure extends StatelessWidget {
  const _ScannerFailure({required this.onManual});

  final VoidCallback onManual;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: OceanColors.prussianBlue,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(OceanSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                LucideIcons.cameraOff,
                size: 30,
                color: OceanColors.white,
              ),
              const SizedBox(height: OceanSpacing.sm),
              Text(
                'Camera access is unavailable',
                textAlign: TextAlign.center,
                style: OceanTypography.strong.copyWith(
                  color: OceanColors.white,
                ),
              ),
              const SizedBox(height: OceanSpacing.xs),
              Text(
                'Enter the tank ID manually to continue.',
                textAlign: TextAlign.center,
                style: OceanTypography.caption.copyWith(
                  color: OceanColors.pearlAqua,
                ),
              ),
              const SizedBox(height: OceanSpacing.sm),
              GlassButton(
                label: 'Enter tank ID',
                compact: true,
                onPressed: onManual,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      container: true,
      label: 'Setup error. $message',
      child: GlassPanel(
        color: OceanColors.critical.withValues(alpha: 0.08),
        borderColor: OceanColors.critical.withValues(alpha: 0.24),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(
              LucideIcons.circleAlert,
              size: 17,
              color: OceanColors.critical,
            ),
            const SizedBox(width: OceanSpacing.xs),
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
