import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/supabase_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text.dart';
import '../../core/widgets/themed_background.dart';
import '../../core/widgets/glass_card.dart';
import 'book_club_models.dart';
import 'club_poll_widget.dart';

class ClubChatScreen extends StatefulWidget {
  final String clubId;
  const ClubChatScreen({super.key, required this.clubId});

  @override
  State<ClubChatScreen> createState() => _ClubChatScreenState();
}

class _ClubChatScreenState extends State<ClubChatScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();

  bool _spoiler = false;
  int? _chapterRef;
  bool _loading = true;

  RealtimeChannel? _channel;
  final _messages = <ClubMessage>[];

  @override
  void initState() {
    super.initState();
    _loadInitial();
    _subscribe();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    if (_channel != null) {
      SupabaseConfig.client.removeChannel(_channel!);
    }
    super.dispose();
  }

  Future<void> _loadInitial() async {
    try {
      final rows = await SupabaseConfig.client
          .from('book_club_messages')
          .select()
          .eq('club_id', widget.clubId)
          .order('created_at', ascending: true)
          .limit(200);
      final list = (rows as List)
          .cast<Map<String, dynamic>>()
          .map(ClubMessage.fromSupabase)
          .toList();
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(list);
        _loading = false;
      });
      _jumpToBottomSoon();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not load chat: $e')),
      );
    }
  }

  void _subscribe() {
    _channel = SupabaseConfig.client
        .channel('club_${widget.clubId}')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'book_club_messages',
          callback: (payload) {
            final record = payload.newRecord;
            final clubId = record['club_id'];
            if (clubId != widget.clubId) return;
            final msg = ClubMessage.fromSupabase(record);
            if (!mounted) return;
            setState(() => _messages.add(msg));
            _jumpToBottomSoon();
            HapticFeedback.lightImpact();
          },
        )
        .subscribe();
  }

  void _jumpToBottomSoon() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
      );
    });
  }

  Future<void> _send({String? messageType, String? contentOverride}) async {
    final user = SupabaseConfig.client.auth.currentUser;
    if (user == null) return;

    final content = (contentOverride ?? _controller.text).trim();
    if (content.isEmpty) return;
    _controller.clear();

    try {
      await SupabaseConfig.client.from('book_club_messages').insert({
        'club_id': widget.clubId,
        'user_id': user.id,
        'content': content,
        'message_type': messageType ?? 'text',
        'contains_spoiler': _spoiler,
        'chapter_ref': _chapterRef,
      });
      setState(() {
        _spoiler = false;
        _chapterRef = null;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not send: $e')),
      );
    }
  }

  Future<void> _openPoll() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => ClubPollCreationSheet(clubId: widget.clubId),
    );
    if (created == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Poll created')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ThemedBackground(
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded),
                      color: AppColors.orangePrimary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Discussion',
                      style: AppText.display(18, context: context),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: _openPoll,
                      icon: const Icon(Icons.poll_rounded),
                      color: AppColors.orangePrimary,
                      tooltip: 'Start poll',
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.orangePrimary,
                        ),
                      )
                    : ListView.builder(
                        controller: _scroll,
                        padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
                        itemCount: _messages.length,
                        itemBuilder: (context, i) {
                          final m = _messages[i];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _MessageBubble(message: m),
                          ).animate().fadeIn(duration: 220.ms).slideY(begin: 0.08, end: 0);
                        },
                      ),
              ),
              _InputBar(
                controller: _controller,
                spoiler: _spoiler,
                chapterRef: _chapterRef,
                onToggleSpoiler: () => setState(() => _spoiler = !_spoiler),
                onPickChapter: () async {
                  final result = await showDialog<int?>(
                    context: context,
                    builder: (_) {
                      final c = TextEditingController();
                      return AlertDialog(
                        backgroundColor: AppColors.darkCard,
                        title: Text(
                          'Chapter reference',
                          style: AppText.display(16, context: context),
                        ),
                        content: TextField(
                          controller: c,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(hintText: 'e.g. 12'),
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(null),
                            child: const Text('Cancel'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(
                              int.tryParse(c.text.trim()),
                            ),
                            child: const Text('Set'),
                          ),
                        ],
                      );
                    },
                  );
                  if (!mounted) return;
                  setState(() => _chapterRef = result);
                },
                onSend: () => _send(),
                onLongPressSend: _openPoll,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MessageBubble extends StatefulWidget {
  final ClubMessage message;
  const _MessageBubble({required this.message});

  @override
  State<_MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<_MessageBubble> {
  bool _revealed = false;

  @override
  Widget build(BuildContext context) {
    final m = widget.message;
    final showSpoiler = m.containsSpoiler && !_revealed;

    Widget content;
    if (m.messageType == 'poll') {
      content = _PollMessageCard(pollId: m.content);
    } else if (m.messageType == 'progress_update') {
      content = Text(
        m.content,
        style: AppText.bodySemiBold(13, context: context),
      );
    } else {
      content = Text(
        m.content,
        style: AppText.body(13, context: context),
      );
    }

    return GestureDetector(
      onTap: showSpoiler ? () => setState(() => _revealed = true) : null,
      child: GlassCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(colors: AppColors.gradientOrange),
                  ),
                  alignment: Alignment.center,
                  child: const Text('✦', style: TextStyle(color: Colors.white, fontSize: 12)),
                ),
                const SizedBox(width: 8),
                Text(
                  m.userId.substring(0, 6),
                  style: AppText.bodySemiBold(12, context: context, color: AppColors.orangePrimary),
                ),
                const Spacer(),
                if (m.chapterRef != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color: Colors.white.withOpacity(0.05),
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                    ),
                    child: Text(
                      'Ch. ${m.chapterRef}',
                      style: AppText.body(10, context: context, color: Colors.white.withOpacity(0.7)),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            if (showSpoiler)
              Stack(
                children: [
                  ImageFiltered(
                    imageFilter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                    child: Opacity(opacity: 0.75, child: content),
                  ),
                  Positioned.fill(
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(999),
                          color: Colors.black.withOpacity(0.35),
                          border: Border.all(color: Colors.white.withOpacity(0.08)),
                        ),
                        child: Text(
                          'Spoiler — tap to reveal',
                          style: AppText.bodySemiBold(12, context: context, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                ],
              )
            else
              content,
          ],
        ),
      ),
    );
  }
}

