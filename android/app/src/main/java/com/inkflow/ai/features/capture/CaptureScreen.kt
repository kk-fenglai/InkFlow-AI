package com.inkflow.ai.features.capture

import android.graphics.Bitmap
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.InkExtract
import com.inkflow.ai.core.InkRefineParams
import com.inkflow.ai.ui.DetailTopBar
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.FieldLabel
import com.inkflow.ai.ui.InkOutlinedButton
import com.inkflow.ai.ui.InkPrimaryButton
import com.inkflow.ai.ui.InkTextField
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Photo-to-signature extraction: shoot or pick a photo of a handwritten
 * signature, isolate the ink on-device (same pipeline as the website's Refine
 * page), then store the transparent PNG in the cloud library for 1 credit.
 */
@Composable
fun CaptureScreen(
    authStore: AuthStore,
    apiClient: ApiClient,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var source by remember { mutableStateOf<Bitmap?>(null) }
    var params by remember { mutableStateOf<InkRefineParams?>(null) }
    var preview by remember { mutableStateOf<Bitmap?>(null) }
    var name by remember { mutableStateOf("") }
    var processing by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var cameraUri by remember { mutableStateOf<Uri?>(null) }

    fun reprocess() {
        val src = source ?: return
        val p = params ?: return
        scope.launch {
            processing = true
            preview = withContext(Dispatchers.Default) {
                InkExtract.process(src, p.threshold, p.smoothing, p.refineStrength, p.inkColor)
            }
            processing = false
        }
    }

    fun loadFrom(uri: Uri) {
        scope.launch {
            processing = true
            error = null
            message = null
            val loaded = withContext(Dispatchers.IO) {
                runCatching { InkExtract.decodeScaled(context.contentResolver, uri) }.getOrNull()
            }
            if (loaded == null) {
                error = "Could not read that image. Try another photo."
                processing = false
                return@launch
            }
            source = loaded
            val auto = withContext(Dispatchers.Default) {
                InkExtract.analyze(InkExtract.computeStats(loaded))
            }
            params = auto
            preview = withContext(Dispatchers.Default) {
                InkExtract.process(
                    loaded, auto.threshold, auto.smoothing, auto.refineStrength, auto.inkColor,
                )
            }
            processing = false
        }
    }

    val pickImage = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri -> if (uri != null) loadFrom(uri) }

    val takePhoto = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture(),
    ) { ok -> if (ok) cameraUri?.let { loadFrom(it) } }

    fun launchCamera() {
        val dir = File(context.cacheDir, "shared").apply { mkdirs() }
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            File(dir, "capture.jpg"),
        )
        cameraUri = uri
        takePhoto.launch(uri)
    }

    Column(Modifier.fillMaxSize()) {
        DetailTopBar(title = "Extract Signature", onBack = onBack)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Text(
                "Photograph a signature on paper — the ink is lifted onto a " +
                    "transparent canvas you can keep in your cloud library.",
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.OnSurfaceVariant,
            )

            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                InkPrimaryButton(
                    text = "Take Photo",
                    onClick = { launchCamera() },
                    modifier = Modifier.weight(1f),
                )
                InkOutlinedButton(
                    text = "Choose Image",
                    onClick = { pickImage.launch("image/*") },
                    modifier = Modifier.weight(1f),
                )
            }

            preview?.let { bmp ->
                Spacer(Modifier.height(18.dp))
                FieldLabel("EXTRACTED INK")
                Spacer(Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(DesignTokens.SurfaceContainerLow),
                    contentAlignment = Alignment.Center,
                ) {
                    Image(
                        bitmap = bmp.asImageBitmap(),
                        contentDescription = "Extracted signature",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize().padding(10.dp),
                        alpha = if (processing) 0.4f else 1f,
                    )
                }

                params?.let { p ->
                    Spacer(Modifier.height(10.dp))
                    Text(
                        p.aiNote,
                        style = MaterialTheme.typography.bodySmall,
                        color = DesignTokens.Secondary,
                    )
                    Spacer(Modifier.height(12.dp))
                    CaptureSlider("THRESHOLD", p.threshold, { params = p.copy(threshold = it) }) {
                        reprocess()
                    }
                    CaptureSlider("SMOOTHING", p.smoothing, { params = p.copy(smoothing = it) }) {
                        reprocess()
                    }
                    CaptureSlider(
                        "REFINE STRENGTH",
                        p.refineStrength,
                        { params = p.copy(refineStrength = it) },
                    ) {
                        reprocess()
                    }
                }

                Spacer(Modifier.height(14.dp))
                FieldLabel("Signature Name")
                Spacer(Modifier.height(8.dp))
                InkTextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = "Handwritten signature",
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(Modifier.height(16.dp))
                InkPrimaryButton(
                    text = "Save to Cloud Library (1 Credit)",
                    loading = saving,
                    enabled = !processing,
                    onClick = {
                        scope.launch {
                            saving = true
                            error = null
                            message = null
                            try {
                                val payload = withContext(Dispatchers.Default) {
                                    InkExtract.trimTransparent(bmp)?.let { trimmed ->
                                        InkExtract.toPngDataUrl(trimmed)
                                            ?.let { Triple(it, trimmed.width, trimmed.height) }
                                    }
                                }
                                if (payload == null) {
                                    error = "No ink found — raise the threshold and try again."
                                } else {
                                    val (dataUrl, w, h) = payload
                                    val res = apiClient.saveCapturedSignature(
                                        name = name.trim().ifEmpty { "Handwritten signature" },
                                        capturedImage = dataUrl,
                                        canvasWidth = w,
                                        canvasHeight = h,
                                    )
                                    if (res.ok == true) {
                                        message = res.creditsRemaining
                                            ?.let { "Saved to cloud library (1 credit). $it credit(s) left." }
                                            ?: "Saved to cloud library (1 credit)."
                                        authStore.refreshUser()
                                    } else {
                                        error = res.error ?: "Save failed"
                                    }
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
            }

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
}

@Composable
private fun CaptureSlider(
    label: String,
    value: Int,
    onChange: (Int) -> Unit,
    onChangeFinished: () -> Unit,
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.OnSurfaceVariant,
            )
            Text(
                "$value",
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.Secondary,
            )
        }
        Slider(
            value = value.toFloat(),
            onValueChange = { onChange(it.toInt()) },
            onValueChangeFinished = onChangeFinished,
            valueRange = 1f..100f,
            colors = SliderDefaults.colors(
                thumbColor = DesignTokens.Ink,
                activeTrackColor = DesignTokens.Ink,
                inactiveTrackColor = DesignTokens.SurfaceContainerHigh,
            ),
        )
    }
}
