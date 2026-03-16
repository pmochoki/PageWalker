import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/glass_card.dart';

class SeriesRankingWidget extends StatefulWidget {
  const SeriesRankingWidget({super.key});

  @override
  State<SeriesRankingWidget> createState() =>
      _SeriesRankingWidgetState();
}

class _SeriesRankingWidgetState
    extends State<SeriesRankingWidget> {
  final List<String> _series = [
    'Book One',
    'Book Two',
    'Book Three',
  ];

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Series Rankings',
            style: AppText.bodySemiBold(14),
          ),
          const SizedBox(height: 8),
          ReorderableListView.builder(
            shrinkWrap: true,
            physics:
                const NeverScrollableScrollPhysics(),
            itemCount: _series.length,
            onReorder: (oldIndex, newIndex) {
              setState(() {
                if (newIndex > oldIndex) {
                  newIndex -= 1;
                }
                final item = _series.removeAt(oldIndex);
                _series.insert(newIndex, item);
              });
            },
            itemBuilder: (context, index) {
              return Padding(
                key: ValueKey(_series[index]),
                padding: const EdgeInsets.symmetric(
                  vertical: 4,
                ),
                    child: GlassCard(
                  borderRadius: 12,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      ReorderableDragStartListener(
                        index: index,
                        child: const Icon(
                          Icons.drag_handle_rounded,
                              color: AppColors.darkTextMuted,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _series[index],
                          style: AppText.bodySemiBold(13),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

