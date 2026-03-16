import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ─── DARK MODE (Black + Orange) ───────────────────────────
  static const Color darkBg = Color(0xFF0A0A0A);
  static const Color darkSurface = Color(0xFF141414);
  static const Color darkCard = Color(0xFF1C1C1C);
  static const Color darkGlass = Color(0x14FFFFFF);
  static const Color darkBorder = Color(0x30FF6B1A);

  // ─── LIGHT MODE (White + Orange) ──────────────────────────
  static const Color lightBg = Color(0xFFFFFBF7);
  static const Color lightSurface = Color(0xFFFFF3E8);
  static const Color lightCard = Color(0xFFFFEDD5);
  static const Color lightGlass = Color(0x18FF6B1A);
  static const Color lightBorder = Color(0x40FF6B1A);

  // ─── ORANGE BRAND (same in both modes) ────────────────────
  static const Color orangePrimary = Color(0xFFFF6B1A); // Main orange
  static const Color orangeBright = Color(0xFFFF8C42); // Lighter orange
  static const Color orangeDeep = Color(0xFFE04E00); // Deep burnt orange
  static const Color orangeGlow = Color(0xFFFFAA55); // Soft glow orange
  static const Color orangeEmber = Color(0xFFFF4500); // Ember red-orange
  static const Color orangeAmber = Color(0xFFFFB347); // Amber gold

  // ─── TEXT ──────────────────────────────────────────────────
  static const Color darkTextPrimary = Color(0xFFF5F0EB);
  static const Color darkTextSecondary = Color(0xFFB8956A);
  static const Color darkTextMuted = Color(0xFF6B5040);
  static const Color lightTextPrimary = Color(0xFF1A0A00);
  static const Color lightTextSecondary = Color(0xFF7A4020);
  static const Color lightTextMuted = Color(0xFFB07040);

  // ─── GRADIENTS ─────────────────────────────────────────────
  static const List<Color> gradientOrange = [
    Color(0xFFFF6B1A),
    Color(0xFFFF8C42),
  ];
  static const List<Color> gradientEmber = [
    Color(0xFFFF4500),
    Color(0xFFFF6B1A),
  ];
  static const List<Color> gradientAmber = [
    Color(0xFFFF8C42),
    Color(0xFFFFB347),
  ];
  static const List<Color> gradientDark = [
    Color(0xFF1A0A00),
    Color(0xFF0A0A0A),
  ];
  static const List<Color> gradientLight = [
    Color(0xFFFFFBF7),
    Color(0xFFFFF3E8),
  ];

  // ─── SKY COLOURS per time of day ──────────────────────────
  // These are used by the DynamicSkyBackground widget

  // Night (00:00 – 04:59)
  static const List<Color> skyNight = [
    Color(0xFF000008),
    Color(0xFF05051A),
    Color(0xFF0A0820),
  ];

  // Pre-dawn (05:00 – 05:59)
  static const List<Color> skyPreDawn = [
    Color(0xFF0A0820),
    Color(0xFF1A0A10),
    Color(0xFF2D0A05),
  ];

  // Sunrise (06:00 – 07:29)
  static const List<Color> skySunrise = [
    Color(0xFF1A0500),
    Color(0xFFB03010),
    Color(0xFFFF6B1A),
    Color(0xFFFFB347),
    Color(0xFFFFD580),
  ];

  // Morning (07:30 – 10:59)
  static const List<Color> skyMorning = [
    Color(0xFFFF8C42),
    Color(0xFFFFB347),
    Color(0xFFFFD9A0),
    Color(0xFFFFF0D0),
  ];

  // Midday (11:00 – 13:59)
  static const List<Color> skyMidday = [
    Color(0xFFFFF8F0),
    Color(0xFFFFE8C0),
    Color(0xFFFFCC80),
  ];

  // Afternoon (14:00 – 16:29)
  static const List<Color> skyAfternoon = [
    Color(0xFFFFCC80),
    Color(0xFFFFAA55),
    Color(0xFFFF8C42),
  ];

  // Golden hour (16:30 – 18:29)
  static const List<Color> skyGoldenHour = [
    Color(0xFF2A0800),
    Color(0xFFCC3300),
    Color(0xFFFF6B1A),
    Color(0xFFFF9933),
    Color(0xFFFFCC44),
  ];

  // Sunset (18:30 – 19:59)
  static const List<Color> skySunset = [
    Color(0xFF0A0500),
    Color(0xFF6B1A00),
    Color(0xFFCC3300),
    Color(0xFFFF6B1A),
    Color(0xFFFFAA33),
  ];

  // Dusk (20:00 – 21:29)
  static const List<Color> skyDusk = [
    Color(0xFF050205),
    Color(0xFF1A0810),
    Color(0xFF3D1500),
    Color(0xFF8B3500),
  ];

  // Evening (21:30 – 23:59)
  static const List<Color> skyEvening = [
    Color(0xFF000005),
    Color(0xFF0A0510),
    Color(0xFF1A0800),
    Color(0xFF2D1000),
  ];

  // Tier colours (repurposed into warm gold/orange accents)
  static const Color tierGod = orangeAmber;
  static const Color tierA = orangePrimary;
  static const Color tierB = orangeBright;
  static const Color tierC = darkTextMuted;
}

