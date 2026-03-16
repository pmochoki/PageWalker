import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/gradient_button.dart';

class ScrapbookSection extends StatelessWidget {
  const ScrapbookSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'My Scrapbook',
          style: AppText.display(18),
        ),
        const SizedBox(height: 10),
        _QuoteList(
          title: 'Favourite Quotes',
          addLabel: 'Add quote',
        ),
        const SizedBox(height: 12),
        _QuoteList(
          title: 'Favourite Scenes',
          addLabel: 'Add scene',
        ),
        const SizedBox(height: 12),
        GlassCard(
          padding: const EdgeInsets.all(12),
          child: Wrap(
            spacing: 6,
            runSpacing: 6,
            children: const [
              _TagChip(label: 'Found family'),
              _TagChip(label: 'Slow burn'),
              _TagChip(label: 'Rivals to lovers'),
              _TagChip(label: '+ Add trope'),
            ],
          ),
        ),
      ],
    );
  }
}

class _QuoteList extends StatelessWidget {
  final String title;
  final String addLabel;

  const _QuoteList({
    required this.title,
    required this.addLabel,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment:
                MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: AppText.bodySemiBold(14),
              ),
              IconButton(
                onPressed: () {},
                icon: const Icon(
                  Icons.add_rounded,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...List.generate(2, (index) {
            return Dismissible(
              key: ValueKey('$title-$index'),
              direction:
                  DismissDirection.endToStart,
              background: Container(
                alignment: Alignment.centerRight,
                padding:
                    const EdgeInsets.only(right: 16),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.5),
                  borderRadius:
                      BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.delete_outline,
                  color: Colors.white,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: 6,
                ),
                child: GlassCard(
                  padding: const EdgeInsets.all(10),
                  borderRadius: 12,
                  child: Row(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding:
                            const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.darkSurface,
                          borderRadius:
                              BorderRadius.circular(999),
                        ),
                        child: Text(
                          'p.${index * 20 + 5}',
                          style: AppText.body(
                            11,
                            context: context,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'A line that lives rent free in your head and rearranged your brain chemistry.',
                          style: AppText.displayItalic(
                            14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
          const SizedBox(height: 8),
          GradientButton(
            label: addLabel,
            height: 40,
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}

class _TagChip extends StatelessWidget {
  final String label;

  const _TagChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderRadius: 999,
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 6,
      ),
      child: Text(
        label,
        style: AppText.body(
          12,
          context: context,
        ),
      ),
    );
  }
}

