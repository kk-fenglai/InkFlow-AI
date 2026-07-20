package com.inkflow.ai.core

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily

/**
 * Template preview faces. The 50 Google Fonts the website uses are bundled
 * under `assets/fonts/`, keyed by a slug derived from the family name, so
 * previews render offline and match the web studio exactly.
 */
fun fontSlug(family: String): String =
    family.lowercase().replace(' ', '_')

@Composable
fun rememberSignatureFont(family: String): FontFamily {
    val assets = LocalContext.current.assets
    return remember(family) {
        runCatching {
            FontFamily(Font(path = "fonts/${fontSlug(family)}.ttf", assetManager = assets))
        }.getOrDefault(FontFamily.Cursive)
    }
}
