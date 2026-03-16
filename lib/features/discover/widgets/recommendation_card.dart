import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/book_cover_widget.dart';
import '../../../core/widgets/glass_card.dart';

class RecommendationCard extends StatelessWidget {
  final String title;
  final String author;
  final String reason;

  const RecommendationCard({
    super.key,
    required this.title,
    required this.author,
    required this.reason,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          const BookCoverWidget(
            width: 60,
            height: 90,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppText.bodySemiBold(15, context: context),
                ),
                const SizedBox(height: 2),
                Text(
                  author,
                  style: AppText.body(
                    12,
                    context: context,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  reason,
                  style: AppText.displayItalic(13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

