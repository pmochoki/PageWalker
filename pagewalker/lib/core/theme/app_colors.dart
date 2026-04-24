import 'package:flutter/material.dart';

import '../providers/theme_provider.dart';

/// Static palette + [ThemeColors] for the active app theme + light/dark mode.
class AppColors {
  AppColors._();

  // ═══ THEME 1 — CLASSIC ═══
  static const Color classicDarkBg = Color(0xFF0A0A0A);
  static const Color classicDarkSurface = Color(0xFF141414);
  static const Color classicDarkCard = Color(0xFF1C1C1C);
  static const Color classicDarkBorder = Color(0x33FF6B1A);
  static const Color classicDarkTextPrimary = Color(0xFFF5F5F5);
  static const Color classicDarkTextSecondary = Color(0xFFBBBBBB);
  static const Color classicDarkTextMuted = Color(0xFF777777);

  static const Color classicLightBg = Color(0xFFFFFFFF);
  static const Color classicLightSurface = Color(0xFFF5F5F5);
  static const Color classicLightCard = Color(0xFFEEEEEE);
  static const Color classicLightBorder = Color(0x33FF6B1A);
  static const Color classicLightTextPrimary = Color(0xFF0A0A0A);
  static const Color classicLightTextSecondary = Color(0xFF444444);
  static const Color classicLightTextMuted = Color(0xFF888888);

  static const Color classicPrimary = Color(0xFFFF6B1A);
  static const Color classicPrimaryLight = Color(0xFFFF8C42);
  static const Color classicAccent = Color(0xFFFFAA55);

  /// Website `styles.css` `--primary` / `js/pw-theme.js` BRAND_ORANGE — **#ff6b1a** (same as [classicPrimary]).
  static const Color webLogoOrange = classicPrimary;

  /// Website `styles.css` light `--text` / `js/pw-theme.js` LOGO_INK — **#0a0a0a** (same as [classicLightTextPrimary]).
  static const Color webLogoInk = classicLightTextPrimary;

  // ═══ THEME 2 — MIDNIGHT LIBRARY ═══
  static const Color midnightDarkBg = Color(0xFF0A0A14);
  static const Color midnightDarkSurface = Color(0xFF0F0F1E);
  static const Color midnightDarkCard = Color(0xFF161628);
  static const Color midnightDarkBorder = Color(0x33D4AF37);
  static const Color midnightDarkTextPrimary = Color(0xFFF5F0E8);
  static const Color midnightDarkTextSecondary = Color(0xFFB8A898);
  static const Color midnightDarkTextMuted = Color(0xFF6B6055);

  static const Color midnightLightBg = Color(0xFFF8F7FF);
  static const Color midnightLightSurface = Color(0xFFEEEBFF);
  static const Color midnightLightCard = Color(0xFFE4E0FF);
  static const Color midnightLightBorder = Color(0x33D4AF37);
  static const Color midnightLightTextPrimary = Color(0xFF0A0A14);
  static const Color midnightLightTextSecondary = Color(0xFF2A2445);
  static const Color midnightLightTextMuted = Color(0xFF6B6080);

  static const Color midnightPrimary = Color(0xFFD4AF37);
  static const Color midnightPrimaryLight = Color(0xFFE8C84A);
  static const Color midnightAccent = Color(0xFF4A3F8F);

  // ═══ THEME 3 — FOREST RETREAT ═══
  static const Color forestDarkBg = Color(0xFF080F0A);
  static const Color forestDarkSurface = Color(0xFF0D1810);
  static const Color forestDarkCard = Color(0xFF122016);
  static const Color forestDarkBorder = Color(0x33C8861A);
  static const Color forestDarkTextPrimary = Color(0xFFF0F5EC);
  static const Color forestDarkTextSecondary = Color(0xFFAAC4A0);
  static const Color forestDarkTextMuted = Color(0xFF5A7A55);

  static const Color forestLightBg = Color(0xFFF5FAF6);
  static const Color forestLightSurface = Color(0xFFE8F5EB);
  static const Color forestLightCard = Color(0xFFD8EDD8);
  static const Color forestLightBorder = Color(0x33C8861A);
  static const Color forestLightTextPrimary = Color(0xFF0A1A0C);
  static const Color forestLightTextSecondary = Color(0xFF2A4A2C);
  static const Color forestLightTextMuted = Color(0xFF5A7A5C);

