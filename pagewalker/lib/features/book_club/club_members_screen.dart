import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/supabase_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/themed_background.dart';
import '../../core/widgets/glass_card.dart';

class ClubMembersScreen extends StatefulWidget {
  final String clubId;
  const ClubMembersScreen({super.key, required this.clubId});

  @override
  State<ClubMembersScreen> createState() => _ClubMembersScreenState();
}

class _ClubMembersScreenState extends State<ClubMembersScreen> {
  Future<List<Map<String, dynamic>>> _load() async {
    final rows = await SupabaseConfig.client
        .from('book_club_members')
        .select('user_id, role, joined_at')
        .eq('club_id', widget.clubId)
        .order('joined_at', ascending: true);
    return (rows as List).cast<Map<String, dynamic>>();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ThemedBackground(
        child: SafeArea(
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _load(),
            builder: (context, snapshot) {
              final members = snapshot.data ?? const <Map<String, dynamic>>[];
              return CustomScrollView(
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
                      'Members',
                      style: AppText.display(22, context: context),
                    ),
                  ),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const SliverFillRemaining(
                      child: Center(
                        child: CircularProgressIndicator(
                          color: AppColors.orangePrimary,
                        ),
                      ),
                    )
                  else
                    SliverList.builder(
                      itemCount: members.length,
                      itemBuilder: (context, i) {
                        final m = members[i];
                        return Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
                          child: GlassCard(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Container(
                                  width: 34,
                                  height: 34,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: LinearGradient(
                                      colors: AppColors.gradientOrange,
                                    ),
                                  ),
                                  alignment: Alignment.center,
                                  child: const Text(
                                    '✦',
                                    style: TextStyle(color: Colors.white),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    (m['user_id'] as String).substring(0, 8),
                                    style: AppText.bodySemiBold(14, context: context),
                                  ),
                                ),
                                Text(
                                  (m['role'] as String?) ?? 'member',
                                  style: AppText.body(
                                    12,
                                    context: context,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          )
                              .animate()
                              .fadeIn(delay: (i * 60).ms, duration: 380.ms)
                              .slideY(begin: 0.08, end: 0),
                        );
                      },
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

