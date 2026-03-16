import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/glass_card.dart';

class StatsRow extends StatelessWidget {
  final List<(String label, String value)> stats;

  const StatsRow({
    super.key,
    required this.stats,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: stats
          .map(
            (s) => Expanded(
              child: GlassCard(
                padding: const EdgeInsets.symmetric(
                  vertical: 10,
                ),
                margin: const EdgeInsets.symmetric(
                  horizontal: 4,
                ),
                child: Column(
                  children: [
                    Text(
                      s.$2,
                      style: AppText.display(18, context: context),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      s.$1,
                      style: AppText.body(
                        11,
                        context: context,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

