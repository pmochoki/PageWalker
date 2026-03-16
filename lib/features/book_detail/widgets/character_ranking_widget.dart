import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/glass_card.dart';

class CharacterRankingWidget extends StatefulWidget {
  const CharacterRankingWidget({super.key});

  @override
  State<CharacterRankingWidget> createState() =>
      _CharacterRankingWidgetState();
}

class _CharacterRankingWidgetState
    extends State<CharacterRankingWidget> {
  final List<_CharacterRow> _characters = [
    _CharacterRow('Main disaster', 'unhinged but beloved'),
    _CharacterRow('Love interest', 'brooding and soft'),
    _CharacterRow('Best friend', 'comic relief with depth'),
  ];

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
                'Character Rankings',
                style: AppText.bodySemiBold(14),
              ),
              IconButton(
                onPressed: () {
                  setState(() {
                    _characters.add(
                      _CharacterRow(
                        'New character',
                        '',
                      ),
                    );
                  });
                },
                icon: const Icon(
                  Icons.add_rounded,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ReorderableListView.builder(
            shrinkWrap: true,
            physics:
                const NeverScrollableScrollPhysics(),
            itemCount: _characters.length,
            onReorder: (oldIndex, newIndex) {
              setState(() {
                if (newIndex > oldIndex) {
                  newIndex -= 1;
                }
                final item =
                    _characters.removeAt(oldIndex);
                _characters.insert(newIndex, item);
              });
            },
            itemBuilder: (context, index) {
              final character = _characters[index];
              return Padding(
                key: ValueKey(character.name),
                padding: const EdgeInsets.symmetric(
                  vertical: 4,
                ),
                child: GlassCard(
                  borderRadius: 12,
                  padding: const EdgeInsets.all(10),
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
                        child: Column(
                          crossAxisAlignment:
                              CrossAxisAlignment.start,
                          children: [
                            Text(
                              character.name,
                              style:
                                  AppText.bodySemiBold(13),
                            ),
                            if (character.note.isNotEmpty)
                              Text(
                                character.note,
                                style: AppText.body(
                                  12,
                                  context: context,
                                ),
                              ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _characters
                                .removeAt(index);
                          });
                        },
                        icon: const Icon(
                          Icons.close,
                          size: 18,
                          color: AppColors.darkTextMuted,
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

class _CharacterRow {
  final String name;
  final String note;

  _CharacterRow(this.name, this.note);
}

