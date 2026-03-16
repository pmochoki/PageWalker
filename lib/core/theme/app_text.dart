import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

class AppText {
  AppText._();

  static Color _text(BuildContext context, {Color? override}) {
    if (override != null) return override;
    return Theme.of(context).brightness == Brightness.dark
        ? AppColors.darkTextPrimary
        : AppColors.lightTextPrimary;
  }

  static Color _textSecondary(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? AppColors.darkTextSecondary
        : AppColors.lightTextSecondary;
  }

  static TextStyle display(
    double size, {
    Color? color,
    BuildContext? context,
  }) =>
      GoogleFonts.cormorantGaramond(
        fontSize: size,
        fontWeight: FontWeight.w700,
        color: color ?? (context != null ? _text(context) : AppColors.darkTextPrimary),
        letterSpacing: 0.5,
      );

  static TextStyle displayItalic(
    double size, {
    Color? color,
    BuildContext? context,
  }) =>
      GoogleFonts.cormorantGaramond(
        fontSize: size,
        fontWeight: FontWeight.w500,
        fontStyle: FontStyle.italic,
        color:
            color ?? (context != null ? _textSecondary(context) : AppColors.darkTextSecondary),
        letterSpacing: 0.3,
      );

  static TextStyle script(double size, {Color? color}) =>
      GoogleFonts.dancingScript(
        fontSize: size,
        fontWeight: FontWeight.w700,
        color: color ?? AppColors.orangePrimary,
      );

  static TextStyle body(
    double size, {
    Color? color,
    BuildContext? context,
  }) =>
      GoogleFonts.nunito(
        fontSize: size,
        fontWeight: FontWeight.w400,
        color: color ?? (context != null ? _text(context) : AppColors.darkTextPrimary),
      );

  static TextStyle bodySemiBold(
    double size, {
    Color? color,
    BuildContext? context,
  }) =>
      GoogleFonts.nunito(
        fontSize: size,
        fontWeight: FontWeight.w600,
        color: color ?? (context != null ? _text(context) : AppColors.darkTextPrimary),
      );

  static TextStyle bodyBold(
    double size, {
    Color? color,
    BuildContext? context,
  }) =>
      GoogleFonts.nunito(
        fontSize: size,
        fontWeight: FontWeight.w700,
        color: color ?? (context != null ? _text(context) : AppColors.darkTextPrimary),
      );

  static TextStyle label(
    double size, {
    Color? color,
    BuildContext? context,
  }) =>
      GoogleFonts.nunito(
        fontSize: size,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.8,
        color: color ?? (context != null ? _textSecondary(context) : AppColors.darkTextSecondary),
      );
}

