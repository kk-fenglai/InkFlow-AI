package com.inkflow.ai.features.studio

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.SignatureBase
import com.inkflow.ai.core.rememberSignatureFont

/** Larger names need a smaller face to stay on one line. */
private fun previewSize(length: Int): Int = when {
    length <= 8 -> 46
    length <= 12 -> 38
    length <= 18 -> 30
    length <= 26 -> 24
    else -> 19
}

/**
 * Live preview of the typed name in the selected template's face. Costs
 * nothing and updates as the user types or switches template — the paid
 * "Render Final Ink" pass is what produces the stroke artwork further down.
 */
@Composable
fun SignatureHero(
    text: String,
    base: SignatureBase,
    modifier: Modifier = Modifier,
) {
    val name = text.trim()
    val font = rememberSignatureFont(base.fontFamily)

    Surface(
        modifier = modifier,
        color = DesignTokens.SurfaceCard,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, DesignTokens.SurfaceContainerHigh),
    ) {
        Column(Modifier.padding(horizontal = 18.dp, vertical = 16.dp)) {
            Text(
                base.name.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.Secondary,
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(112.dp),
                contentAlignment = Alignment.Center,
            ) {
                if (name.isEmpty()) {
                    Text(
                        "Type a name to preview your signature",
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Outline,
                        textAlign = TextAlign.Center,
                    )
                } else {
                    Text(
                        name,
                        fontFamily = font,
                        fontSize = previewSize(name.length).sp,
                        lineHeight = (previewSize(name.length) + 12).sp,
                        color = DesignTokens.Ink,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            Spacer(Modifier.height(2.dp))
            Text(
                base.blurb,
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.OnSurfaceVariant,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.End,
            )
        }
    }
}
