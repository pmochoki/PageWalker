class BookClub {
  final String id;
  final String name;
  final String? description;
  final String coverEmoji;
  final String? currentBookId;
  final String inviteCode;
  final int maxMembers;

  const BookClub({
    required this.id,
    required this.name,
    required this.description,
    required this.coverEmoji,
    required this.currentBookId,
    required this.inviteCode,
    required this.maxMembers,
  });

  factory BookClub.fromSupabase(Map<String, dynamic> json) {
    return BookClub(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Book Club',
      description: json['description'] as String?,
      coverEmoji: (json['cover_emoji'] as String?) ?? '📚',
      currentBookId: json['current_book_id'] as String?,
      inviteCode: (json['invite_code'] as String?) ?? '',
      maxMembers: (json['max_members'] as int?) ?? 20,
    );
  }
}

class ClubMessage {
  final String id;
  final String clubId;
  final String userId;
  final String content;
  final String messageType;
  final bool containsSpoiler;
  final int? chapterRef;
  final DateTime createdAt;

  const ClubMessage({
    required this.id,
    required this.clubId,
    required this.userId,
    required this.content,
    required this.messageType,
    required this.containsSpoiler,
    required this.chapterRef,
    required this.createdAt,
  });

  factory ClubMessage.fromSupabase(Map<String, dynamic> json) {
    return ClubMessage(
      id: json['id'] as String,
      clubId: json['club_id'] as String,
      userId: json['user_id'] as String,
      content: json['content'] as String? ?? '',
      messageType: json['message_type'] as String? ?? 'text',
      containsSpoiler: json['contains_spoiler'] as bool? ?? false,
      chapterRef: json['chapter_ref'] as int?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

class ClubPoll {
  final String id;
  final String clubId;
  final String question;
  final DateTime? endsAt;

  const ClubPoll({
    required this.id,
    required this.clubId,
    required this.question,
    required this.endsAt,
  });

  factory ClubPoll.fromSupabase(Map<String, dynamic> json) {
    return ClubPoll(
      id: json['id'] as String,
      clubId: json['club_id'] as String,
      question: json['question'] as String? ?? 'What should we read next?',
      endsAt: json['ends_at'] != null
          ? DateTime.parse(json['ends_at'] as String)
          : null,
    );
  }
}

class ClubPollOption {
  final String id;
  final String pollId;
  final String label;
  final String? bookId;

  const ClubPollOption({
    required this.id,
    required this.pollId,
    required this.label,
    required this.bookId,
  });

  factory ClubPollOption.fromSupabase(Map<String, dynamic> json) {
    return ClubPollOption(
      id: json['id'] as String,
      pollId: json['poll_id'] as String,
      label: json['label'] as String? ?? '',
      bookId: json['book_id'] as String?,
    );
  }
}

