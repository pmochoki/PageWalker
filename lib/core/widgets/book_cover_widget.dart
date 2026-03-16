import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../theme/app_colors.dart';
import 'shimmer_loader.dart';

class BookCoverWidget extends StatelessWidget {
  final String? coverUrl;
  final double width;
  final double height;
  final String? heroTag;
  final VoidCallback? onTap;

  const BookCoverWidget({
    super.key,
    this.coverUrl,
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
            color: Colors.black.withOpacity(0.5),
            blurRadius: 12,
            offset: const Offset(-4, 8),
          ),
          BoxShadow(
            color: AppColors.orangePrimary.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: coverUrl != null && coverUrl!.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: coverUrl!,
                fit: BoxFit.cover,
                placeholder: (context, url) => ShimmerLoader(
                  width: width,
                  height: height,
                ),
                errorWidget: (context, url, error) => _placeholder(),
              )
            : _placeholder(),
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

  Widget _placeholder() {
    return Container(
      color: AppColors.darkCard,
      child: const Center(
        child: Icon(
          Icons.book,
          color: AppColors.darkTextMuted,
          size: 32,
        ),
      ),
    );
  }
}

