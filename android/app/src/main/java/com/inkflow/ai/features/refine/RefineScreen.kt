package com.inkflow.ai.features.refine

import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.material.icons.outlined.AutoFixHigh
import androidx.compose.material.icons.outlined.Fingerprint
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.ImageStatsDto
import com.inkflow.ai.core.RefineState
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.InkCard
import com.inkflow.ai.ui.InkChip
import com.inkflow.ai.ui.InkPrimaryButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import kotlin.math.roundToInt
import kotlin.math.sqrt

@Composable
fun RefineScreen(state: RefineState, apiClient: ApiClient) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    // Hoisted so a picked image and its analysis survive a tab switch.
    var bitmap by state::bitmap
    var analysis by state::analysis
    var error by state::error
    var analyzing by remember { mutableStateOf(false) }

    val galleryLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri != null) {
            scope.launch {
                bitmap = withContext(Dispatchers.IO) {
                    runCatching {
                        ImageDecoder.decodeBitmap(
                            ImageDecoder.createSource(context.contentResolver, uri),
                        ) { decoder, _, _ ->
                            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
                        }
                    }.getOrNull()
                }
                analysis = null
            }
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicturePreview(),
    ) { shot ->
        if (shot != null) {
            bitmap = shot
            analysis = null
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text(
            "Refine",
            style = MaterialTheme.typography.displaySmall,
            color = DesignTokens.Ink,
        )
        Spacer(Modifier.height(16.dp))

        Surface(
            color = DesignTokens.SurfaceContainerLow,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp)) {
                Text(
                    "Handwriting Analysis",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = DesignTokens.Ink,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "Refine your digital persona with AI precision.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.OnSurfaceVariant,
                )
            }
        }

        Spacer(Modifier.height(28.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            Text(
                "Upload Signature",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Ink,
            )
            Text(
                if (bitmap == null) "STEP 1 OF 2" else "STEP 2 OF 2",
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.OnSurfaceVariant,
            )
        }
        Spacer(Modifier.height(14.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            UploadOptionCard(
                icon = Icons.Outlined.PhotoLibrary,
                label = "Pick from Gallery",
                modifier = Modifier.weight(1f),
                onClick = {
                    galleryLauncher.launch(
                        PickVisualMediaRequest(
                            ActivityResultContracts.PickVisualMedia.ImageOnly,
                        ),
                    )
                },
            )
            UploadOptionCard(
                icon = Icons.Outlined.PhotoCamera,
                label = "Take a Photo",
                modifier = Modifier.weight(1f),
                onClick = { cameraLauncher.launch(null) },
            )
        }

        bitmap?.let { bmp ->
            Spacer(Modifier.height(16.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp)),
            ) {
                Image(
                    bitmap = bmp.asImageBitmap(),
                    contentDescription = "Selected signature image",
                    contentScale = ContentScale.FillWidth,
                    modifier = Modifier.fillMaxWidth(),
                )
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(12.dp)
                        .background(DesignTokens.Ink.copy(alpha = 0.85f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                ) {
                    Text(
                        "● Image Selected",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                    )
                }
            }

            Spacer(Modifier.height(16.dp))
            InkPrimaryButton(
                text = "Refine Signature",
                leadingIcon = Icons.Outlined.AutoFixHigh,
                loading = analyzing,
                onClick = {
                    scope.launch {
                        analyzing = true
                        error = null
                        try {
                            val (base64, stats) = withContext(Dispatchers.Default) {
                                encodeForUpload(bmp) to computeImageStats(bmp)
                            }
                            val res = apiClient.refine(base64, stats)
                            if (res.ok == true && res.analysis != null) {
                                analysis = res.analysis
                            } else {
                                error = res.error ?: "Analysis failed."
                            }
                        } catch (e: Exception) {
                            error = e.message ?: "Analysis failed."
                        } finally {
                            analyzing = false
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )
        }

        error?.let {
            Spacer(Modifier.height(12.dp))
            ErrorText(it)
        }

        analysis?.let { result ->
            Spacer(Modifier.height(32.dp))
            Text(
                "Analysis Results",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Ink,
            )
            Spacer(Modifier.height(14.dp))

            MetricCard(
                label = "THRESHOLD",
                value = result.threshold ?: 0,
                description = "Ink separation point tuned to your paper contrast.",
                barColor = DesignTokens.Ink,
            )
            Spacer(Modifier.height(12.dp))
            MetricCard(
                label = "SMOOTHING",
                value = result.smoothing ?: 0,
                description = "Noise reduction balanced against stroke detail.",
                barColor = DesignTokens.Secondary,
            )
            Spacer(Modifier.height(12.dp))
            MetricCard(
                label = "REFINE STRENGTH",
                value = result.refineStrength ?: 0,
                description = "Cleanup intensity applied to isolated ink.",
                barColor = DesignTokens.Ink,
            )

            Spacer(Modifier.height(12.dp))
            InkCard(modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.Top) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .background(
                                DesignTokens.Secondary.copy(alpha = 0.10f),
                                RoundedCornerShape(8.dp),
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.Fingerprint,
                            contentDescription = null,
                            tint = DesignTokens.Secondary,
                        )
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text(
                            "AI Notes",
                            style = MaterialTheme.typography.labelMedium,
                            color = DesignTokens.OnSurface,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            result.aiNote ?: "Analysis complete.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = DesignTokens.OnSurfaceVariant,
                        )
                    }
                }
            }

            result.inkColor?.let { hex ->
                Spacer(Modifier.height(20.dp))
                Text(
                    "DETECTED INK COLOR",
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.OnSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = parseHex(hex),
                        shape = RoundedCornerShape(6.dp),
                        border = BorderStroke(1.dp, DesignTokens.OutlineVariant),
                        modifier = Modifier.size(32.dp),
                    ) {}
                    Spacer(Modifier.width(10.dp))
                    InkChip(hex)
                }
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun UploadOptionCard(
    icon: ImageVector,
    label: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(
        color = DesignTokens.SurfaceContainerLow,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, DesignTokens.SurfaceContainerHigh),
        modifier = modifier.clickable(onClick = onClick),
    ) {
        Column(
            modifier = Modifier.padding(vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Surface(
                color = DesignTokens.SurfaceCard,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.size(48.dp),
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(icon, contentDescription = null, tint = DesignTokens.Ink)
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = DesignTokens.OnSurface,
            )
        }
    }
}

@Composable
private fun MetricCard(label: String, value: Int, description: String, barColor: Color) {
    Surface(
        color = DesignTokens.SurfaceCard,
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, DesignTokens.SurfaceContainerHigh),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(Modifier.height(IntrinsicSize.Min)) {
            Box(
                Modifier
                    .width(3.dp)
                    .fillMaxHeight()
                    .background(barColor),
            )
            Column(Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        label,
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.OnSurface,
                    )
                    Text(
                        "$value%",
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Ink,
                    )
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.OnSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                LinearProgressIndicator(
                    progress = { (value / 100f).coerceIn(0f, 1f) },
                    color = barColor,
                    trackColor = DesignTokens.SurfaceContainerHigh,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp)),
                )
            }
        }
    }
}

