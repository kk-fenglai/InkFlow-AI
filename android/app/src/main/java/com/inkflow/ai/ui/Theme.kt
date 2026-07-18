package com.inkflow.ai.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.inkflow.ai.core.DesignTokens

private val InkFlowColors = lightColorScheme(
    primary = DesignTokens.Ink,
    onPrimary = DesignTokens.Background,
    primaryContainer = DesignTokens.SurfaceContainerHigh,
    onPrimaryContainer = DesignTokens.OnSurface,
    secondary = DesignTokens.Secondary,
    onSecondary = DesignTokens.SurfaceCard,
    secondaryContainer = DesignTokens.SecondaryContainer,
    onSecondaryContainer = DesignTokens.Secondary,
    background = DesignTokens.Background,
    onBackground = DesignTokens.OnSurface,
    surface = DesignTokens.Background,
    onSurface = DesignTokens.OnSurface,
    surfaceVariant = DesignTokens.SurfaceContainerLow,
    onSurfaceVariant = DesignTokens.OnSurfaceVariant,
    outline = DesignTokens.Outline,
    outlineVariant = DesignTokens.OutlineVariant,
    error = DesignTokens.Error,
    errorContainer = DesignTokens.ErrorContainer,
)

private val InkFlowShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(6.dp),
    medium = RoundedCornerShape(8.dp),
    large = RoundedCornerShape(12.dp),
    extraLarge = RoundedCornerShape(16.dp),
)

@Composable
fun InkFlowTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = InkFlowColors,
        typography = InkFlowTypography,
        shapes = InkFlowShapes,
        content = content,
    )
}
