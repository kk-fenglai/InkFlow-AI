package com.inkflow.ai.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.outlined.Gesture
import androidx.compose.material.icons.outlined.Toll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import com.inkflow.ai.core.DesignTokens

/** Brand top bar — scribble mark + serif wordmark over a hairline divider. */
@Composable
fun BrandTopBar(title: String = "InkFlow AI") {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(DesignTokens.Background)
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Outlined.Gesture,
                contentDescription = null,
                tint = DesignTokens.Ink,
                modifier = Modifier.size(26.dp),
            )
            Spacer(Modifier.width(10.dp))
            Text(
                title,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Ink,
            )
        }
        HorizontalDivider(color = DesignTokens.SurfaceContainerHigh, thickness = 1.dp)
    }
}

/**
 * App bar for the signed-in tabs — mirrors the website header: wordmark on the
 * left, credits pill and account avatar on the right.
 */
@Composable
fun AppTopBar(credits: Int?) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(DesignTokens.Background)
                .padding(start = 20.dp, end = 12.dp, top = 10.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Outlined.Gesture,
                contentDescription = null,
                tint = DesignTokens.Ink,
                modifier = Modifier.size(24.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                "InkFlow AI",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Ink,
                modifier = Modifier.weight(1f),
            )

            if (credits != null) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(DesignTokens.SurfaceContainerLow)
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.Toll,
                        contentDescription = null,
                        tint = DesignTokens.Secondary,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "$credits cr",
                        style = MaterialTheme.typography.labelMedium,
                        color = DesignTokens.OnSurface,
                    )
                }
            }
        }
        HorizontalDivider(color = DesignTokens.SurfaceContainerHigh, thickness = 1.dp)
    }
}

/** Back-arrow top bar for pushed detail routes. */
@Composable
fun DetailTopBar(title: String, onBack: () -> Unit) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(DesignTokens.Background)
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = DesignTokens.Ink,
                )
            }
            Text(
                title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Ink,
            )
        }
        HorizontalDivider(color = DesignTokens.SurfaceContainerHigh, thickness = 1.dp)
    }
}

/** White paper card with a hairline border — no shadow, per the tonal-layer system. */
@Composable
fun InkCard(
    modifier: Modifier = Modifier,
    containerColor: Color = DesignTokens.SurfaceCard,
    contentPadding: androidx.compose.foundation.layout.PaddingValues =
        androidx.compose.foundation.layout.PaddingValues(20.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier,
        color = containerColor,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, DesignTokens.SurfaceContainerHigh),
    ) {
        Column(modifier = Modifier.padding(contentPadding), content = content)
    }
}

/** Inter field label with editorial letter spacing. */
@Composable
fun FieldLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = DesignTokens.OnSurface,
        modifier = modifier,
    )
}

@Composable
fun InkTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    leadingIcon: ImageVector? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    singleLine: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        placeholder = placeholder?.let {
            {
                Text(it, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Outline)
            }
        },
        leadingIcon = leadingIcon?.let {
            { Icon(it, contentDescription = null, tint = DesignTokens.OnSurfaceVariant) }
        },
        trailingIcon = trailingIcon,
        singleLine = singleLine,
        keyboardOptions = keyboardOptions,
        visualTransformation = visualTransformation,
        textStyle = MaterialTheme.typography.bodyLarge,
        shape = RoundedCornerShape(6.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = DesignTokens.SurfaceCard,
            unfocusedContainerColor = DesignTokens.SurfaceCard,
            focusedBorderColor = DesignTokens.Ink,
            unfocusedBorderColor = DesignTokens.OutlineVariant,
            cursorColor = DesignTokens.Ink,
        ),
    )
}

/** Solid ink primary button, 4-6dp radius, Inter label. */
@Composable
fun InkPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    leadingIcon: ImageVector? = null,
    showArrow: Boolean = false,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.height(52.dp),
        shape = RoundedCornerShape(6.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = DesignTokens.Ink,
            contentColor = Color.White,
            disabledContainerColor = DesignTokens.SurfaceContainerHigh,
            disabledContentColor = DesignTokens.Outline,
        ),
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = Color.White,
                strokeWidth = 2.dp,
            )
        } else {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
            ) {
                leadingIcon?.let {
                    Icon(it, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                }
                Text(text, style = MaterialTheme.typography.labelLarge)
                if (showArrow) {
                    Spacer(Modifier.width(8.dp))
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}

/** 1px ink outline button, no fill. */
@Composable
fun InkOutlinedButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    contentColor: Color = DesignTokens.Ink,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(48.dp),
        shape = RoundedCornerShape(6.dp),
        border = BorderStroke(1.dp, if (enabled) contentColor else DesignTokens.OutlineVariant),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = contentColor),
    ) {
        Text(text, style = MaterialTheme.typography.labelLarge)
    }
}

/** Small rectangular chip — light earth wash + Inter caps, per the design's tag spec. */
@Composable
fun InkChip(text: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .background(
                DesignTokens.Secondary.copy(alpha = 0.10f),
                RoundedCornerShape(4.dp),
            )
            .padding(horizontal = 10.dp, vertical = 5.dp),
    ) {
        Text(
            text.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = DesignTokens.Secondary,
        )
    }
}

/** Inline error text in the design's error red. */
@Composable
fun ErrorText(message: String, modifier: Modifier = Modifier) {
    Text(
        message,
        style = MaterialTheme.typography.bodySmall,
        color = DesignTokens.Error,
        modifier = modifier,
    )
}
