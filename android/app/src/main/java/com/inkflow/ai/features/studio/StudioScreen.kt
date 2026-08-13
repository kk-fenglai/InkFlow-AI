package com.inkflow.ai.features.studio

import android.content.Intent
import android.graphics.Bitmap
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.outlined.HistoryEdu
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.ShowcaseBackgrounds
import com.inkflow.ai.core.SignatureBases
import com.inkflow.ai.core.SignatureSettingsDto
import com.inkflow.ai.core.StudioState
import com.inkflow.ai.core.Tier
import com.inkflow.ai.core.decodeShowcaseUpload
import com.inkflow.ai.core.renderSignatureFontBitmap
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.FieldLabel
import com.inkflow.ai.ui.InkCard
import com.inkflow.ai.ui.InkChip
import com.inkflow.ai.ui.InkOutlinedButton
import com.inkflow.ai.ui.InkPrimaryButton
import com.inkflow.ai.ui.InkTextField
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudioScreen(
    state: StudioState,
    authStore: AuthStore,
    apiClient: ApiClient,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Delegated to the hoisted holder so the work in progress survives a tab
    // switch; reads still register with Compose through the underlying states.
    var text by state::text
    var baseId by state::baseId
    var fluidity by state::fluidity
    var rhythm by state::rhythm
    var pressure by state::pressure
    var tierFilter by state::tierFilter
    var message by state::message
    var error by state::error

    // Purely transient — an in-flight request does not outlive the screen.
    var saving by remember { mutableStateOf(false) }

    fun applyBase(id: String) = state.applyBase(id)

    val pickBackground = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri ->
        if (uri != null) {
            scope.launch {
                val upload = withContext(Dispatchers.IO) {
                    runCatching { decodeShowcaseUpload(context.contentResolver, uri) }.getOrNull()
                }
                if (upload == null) {
                    error = "Could not use that image. Try a smaller PNG or JPG."
                } else {
                    state.backgroundCustomBitmap = upload.bitmap
                    state.backgroundCustomDataUrl = upload.dataUrl
                    state.backgroundSelection = "custom"
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Surface(
            color = DesignTokens.SurfaceContainerLow,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp)) {
                Text(
                    "Artisan Studio",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = DesignTokens.Ink,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "Craft a hand-drawn signature with AI precision.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.OnSurfaceVariant,
                )
            }
        }

        Spacer(Modifier.height(20.dp))
        SignatureHero(
            text = text,
            base = SignatureBases.find(baseId),
            modifier = Modifier.fillMaxWidth(),
            backgroundBitmap = state.backgroundBitmap,
            backgroundOpacity = state.backgroundOpacity.roundToInt(),
            backgroundFit = state.backgroundFit,
        )

        Spacer(Modifier.height(20.dp))
        FieldLabel("Signature Text")
        Spacer(Modifier.height(8.dp))
        InkTextField(
            value = text,
            onValueChange = { text = it },
            placeholder = "Eleanor Vance",
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(22.dp))
        TemplateGallery(
            selectedId = baseId,
            previewText = text,
            filter = tierFilter,
            expanded = state.galleryExpanded,
            onExpandedChange = { state.galleryExpanded = it },
            onFilterChange = { tierFilter = it },
            onSelect = { applyBase(it.id) },
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(22.dp))
        SliderRow("FLUIDITY", fluidity) { fluidity = it }
        SliderRow("RHYTHM", rhythm) { rhythm = it }
        SliderRow("PRESSURE", pressure) { pressure = it }

        Spacer(Modifier.height(14.dp))
        ShowcaseBackgroundSection(
            state = state,
            onPickImage = { pickBackground.launch("image/*") },
        )

        authStore.user?.let {
            Spacer(Modifier.height(4.dp))
            InkChip("${it.credits} credits available")
        }

        Spacer(Modifier.height(18.dp))
        InkPrimaryButton(
            text = "Save to Library (1 Credit)",
            loading = saving,
            enabled = text.isNotBlank(),
            onClick = {
                scope.launch {
                    saving = true
                    error = null
                    message = null
                    try {
                        val base = SignatureBases.find(baseId)
                        val res = apiClient.saveSignatureFromSettings(
                            name = text.trim().ifEmpty { "My Signature" },
                            settings = SignatureSettingsDto(
                                text = text.trim(),
                                baseId = baseId,
                                fluidity = fluidity.toDouble(),
                                rhythm = rhythm.toDouble(),
                                pressure = pressure.toDouble(),
                                slant = base.slant,
                                size = base.size,
                                backgroundImage = state.backgroundDataUrl,
                                backgroundOpacity = state.backgroundOpacity
                                    .roundToInt().toDouble(),
                                backgroundFit = state.backgroundFit,
                            ),
                            canvasWidth = 800,
                            canvasHeight = 320,
                        )
                        if (res.ok == true) {
                            message = res.creditsRemaining
                                ?.let { "Saved to cloud library (1 credit). $it credit(s) left." }
                                ?: "Saved to cloud library (1 credit)."
                            authStore.refreshUser()
                        } else {
                            error = res.error ?: "Save failed"
                        }
                    } catch (e: Exception) {
                        error = e.message
                    } finally {
                        saving = false
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(10.dp))
        InkOutlinedButton(
            text = "Share PNG",
            enabled = text.isNotBlank(),
            onClick = {
                scope.launch {
                    val base = SignatureBases.find(baseId)
                    val bmp = withContext(Dispatchers.Default) {
                        renderSignatureFontBitmap(
                            assets = context.assets,
                            text = text.trim(),
                            fontFamily = base.fontFamily,
                            slantDeg = base.slant,
                            sizeMul = base.size,
                            inkColorHex = null,
                            background = state.backgroundBitmap,
                            backgroundOpacity = state.backgroundOpacity.roundToInt(),
                            backgroundFit = state.backgroundFit,
                        )
                    }
                    val uri = withContext(Dispatchers.IO) {
                        val dir = File(context.cacheDir, "shared").apply { mkdirs() }
                        val file = File(dir, "signature.png")
                        FileOutputStream(file).use { out ->
                            bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
                        }
                        FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            file,
                        )
                    }
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "image/png"
                        putExtra(Intent.EXTRA_STREAM, uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    context.startActivity(
                        Intent.createChooser(intent, "Share signature"),
                    )
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )

        message?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Secondary)
        }
        error?.let {
            Spacer(Modifier.height(10.dp))
            ErrorText(it)
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun SliderRow(
    label: String,
    value: Float,
    valueRange: ClosedFloatingPointRange<Float> = 1f..100f,
    onChange: (Float) -> Unit,
) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.OnSurfaceVariant,
            )
            Text(
                "${value.toInt()}",
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.Secondary,
            )
        }
        Slider(
            value = value,
            onValueChange = onChange,
            valueRange = valueRange,
            colors = SliderDefaults.colors(
                thumbColor = DesignTokens.Ink,
                activeTrackColor = DesignTokens.Ink,
                inactiveTrackColor = DesignTokens.SurfaceContainerHigh,
            ),
        )
    }
}

/** Mirrors the website's "Showcase background" panel: presets, upload, opacity, fit. */
@Composable
private fun ShowcaseBackgroundSection(
    state: StudioState,
    onPickImage: () -> Unit,
) {
    InkCard(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(
                checked = state.backgroundEnabled,
                onCheckedChange = { on ->
                    state.backgroundEnabled = on
                    if (!on) state.backgroundSelection = null
                },
                colors = CheckboxDefaults.colors(checkedColor = DesignTokens.Ink),
            )
            Column {
                Text(
                    "Showcase background",
                    style = MaterialTheme.typography.titleSmall,
                    color = DesignTokens.Ink,
                )
                Text(
                    "Optional card or texture behind your exports.",
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.OnSurfaceVariant,
                )
            }
        }

        if (state.backgroundEnabled) {
            Spacer(Modifier.height(10.dp))
            val tiles = buildList {
                add(null to null)
                ShowcaseBackgrounds.presets.forEach { add(it.id to it.bitmap()) }
                state.backgroundCustomBitmap?.let { add("custom" to it) }
            }
            tiles.chunked(2).forEach { row ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    row.forEach { (id, bmp) ->
                        BackgroundTile(
                            bitmap = bmp,
                            selected = state.backgroundSelection == id,
                            onClick = { state.backgroundSelection = id },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
                Spacer(Modifier.height(8.dp))
            }

            InkOutlinedButton(
                text = "Upload custom image",
                onClick = onPickImage,
                modifier = Modifier.fillMaxWidth(),
            )

            if (state.backgroundSelection != null) {
                Spacer(Modifier.height(10.dp))
                SliderRow(
                    "BG OPACITY",
                    state.backgroundOpacity,
                    valueRange = 20f..100f,
                ) { state.backgroundOpacity = it }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FitOption(
                        label = "Fill canvas",
                        selected = state.backgroundFit == "cover",
                        onClick = { state.backgroundFit = "cover" },
                        modifier = Modifier.weight(1f),
                    )
                    FitOption(
                        label = "Fit inside",
                        selected = state.backgroundFit == "contain",
                        onClick = { state.backgroundFit = "contain" },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun BackgroundTile(
    bitmap: Bitmap?,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .aspectRatio(2f)
            .clip(RoundedCornerShape(6.dp))
            .border(
                width = if (selected) 2.dp else 1.dp,
                color = if (selected) DesignTokens.Ink else DesignTokens.OutlineVariant,
                shape = RoundedCornerShape(6.dp),
            )
            .background(DesignTokens.SurfaceContainerLow)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (bitmap != null) {
            Image(
                bitmap = bitmap.asImageBitmap(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        } else {
            Text(
                "None",
                style = MaterialTheme.typography.labelMedium,
                color = if (selected) DesignTokens.Ink else DesignTokens.OnSurfaceVariant,
            )
        }
    }
}

@Composable
private fun FitOption(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .border(
                width = 1.dp,
                color = if (selected) DesignTokens.Ink else DesignTokens.OutlineVariant,
                shape = RoundedCornerShape(6.dp),
            )
            .background(if (selected) DesignTokens.Ink else DesignTokens.SurfaceCard)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) androidx.compose.ui.graphics.Color.White
            else DesignTokens.OnSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(vertical = 10.dp),
        )
    }
}
