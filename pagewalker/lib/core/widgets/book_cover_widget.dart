import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../theme/app_colors.dart';
import '../utils/url_utils.dart';

class BookCoverWidget extends StatelessWidget {
  final String? coverUrl;

  /// Used for initials when the cover image fails to load.
  final String? title;
  final double width;
  final double height;
  final String? heroTag;
  final VoidCallback? onTap;

  const BookCoverWidget({
    super.key,
    this.coverUrl,
    this.title,
    this.width = 100,
    this.height = 150,
    this.heroTag,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget cover = Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 12,
            offset: const Offset(-4, 8),
          ),
          BoxShadow(
            color: AppColors.logoMarkColor(context).withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: coverUrl != null && coverUrl!.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: fixCoverUrl(coverUrl) ?? '',
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  width: width,
                  height: height,
                  color: const Color(0xFF1C1C1C),
                  child: const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.webLogoOrange,
                      strokeWidth: 2,
                    ),
                  ),
                ),
                errorWidget: (context, url, error) =>
                    _coverLoadErrorPlaceholder(context),
              )
            : _placeholder(context),
      ),
    );

    if (heroTag != null) {
      cover = Hero(tag: heroTag!, child: cover);
    }
    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: cover);
    }
    return cover;
  }

  Widget _coverLoadErrorPlaceholder(BuildContext context) {
    final mark = AppColors.logoMarkColor(context);
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: const Color(0xFF1C1C1C),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.book_rounded, color: mark, size: 32),
          const SizedBox(height: 8),
          if (title != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                title!.length > 2
                    ? title!.substring(0, 2).toUpperCase()
                    : title!.toUpperCase(),
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: mark,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _placeholder(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      color: isDark ? AppColors.darkCard : AppColors.lightCard,
      child: Center(
        child: Icon(
          Icons.book,
          color: AppColors.logoMarkColor(context),
          size: 32,
        ),
      ),
    );
  }
}