  static const Color forestPrimary = Color(0xFFC8861A);
  static const Color forestPrimaryLight = Color(0xFFDFA040);
  static const Color forestAccent = Color(0xFF2D6A30);

  // ═══ UNIVERSAL ═══
  static const Color gold = Color(0xFFFFD700);
  static const Color error = Color(0xFFE53935);
  static const Color success = Color(0xFF43A047);
  static const Color starColor = Color(0xFFFFB300);

  /// Legacy — Classic palette (prefer [ThemeColors] / Theme).
  static const Color darkBg = classicDarkBg;
  static const Color lightBg = classicLightBg;
  static const Color darkSurface = classicDarkSurface;
  static const Color lightSurface = classicLightSurface;
  static const Color darkCard = classicDarkCard;
  static const Color lightCard = classicLightCard;
  static const Color darkGlass = Color(0x14FFFFFF);
  static const Color lightGlass = Color(0x18FF6B1A);
  static const Color darkBorder = classicDarkBorder;
  static const Color lightBorder = classicLightBorder;

  static const Color orangePrimary = classicPrimary;
  static const Color orangeBright = classicPrimaryLight;
  static const Color orangeDeep = Color(0xFFE04E00);
  static const Color orangeGlow = classicAccent;
  static const Color orangeEmber = Color(0xFFFF4500);
  static const Color orangeAmber = Color(0xFFFFB347);

  static const Color darkTextPrimary = classicDarkTextPrimary;
  static const Color darkTextSecondary = classicDarkTextSecondary;
  static const Color darkTextMuted = classicDarkTextMuted;
  static const Color lightTextPrimary = classicLightTextPrimary;
  static const Color lightTextSecondary = classicLightTextSecondary;
  static const Color lightTextMuted = classicLightTextMuted;

  static const List<Color> gradientOrange = [
    classicPrimary,
    classicPrimaryLight
  ];
  static const List<Color> gradientEmber = [Color(0xFFFF4500), classicPrimary];
  static const List<Color> gradientAmber = [classicPrimaryLight, orangeAmber];
  static const List<Color> gradientDark = [Color(0xFF1A0A00), classicDarkBg];
  static const List<Color> gradientLight = [
    Color(0xFFFFFBF7),
    Color(0xFFFFF3E8)
  ];

  static const Color tierGod = orangeAmber;
  static const Color tierA = classicPrimary;
  static const Color tierB = classicPrimaryLight;
  static const Color tierC = darkTextMuted;

  static const Color primary = classicPrimary;
  static const Color secondary = classicPrimaryLight;
  static const Color moonlight = orangeAmber;
  static const Color mystic = orangeDeep;

  static const Color textPrimary = darkTextPrimary;
  static const Color textSecondary = darkTextSecondary;
  static const Color textMuted = darkTextMuted;

  static const Color bgCard = darkCard;
  static const Color bgSurface = darkSurface;

  static List<Color> get gradientButton => gradientOrange;
  static const List<Color> gradientMystic = gradientEmber;

  /// Web header parity: **#ff6b1a** in dark, **#0a0a0a** in light (not [ColorScheme.onSurface], so all app themes match the site).
  static Color logoMarkColor(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return dark ? webLogoOrange : webLogoInk;
  }

  /// Subtle fill behind logo-shaped placeholders (empty covers, etc.).
  static Color logoMarkSurfaceTint(BuildContext context) {
    return logoMarkColor(context).withValues(
      alpha: Theme.of(context).brightness == Brightness.dark ? 0.15 : 0.1,
    );
  }

  /// Ring / badge fill for logo-style initials (PW, profile fallback avatar).
  static List<Color> logoMarkRingGradient(BuildContext context) {
    if (Theme.of(context).brightness == Brightness.dark) {
      return gradientOrange;
    }
    final ink = webLogoInk;
    final hi = Color.lerp(ink, Colors.white, 0.12) ?? ink;
    return [hi, ink];
  }

  static ThemeColors of(
    BuildContext context,
    AppThemeType appTheme,
    ThemeMode mode,
  ) {
    return ThemeColors(appTheme: appTheme, isDark: mode == ThemeMode.dark);
  }
}

/// Resolves semantic colours for the selected [AppThemeType] and light/dark mode.
class ThemeColors {
  final AppThemeType appTheme;
  final bool isDark;

  const ThemeColors({
    required this.appTheme,
    required this.isDark,
  });

