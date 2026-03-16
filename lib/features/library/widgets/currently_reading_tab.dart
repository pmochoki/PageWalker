import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/book_cover_widget.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/gradient_button.dart';

class CurrentlyReadingTab extends StatelessWidget {
  const CurrentlyReadingTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      itemCount: 3,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GlassCard(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                const BookCoverWidget(
                  width: 60,
                  height: 90,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Current read ${index + 1}',
                        style: AppText.bodySemiBold(15),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'By a beloved author',
                        style: AppText.body(
                          13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: 0.3 + index * 0.2,
                          minHeight: 6,
                          backgroundColor: AppColors.darkSurface,
                          valueColor:
                              const AlwaysStoppedAnimation(
                            AppColors.orangePrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                GradientButton(
                  label: 'Update',
                  height: 40,
                  width: 104,
                  onPressed: () {},
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

