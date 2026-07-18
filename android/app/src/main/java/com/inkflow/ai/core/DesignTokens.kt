package com.inkflow.ai.core

import androidx.compose.ui.graphics.Color

/** Heritage Editorial palette — warm cream paper, deep ink, muted earth accents. */
object DesignTokens {
    val Background = Color(0xFFFFF8F3)
    val SurfaceCard = Color(0xFFFFFFFF)
    val SurfaceContainerLow = Color(0xFFFBF2E8)
    val SurfaceContainer = Color(0xFFF6ECE3)
    val SurfaceContainerHigh = Color(0xFFF0E7DD)

    val Ink = Color(0xFF1A1A1A)
    val OnSurface = Color(0xFF1F1B15)
    val OnSurfaceVariant = Color(0xFF444748)

    val Secondary = Color(0xFF78583C)
    val SecondaryContainer = Color(0xFFFDD2AF)

    val Outline = Color(0xFF747878)
    val OutlineVariant = Color(0xFFC4C7C7)

    val Error = Color(0xFFBA1A1A)
    val ErrorContainer = Color(0xFFFFDAD6)

    /** Alias kept for older call sites; earth accent replaces the old gold tertiary. */
    val Tertiary = Secondary
}