  Color get bg {
    switch (appTheme) {
      case AppThemeType.classic:
        return isDark ? AppColors.classicDarkBg : AppColors.classicLightBg;
      case AppThemeType.midnightLibrary:
        return isDark ? AppColors.midnightDarkBg : AppColors.midnightLightBg;
      case AppThemeType.forestRetreat:
        return isDark ? AppColors.forestDarkBg : AppColors.forestLightBg;
    }
  }

  Color get surface {
    switch (appTheme) {
      case AppThemeType.classic:
        return isDark
            ? AppColors.classicDarkSurface
            : AppColors.classicLightSurface;
      case AppThemeType.midnightLibrary:
        return isDark
            ? AppColors.midnightDarkSurface
            : AppColors.midnightLightSurface;
      case AppThemeType.forestRetreat:
        return isDark
            ? AppColors.forestDarkSurface
            : AppColors.forestLightSurface;
    }
  }

  Color get card {
    switch (appTheme) {
      case AppThemeType.classic:
        return isDark ? AppColors.classicDarkCard : AppColors.classicLightCard;
      case AppThemeType.midnightLibrary:
        return isDark
            ? AppColors.midnightDarkCard
            : AppColors.midnightLightCard;
      case AppThemeType.forestRetreat:
        return isDark ? AppColors.forestDarkCard : AppColors.forestLightCard;
    }
  }

  Color get border {
    switch (appTheme) {
      case AppThemeType.classic:
        return isDark
            ? AppColors.classicDarkBorder
            : AppColors.classicLightBorder;
      case AppThemeType.midnightLibrary:
        return isDark
            ? AppColors.midnightDarkBorder
            : AppColors.midnightLightBorder;
      case AppThemeType.forestRetreat:
        return isDark
            ? AppColors.forestDarkBorder
            : AppColors.forestLightBorder;
    }
  }

  Color get textPrimary {
    switch (appTheme) {
      case AppThemeType.classic:
        return isDark
            ? AppColors.classicDarkTextPrimary
            : AppColors.classicLightTextPrimary;
      case AppThemeType.midnightLibrary:
        return isDark
            ? AppColors.midnightDarkTextPrimary
            : AppColors.midnightLightTextPrimary;
      case AppThemeType.forestRetreat:
        return isDark
            ? AppColors.forestDarkTextPrimary
            : AppColors.forestLightTextPrimary;
    }
  }

  Color get textSecondary {
    switch (appTheme) {
      case AppThemeType.classic:
        return isDark
            ? AppColors.classicDarkTextSecondary
            : AppColors.classicLightTextSecondary;
      case AppThemeType.midnightLibrary:
        return isDark
            ? AppColors.midnightDarkTextSecondary
            : AppColors.midnightLightTextSecondary;
      case AppThemeType.forestRetreat:
        return isDark
            ? AppColors.forestDarkTextSecondary
            : AppColors.forestLightTextSecondary;
    }
  }

  Color get textMuted {
    switch (appTheme) {
      case AppThemeType.classic:
        return isDark
            ? AppColors.classicDarkTextMuted
            : AppColors.classicLightTextMuted;
      case AppThemeType.midnightLibrary:
        return isDark
            ? AppColors.midnightDarkTextMuted
            : AppColors.midnightLightTextMuted;
      case AppThemeType.forestRetreat:
        return isDark
            ? AppColors.forestDarkTextMuted
            : AppColors.forestLightTextMuted;
    }
  }

  Color get primary {
    switch (appTheme) {
      case AppThemeType.classic:
        return AppColors.classicPrimary;
      case AppThemeType.midnightLibrary:
        return AppColors.midnightPrimary;
      case AppThemeType.forestRetreat:
        return AppColors.forestPrimary;
    }
  }

  Color get primaryLight {
    switch (appTheme) {
      case AppThemeType.classic:
        return AppColors.classicPrimaryLight;
      case AppThemeType.midnightLibrary:
        return AppColors.midnightPrimaryLight;
      case AppThemeType.forestRetreat:
        return AppColors.forestPrimaryLight;
    }
  }

  Color get accent {
    switch (appTheme) {
      case AppThemeType.classic:
        return AppColors.classicAccent;
      case AppThemeType.midnightLibrary:
        return AppColors.midnightAccent;
      case AppThemeType.forestRetreat:
        return AppColors.forestAccent;
    }
  }

  List<Color> get gradientButton => [primary, primaryLight];

  List<Color> get gradientCard => [
        primary.withValues(alpha: 0.15),
        primaryLight.withValues(alpha: 0.05),
      ];
}
