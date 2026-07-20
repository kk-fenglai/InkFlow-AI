package com.inkflow.ai.features.studio

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.SignatureBase
import com.inkflow.ai.core.SignatureBases
import com.inkflow.ai.core.Tier
import com.inkflow.ai.core.rememberSignatureFont

/** Preview label — the typed name, or a placeholder before the user types. */
private fun previewWord(text: String): String {
    val t = text.trim()
    if (t.isEmpty()) return "Signature"
    return if (t.length > 10) t.take(10) else t
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TemplateGallery(
    selectedId: String,
    previewText: String,
    filter: Tier?,
    unlocked: Set<String>,
    unlockCost: Int,
    onFilterChange: (Tier?) -> Unit,
    onSelect: (SignatureBase) -> Unit,
    modifier: Modifier = Modifier,
) {
    val bases = SignatureBases.byTier(filter)

    Column(modifier = modifier) {
        Text(
            "Signature Templates",
            style = MaterialTheme.typography.titleLarge,
            color = DesignTokens.Ink,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            "${SignatureBases.freeCount} free · ${SignatureBases.premiumCount} premium " +
                "($unlockCost cr unlock)",
            style = MaterialTheme.typography.labelSmall,
            color = DesignTokens.OnSurfaceVariant,
        )

        Spacer(Modifier.height(12.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(listOf(null, Tier.FREE, Tier.PREMIUM)) { tier ->
                FilterChip(
                    label = when (tier) {
                        null -> "All"
                        Tier.FREE -> "Free"
                        Tier.PREMIUM -> "Premium"
                    },
                    selected = filter == tier,
                    onClick = { onFilterChange(tier) },
                )
            }
        }

        Spacer(Modifier.height(12.dp))
        // A non-lazy flow grid: the whole Studio page owns the scroll, so a
        // nested scrollable never swallows the gesture.
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            maxItemsInEachRow = 2,
        ) {
            bases.forEach { base ->
                TemplateCard(
                    base = base,
                    previewText = previewWord(previewText),
                    selected = base.id == selectedId,
                    locked = base.tier == Tier.PREMIUM && base.id !in unlocked,
                    unlockCost = unlockCost,
                    onClick = { onSelect(base) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun FilterChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        color = if (selected) DesignTokens.Secondary.copy(alpha = 0.12f) else DesignTokens.Background,
        shape = RoundedCornerShape(999.dp),
        border = BorderStroke(
            1.dp,
            if (selected) DesignTokens.Secondary else DesignTokens.OutlineVariant,
        ),
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) DesignTokens.Secondary else DesignTokens.OnSurfaceVariant,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
        )
    }
}

@Composable
private fun TemplateCard(
    base: SignatureBase,
    previewText: String,
    selected: Boolean,
    locked: Boolean,
    unlockCost: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val font = rememberSignatureFont(base.fontFamily)

    Column(modifier = modifier.clickable(onClick = onClick)) {
        Surface(
            color = if (selected) DesignTokens.SurfaceCard else DesignTokens.SurfaceContainerLow,
            shape = RoundedCornerShape(8.dp),
            border = BorderStroke(
                if (selected) 2.dp else 1.dp,
                if (selected) DesignTokens.Ink else DesignTokens.SurfaceContainerHigh,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(3f / 2f),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    previewText,
                    fontFamily = font,
                    fontSize = 30.sp,
                    lineHeight = 38.sp,
                    color = DesignTokens.Ink.copy(alpha = if (locked) 0.45f else 0.9f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 10.dp),
                )

                // Tier badge, top-left.
                Surface(
                    color = if (base.tier == Tier.FREE) {
                        DesignTokens.Background.copy(alpha = 0.9f)
                    } else {
                        DesignTokens.Secondary.copy(alpha = 0.9f)
                    },
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(6.dp),
                ) {
                    Text(
                        if (base.tier == Tier.FREE) "FREE" else "$unlockCost CR",
                        style = MaterialTheme.typography.labelSmall,
                        fontSize = 9.sp,
                        color = if (base.tier == Tier.FREE) {
                            DesignTokens.OnSurfaceVariant
                        } else {
                            DesignTokens.SurfaceCard
                        },
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                    )
                }

                if (locked) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(6.dp)
                            .size(20.dp)
                            .clip(CircleShape)
                            .background(DesignTokens.Ink.copy(alpha = 0.8f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.Lock,
                            contentDescription = "Locked",
                            tint = DesignTokens.SurfaceCard,
                            modifier = Modifier.size(12.dp),
                        )
                    }
                } else if (selected) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(6.dp)
                            .size(20.dp)
                            .clip(CircleShape)
                            .background(DesignTokens.Ink),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Filled.Check,
                            contentDescription = "Selected",
                            tint = DesignTokens.SurfaceCard,
                            modifier = Modifier.size(12.dp),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(6.dp))
        Text(
            base.name,
            style = MaterialTheme.typography.labelMedium,
            color = DesignTokens.OnSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            base.blurb,
            style = MaterialTheme.typography.labelSmall,
            color = DesignTokens.OnSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
