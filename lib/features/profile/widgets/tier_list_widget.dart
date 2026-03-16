import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/glass_card.dart';

class TierListWidget extends StatelessWidget {
  final String title;
  final List<String> books;

  const TierListWidget({
    super.key,
    required this.title,
    required this.books,
  });

  @override
  Widget build(BuildContext context) {
    return ExpansionTile(
      tilePadding: EdgeInsets.zero,
      title: Text(
        title,
        style: AppText.bodySemiBold(14, context: context),
      ),
      children: [
        GlassCard(
          padding: const EdgeInsets.all(10),
          child: Column(
            children: books
                .map(
                  (b) => Row(
                    children: [
                      const Icon(
                        Icons.drag_handle_rounded,
                        color: AppColors.darkTextMuted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        b,
                        style: AppText.body(13),
                      ),
                    ],
                  ),
                )
                .toList(),
          ),
        ),
      ],
    );
  }
}

