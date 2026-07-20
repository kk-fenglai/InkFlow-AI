package com.inkflow.ai.features.studio

import android.content.Intent
import android.graphics.Bitmap
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.SignatureBases
import com.inkflow.ai.core.SignaturePreview
import com.inkflow.ai.core.StrokeDataDto
import com.inkflow.ai.core.Tier
import com.inkflow.ai.core.renderStrokeBitmap
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudioScreen(
    authStore: AuthStore,
    apiClient: ApiClient,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var text by remember { mutableStateOf("") }
    var baseId by remember { mutableStateOf("poet") }
    var fluidity by remember { mutableFloatStateOf(85f) }
    var rhythm by remember { mutableFloatStateOf(60f) }
    var pressure by remember { mutableFloatStateOf(55f) }
    var tierFilter by remember { mutableStateOf<Tier?>(null) }
    var unlocked by remember { mutableStateOf<Set<String>>(emptySet()) }
    var unlockCost by remember { mutableIntStateOf(1) }
    var unlocking by remember { mutableStateOf(false) }
    var generating by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var strokeData by remember { mutableStateOf<StrokeDataDto?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var shareBitmap by remember { mutableStateOf<Bitmap?>(null) }

    fun applyBase(id: String) {
        val base = SignatureBases.find(id)
        baseId = id
        fluidity = base.fluidity.toFloat()
        rhythm = base.rhythm.toFloat()
        pressure = base.pressure.toFloat()
    }

    val currentLocked = SignatureBases.find(baseId).tier == Tier.PREMIUM &&
        baseId !in unlocked

    LaunchedEffect(Unit) {
        runCatching { apiClient.fetchUnlockedTemplates() }.getOrNull()?.let { res ->
            unlocked = res.unlocked.orEmpty().toSet()
            res.unlockCost?.let { unlockCost = it }
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
            unlocked = unlocked,
            unlockCost = unlockCost,
            onFilterChange = { tierFilter = it },
            onSelect = { applyBase(it.id) },
            modifier = Modifier.fillMaxWidth(),
        )

        if (currentLocked) {
            Spacer(Modifier.height(12.dp))
            InkCard(modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            "“${SignatureBases.find(baseId).name}” is premium",
                            style = MaterialTheme.typography.titleMedium,
                            color = DesignTokens.Ink,
                        )
                        Text(
                            "Unlock once for $unlockCost credit — yours permanently.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = DesignTokens.OnSurfaceVariant,
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    InkPrimaryButton(
                        text = "Unlock",
                        loading = unlocking,
                        onClick = {
                            scope.launch {
                                unlocking = true
                                error = null
                                message = null
                                try {
                                    val res = apiClient.unlockTemplate(baseId)
                                    if (res.ok == true) {
                                        unlocked = unlocked + baseId
                                        message = if (res.alreadyOwned == true) {
                                            "Already unlocked."
                                        } else {
                                            "Unlocked “${res.name ?: baseId}”."
                                        }
                                        authStore.refreshUser()
                                    } else {
                                        error = res.error ?: "Unlock failed"
                                    }
                                } catch (e: Exception) {
                                    error = e.message
                                } finally {
                                    unlocking = false
                                }
                            }
                        },
                    )
                }
            }
        }

        Spacer(Modifier.height(22.dp))
        SliderRow("FLUIDITY", fluidity) { fluidity = it }
        SliderRow("RHYTHM", rhythm) { rhythm = it }
        SliderRow("PRESSURE", pressure) { pressure = it }

        authStore.user?.let {
            Spacer(Modifier.height(4.dp))
            InkChip("${it.credits} credits available")
        }

        strokeData?.let { data ->
            Spacer(Modifier.height(18.dp))
            InkCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(14.dp),
            ) {
                SignaturePreview(strokeData = data)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    InkOutlinedButton(
                        text = if (saving) "Saving…" else "Save to Library",
                        enabled = !saving,
                        onClick = {
                            scope.launch {
                                saving = true
                                error = null
                                try {
                                    val name = text.trim().ifEmpty { "My Signature" }
                                    val res = apiClient.saveSignature(name, data)
                                    if (res.ok == true) {
                                        message = "Saved to cloud library."
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
                        modifier = Modifier.weight(1f),
                    )
                    shareBitmap?.let { bmp ->
                        InkOutlinedButton(
                            text = "Share PNG",
                            onClick = {
                                scope.launch {
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
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(18.dp))
        InkPrimaryButton(
            text = "Render Final Ink (1 Credit)",
            loading = generating,
            enabled = text.isNotBlank() && !currentLocked,
            onClick = {
                scope.launch {
                    generating = true
                    error = null
                    message = null
                    strokeData = null
                    shareBitmap = null
                    try {
                        val base = SignatureBases.find(baseId)
                        val res = apiClient.generateFinalInk(
                            text = text.trim(),
                            baseId = baseId,
                            fluidity = fluidity.toDouble(),
                            rhythm = rhythm.toDouble(),
                            pressure = pressure.toDouble(),
                            slant = base.slant,
                            size = base.size,
                        )
                        if (res.ok == true && res.strokeData != null) {
                            strokeData = res.strokeData
                            message = "Signature ready."
                            shareBitmap = withContext(Dispatchers.Default) {
                                renderStrokeBitmap(res.strokeData)
                            }
                            authStore.refreshUser()
                        } else {
                            error = res.error ?: "Generation failed"
                        }
                    } catch (e: Exception) {
                        error = e.message
                    } finally {
                        generating = false
                    }
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
private fun SliderRow(label: String, value: Float, onChange: (Float) -> Unit) {
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
            valueRange = 1f..100f,
            colors = SliderDefaults.colors(
                thumbColor = DesignTokens.Ink,
                activeTrackColor = DesignTokens.Ink,
                inactiveTrackColor = DesignTokens.SurfaceContainerHigh,
            ),
        )
    }
}
