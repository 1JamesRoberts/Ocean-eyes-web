import 'package:flutter/material.dart';

import '../../core/theme/oceaneyes_tokens.dart';

/// Blocking startup state for a release whose production composition failed.
class StartupErrorScreen extends StatelessWidget {
  const StartupErrorScreen({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: OceanColors.prussianBlue,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(OceanSpacing.xl),
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                maxWidth: OceanGeometry.referenceWidth,
              ),
              child: Container(
                padding: const EdgeInsets.all(OceanSpacing.xl),
                decoration: BoxDecoration(
                  color: OceanColors.azureMist,
                  borderRadius: BorderRadius.circular(OceanRadii.card),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 32,
                      color: OceanColors.critical,
                    ),
                    const SizedBox(height: OceanSpacing.md),
                    Text(
                      'OceanEyes could not start',
                      style: OceanTypography.section.copyWith(
                        fontSize: 22,
                        color: OceanColors.ink,
                      ),
                    ),
                    const SizedBox(height: OceanSpacing.sm),
                    Text(
                      'The production configuration is missing or '
                      'invalid.',
                      style: OceanTypography.bodyMuted,
                    ),
                    const SizedBox(height: OceanSpacing.md),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(OceanSpacing.md),
                      decoration: BoxDecoration(
                        color: OceanColors.critical.withValues(alpha: 0.08),
                        border: Border.all(
                          color: OceanColors.critical.withValues(alpha: 0.28),
                        ),
                        borderRadius: BorderRadius.circular(OceanRadii.inline),
                      ),
                      child: Text(message, style: OceanTypography.body),
                    ),
                    const SizedBox(height: OceanSpacing.md),
                    Text(
                      'Build the customer app with the private production '
                      'configuration file. The local development preview '
                      'does not require Firebase credentials.',
                      style: OceanTypography.caption,
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