private fun parseHex(hex: String): Color = runCatching {
    Color(android.graphics.Color.parseColor(hex))
}.getOrDefault(DesignTokens.Ink)

/** JPEG base64 capped at 1280px on the longest edge to keep the payload small. */
private fun encodeForUpload(source: Bitmap): String {
    val maxEdge = 1280
    val scale = maxEdge.toFloat() / maxOf(source.width, source.height)
    val bmp = if (scale < 1f) {
        Bitmap.createScaledBitmap(
            source,
            (source.width * scale).roundToInt().coerceAtLeast(1),
            (source.height * scale).roundToInt().coerceAtLeast(1),
            true,
        )
    } else {
        source
    }
    val out = ByteArrayOutputStream()
    bmp.compress(Bitmap.CompressFormat.JPEG, 85, out)
    return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
}

/** Luminance statistics on a downscaled copy — mirrors what the web client computes. */
private fun computeImageStats(source: Bitmap): ImageStatsDto {
    val sample = Bitmap.createScaledBitmap(source, 96, 96, true)
    val pixels = IntArray(sample.width * sample.height)
    sample.getPixels(pixels, 0, sample.width, 0, 0, sample.width, sample.height)

    val lum = DoubleArray(pixels.size)
    for (i in pixels.indices) {
        val p = pixels[i]
        val r = (p shr 16) and 0xFF
        val g = (p shr 8) and 0xFF
        val b = p and 0xFF
        lum[i] = 0.299 * r + 0.587 * g + 0.114 * b
    }

    val mean = lum.average()
    val std = sqrt(lum.sumOf { (it - mean) * (it - mean) } / lum.size)
    val sorted = lum.sorted()
    val decile = (sorted.size / 10).coerceAtLeast(1)
    val inkLum = sorted.take(decile).average()
    val paperLum = sorted.takeLast(decile * 2).average()
    val cut = (inkLum + paperLum) / 2
    val darkRatio = lum.count { it < cut }.toDouble() / lum.size

    return ImageStatsDto(
        width = source.width,
        height = source.height,
        meanLuminance = mean,
        stdLuminance = std,
        darkPixelRatio = darkRatio,
        paperLuminance = paperLum,
        inkLuminance = inkLum,
    )
}
