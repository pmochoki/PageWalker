import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/book_cover_widget.dart';
import '../../../core/widgets/glass_card.dart';

class DnfTab extends StatefulWidget {
  const DnfTab({super.key});

  @override
  State<DnfTab> createState() => _DnfTabState();
}

class _DnfTabState extends State<DnfTab> {
  final _maybeReturn = <int, bool>{};

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      itemCount: 4,
      itemBuilder: (context, index) {
        final checked = _maybeReturn[index] ?? false;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: GlassCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const BookCoverWidget(
                      width: 52,
                      height: 78,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                  child: Text(
                    'The one that got away ${index + 1}',
                    style: AppText.bodySemiBold(15, context: context),
                  ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                    child: Text(
                      checked
                          ? 'Maybe we just met at the wrong time.'
                          : 'A dramatic little rant about why this didn’t work out right now.',
                      key: ValueKey(checked),
                      style: AppText.body(
                        13,
                        context: context,
                      ),
                    ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      'Maybe I’ll Return',
                      style: AppText.body(13),
                    ),
                    const SizedBox(width: 6),
                    AnimatedSwitcher(
                      duration:
                          const Duration(milliseconds: 200),
                      transitionBuilder:
                          (child, animation) {
                        return ScaleTransition(
                          scale: animation,
                          child: child,
                        );
                      },
                      child: Switch(
                        key: ValueKey(checked),
                        value: checked,
                        activeColor: AppColors.orangePrimary,
                        onChanged: (v) {
                          setState(() {
                            _maybeReturn[index] = v;
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

