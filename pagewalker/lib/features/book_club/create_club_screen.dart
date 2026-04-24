import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/supabase_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/themed_background.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import 'book_club_models.dart';

class CreateClubScreen extends StatefulWidget {
  const CreateClubScreen({super.key});

  @override
  State<CreateClubScreen> createState() => _CreateClubScreenState();
}

class _CreateClubScreenState extends State<CreateClubScreen> {
  final _name = TextEditingController();
  final _description = TextEditingController();
  String _emoji = '📚';
  int _maxMembers = 20;
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final user = SupabaseConfig.client.auth.currentUser;
    if (user == null) return;
    final name = _name.text.trim();
    if (name.isEmpty) return;

    setState(() => _saving = true);
    try {
      final row = await SupabaseConfig.client
          .from('book_clubs')
          .insert({
            'name': name,
            'description': _description.text.trim().isEmpty
                ? null
                : _description.text.trim(),
            'cover_emoji': _emoji,
            'created_by': user.id,
            'max_members': _maxMembers,
          })
          .select()
          .single();

      final club = BookClub.fromSupabase(row);

      await SupabaseConfig.client.from('book_club_members').insert({
        'club_id': club.id,
        'user_id': user.id,
        'role': 'admin',
      });

      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        backgroundColor: Colors.transparent,
        isScrollControlled: true,
        builder: (context) => _InviteCodeSheet(
          club: club,
          onGoToClub: () {
            Navigator.of(context).pop();
            context.go('/clubs/${club.id}');
          },
        ),
      );
      if (mounted) context.pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not create club: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ThemedBackground(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: Colors.transparent,
                elevation: 0,
                leading: IconButton(
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.arrow_back_rounded),
                  color: AppColors.orangePrimary,
                ),
                title: Text(
                  'Create a Club',
                  style: AppText.display(22, context: context),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      GlassCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Club emoji',
                              style: AppText.bodySemiBold(
                                14,
                                color: AppColors.orangePrimary,
                              ),
                            ),
                            const SizedBox(height: 10),
                            _EmojiPicker(
                              selected: _emoji,
                              onSelect: (e) {
                                HapticFeedback.lightImpact();
                                setState(() => _emoji = e);
                              },
                            ),
                            const SizedBox(height: 14),
                            TextField(
                              controller: _name,
                              decoration: const InputDecoration(
                                labelText: 'Club name',
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _description,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText: 'Description (optional)',
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              'Max members',
                              style: AppText.bodySemiBold(
                                14,
                                color: AppColors.orangePrimary,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 10,
                              children: [5, 10, 20].map((v) {
                                final selected = _maxMembers == v;
                                return ChoiceChip(
                                  label: Text('$v'),
                                  selected: selected,
                                  onSelected: (_) =>
                                      setState(() => _maxMembers = v),
                                  selectedColor:
                                      AppColors.orangePrimary.withOpacity(0.4),
                                  labelStyle: AppText.bodySemiBold(
                                    12,
                                    color: selected
                                        ? Colors.white
                                        : AppColors.textSecondary,
                                  ),
                                  shape: StadiumBorder(
                                    side: BorderSide(
                                      color: AppColors.orangePrimary
                                          .withOpacity(0.4),
                                    ),
                                  ),
                                  backgroundColor: AppColors.darkCard,
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ).animate().fadeIn(duration: 420.ms).slideY(begin: 0.08, end: 0),
                      const SizedBox(height: 14),
                      GradientButton(
                        label: 'Create',
                        width: double.infinity,
                        isLoading: _saving,
                        onPressed: _saving ? null : _create,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmojiPicker extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onSelect;
  const _EmojiPicker({required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final emojis = const [
      '📚',
      '✨',
      '🔥',
      '🌙',
      '💘',
      '🗡️',
      '🧁',
      '🕯️',
      '🌿',
      '🧠',
      '🕵️',
      '🏰',
    ];
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: emojis.map((e) {
        final isSelected = e == selected;
        return GestureDetector(
          onTap: () => onSelect(e),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              color: isSelected
                  ? AppColors.orangePrimary.withOpacity(0.25)
                  : AppColors.darkCard,
              border: Border.all(
                color: isSelected
                    ? AppColors.orangePrimary
                    : AppColors.orangePrimary.withOpacity(0.25),
              ),
            ),
            alignment: Alignment.center,
            child: Text(e, style: const TextStyle(fontSize: 22)),
          ),
        );
      }).toList(),
    );
  }
}

class _InviteCodeSheet extends StatelessWidget {
  final BookClub club;
  final VoidCallback onGoToClub;
  const _InviteCodeSheet({
    required this.club,
    required this.onGoToClub,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: GlassCard(
          padding: const EdgeInsets.all(18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Invite code',
                style: AppText.display(18, context: context),
              ),
              const SizedBox(height: 10),
              Text(
                club.inviteCode,
                style: AppText.display(34, context: context).copyWith(
                  color: AppColors.orangePrimary,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 12),
              GradientButton(
                label: 'Share invite code',
                width: double.infinity,
                onPressed: () async {
                  await Clipboard.setData(
                    ClipboardData(text: club.inviteCode),
                  );
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Copied to clipboard')),
                    );
                  }
                },
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: onGoToClub,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.orangePrimary,
                  side: BorderSide(
                    color: AppColors.orangePrimary.withOpacity(0.45),
                  ),
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text('Go to my club'),
              ),
            ],
          ),
        ).animate().slideY(begin: 0.15, end: 0).fadeIn(),
      ),
    );
  }
}