class _PollMessageCard extends StatefulWidget {
  final String pollId;
  const _PollMessageCard({required this.pollId});

  @override
  State<_PollMessageCard> createState() => _PollMessageCardState();
}

class _PollMessageCardState extends State<_PollMessageCard> {
  ClubPoll? _poll;
  List<ClubPollOption> _options = [];
  Map<String, int> _voteCounts = {};
  String? _myOptionId;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = SupabaseConfig.client.auth.currentUser;
    try {
      final pollRow = await SupabaseConfig.client
          .from('book_club_polls')
          .select()
          .eq('id', widget.pollId)
          .single();
      final poll = ClubPoll.fromSupabase(pollRow);
      final optionRows = await SupabaseConfig.client
          .from('book_club_poll_options')
          .select()
          .eq('poll_id', widget.pollId);
      final options = (optionRows as List)
          .cast<Map<String, dynamic>>()
          .map(ClubPollOption.fromSupabase)
          .toList();

      final votesRows = await SupabaseConfig.client
          .from('book_club_poll_votes')
          .select('option_id, user_id')
          .eq('poll_id', widget.pollId);
      final voteCounts = <String, int>{};
      String? my;
      for (final r in (votesRows as List).cast<Map<String, dynamic>>()) {
        final oid = r['option_id'] as String;
        voteCounts[oid] = (voteCounts[oid] ?? 0) + 1;
        if (user != null && r['user_id'] == user.id) my = oid;
      }

      if (!mounted) return;
      setState(() {
        _poll = poll;
        _options = options;
        _voteCounts = voteCounts;
        _myOptionId = my;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _vote(String optionId) async {
    final user = SupabaseConfig.client.auth.currentUser;
    if (user == null) return;
    try {
      await SupabaseConfig.client.from('book_club_poll_votes').upsert({
        'poll_id': widget.pollId,
        'option_id': optionId,
        'user_id': user.id,
      });
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not vote: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const LinearProgressIndicator(color: AppColors.orangePrimary);
    }
    final poll = _poll;
    if (poll == null) {
      return Text(
        'Poll',
        style: AppText.bodySemiBold(13, context: context),
      );
    }

    final totalVotes = _voteCounts.values.fold<int>(0, (s, v) => s + v);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          poll.question,
          style: AppText.bodySemiBold(13, context: context),
        ),
        const SizedBox(height: 8),
        ..._options.map((o) {
          final count = _voteCounts[o.id] ?? 0;
          final pct = totalVotes == 0 ? 0.0 : count / totalVotes;
          final selected = _myOptionId == o.id;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GestureDetector(
              onTap: () => _vote(o.id),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: selected
                        ? AppColors.orangePrimary
                        : Colors.white.withOpacity(0.08),
                  ),
                  color: Colors.white.withOpacity(0.05),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            o.label,
                            style: AppText.body(12, context: context),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '$count',
                          style: AppText.bodySemiBold(
                            12,
                            context: context,
                            color: AppColors.orangePrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: pct,
                        minHeight: 6,
                        backgroundColor: Colors.white.withOpacity(0.06),
                        valueColor: const AlwaysStoppedAnimation(
                          AppColors.orangePrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        const SizedBox(height: 4),
        Text(
          '$totalVotes votes',
          style: AppText.body(10, context: context, color: Colors.white.withOpacity(0.6)),
        ),
      ],
    );
  }
}

class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool spoiler;
  final int? chapterRef;
  final VoidCallback onToggleSpoiler;
  final VoidCallback onPickChapter;
  final VoidCallback onSend;
  final VoidCallback onLongPressSend;

  const _InputBar({
    required this.controller,
    required this.spoiler,
    required this.chapterRef,
    required this.onToggleSpoiler,
    required this.onPickChapter,
    required this.onSend,
    required this.onLongPressSend,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 6, 12, 12),
        child: GlassCard(
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: onPickChapter,
                icon: const Icon(Icons.bookmark_rounded),
                color: chapterRef == null
                    ? Colors.white.withOpacity(0.55)
                    : AppColors.orangePrimary,
                tooltip: 'Chapter tag',
              ),
              IconButton(
                onPressed: onToggleSpoiler,
                icon: const Icon(Icons.visibility_off_rounded),
                color: spoiler
                    ? AppColors.orangePrimary
                    : Colors.white.withOpacity(0.55),
                tooltip: 'Spoiler',
              ),
              Expanded(
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Share your thoughts...',
                    border: InputBorder.none,
                  ),
                ),
              ),
              GestureDetector(
                onLongPress: onLongPressSend,
                child: IconButton(
                  onPressed: onSend,
                  icon: const Icon(Icons.send_rounded),
                  color: AppColors.orangePrimary,
                  tooltip: 'Send',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

