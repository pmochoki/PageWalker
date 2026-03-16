import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/book_cover_widget.dart';
import '../../../core/widgets/glass_card.dart';

class ReadTab extends StatelessWidget {
  const ReadTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      itemCount: 6,
      itemBuilder: (context, index) {
        final tierLabel = switch (index % 4) {
          0 => 'God Tier',
          1 => 'A Class',
          2 => 'B Class',
          _ => 'C Class',
        };
        final tierColor = switch (index % 4) {
          0 => AppColors.tierGod,
          1 => AppColors.tierA,
          2 => AppColors.tierB,
          _ => AppColors.tierC,
        };
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: GlassCard(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Stack(
                  children: [
                    const BookCoverWidget(
                      width: 60,
                      height: 90,
                    ),
                    Positioned(
                      right: 4,
                      top: 4,
                      child: Icon(
                        Icons.star_rounded,
                        size: 20,
                        color: tierColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                    Text(
                      'Finished gem ${index + 1}',
                      style: AppText.bodySemiBold(15, context: context),
                    ),
                      const SizedBox(height: 4),
                      Text(
                        'Placed in $tierLabel',
                        style: AppText.body(
                          13,
                          context: context,
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
}

