import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/supabase_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/themed_background.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import 'book_club_models.dart';

class JoinClubScreen extends StatefulWidget {
  const JoinClubScreen({super.key});

  @override
  State<JoinClubScreen> createState() => _JoinClubScreenState();
}

class _JoinClubScreenState extends State<JoinClubScreen> {
  final _code = TextEditingController();
  bool _joining = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    final user = SupabaseConfig.client.auth.currentUser;
    if (user == null) return;
    final code = _code.text.trim();
    if (code.isEmpty) return;

    setState(() => _joining = true);
    try {
      final clubRow = await SupabaseConfig.client
          .from('book_clubs')
          .select()
          .ilike('invite_code', code)
          .single();
      final club = BookClub.fromSupabase(clubRow);

      await SupabaseConfig.client.from('book_club_members').insert({
        'club_id': club.id,
        'user_id': user.id,
        'role': 'member',
      });

      if (!mounted) return;
      context.go('/clubs/${club.id}');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not join: $e')),
      );
    } finally {
      if (mounted) setState(() => _joining = false);
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
                  'Join with Code',
                  style: AppText.display(22, context: context),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: GlassCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Invite code',
                          style: AppText.bodySemiBold(
                            14,
                            color: AppColors.orangePrimary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _code,
                          textCapitalization: TextCapitalization.characters,
                          decoration: const InputDecoration(
                            hintText: 'e.g. A1B2C3D4',
                          ),
                        ),
                        const SizedBox(height: 14),
                        GradientButton(
                          label: 'Join',
                          width: double.infinity,
                          isLoading: _joining,
                          onPressed: _joining ? null : _join,
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 420.ms).slideY(begin: 0.08, end: 0),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

