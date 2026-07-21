package com.inkflow.ai.features.signpdf

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.Build
import android.os.ParcelFileDescriptor
import android.provider.MediaStore
import android.content.ContentValues
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.ChevronLeft
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.UploadFile
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.SavedSignatureDto
import com.inkflow.ai.core.SignPdfState
import com.inkflow.ai.core.SignaturePreview
import com.inkflow.ai.core.renderStrokeBitmap
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.InkCard
import com.inkflow.ai.ui.InkChip
import com.inkflow.ai.ui.InkOutlinedButton
import com.inkflow.ai.ui.InkPrimaryButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.math.roundToInt

private const val MAX_PDF_BYTES = 10 * 1024 * 1024

@Composable
fun SignPdfScreen(
    state: SignPdfState,
    authStore: AuthStore,
    apiClient: ApiClient,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Hoisted: re-picking a multi-megabyte PDF after a tab switch is the worst
    // thing this screen could ask of the user.
    var pdfBytes by state::pdfBytes
    var pdfName by state::pdfName
    var pageCount by state::pageCount
    var pageIndex by state::pageIndex
    var pageBitmap by state::pageBitmap
    var pagePtsW by state::pagePtsW
    var pagePtsH by state::pagePtsH

    var signatures by state::signatures
    var selectedSig by state::selectedSig
    var sigBitmap by state::sigBitmap

    var fracX by state::fracX
    var fracY by state::fracY
    var widthFrac by state::widthFrac
    var sesAccepted by state::sesAccepted

    var signedBytes by state::signedBytes
    var signedName by state::signedName
    var creditsRemaining by state::creditsRemaining
    var savedNote by state::savedNote
    var error by state::error

    var signing by remember { mutableStateOf(false) }

    val pdfPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            error = null
            signedBytes = null
            savedNote = null
            val loaded = withContext(Dispatchers.IO) {
                runCatching {
                    context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                }.getOrNull()
            }
            when {
                loaded == null -> error = "Could not read the selected PDF."
                loaded.size > MAX_PDF_BYTES -> error = "PDF exceeds the 10 MB limit."
                else -> {
                    pdfBytes = loaded
                    pdfName = queryDisplayName(context, uri) ?: "document.pdf"
                    pageIndex = 0
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        runCatching { signatures = apiClient.fetchSignatures() }
        if (selectedSig == null) {
            selectedSig = signatures.firstOrNull()
        }
    }

    LaunchedEffect(selectedSig) {
        sigBitmap = selectedSig?.let {
            withContext(Dispatchers.Default) { renderStrokeBitmap(it.strokeData, width = 600) }
        }
    }

    LaunchedEffect(pdfBytes, pageIndex) {
        val bytes = pdfBytes ?: return@LaunchedEffect
        withContext(Dispatchers.IO) {
            runCatching {
                val file = File(context.cacheDir, "signpdf-preview.pdf")
                file.writeBytes(bytes)
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
                    PdfRenderer(pfd).use { renderer ->
                        pageCount = renderer.pageCount
                        val idx = pageIndex.coerceIn(0, renderer.pageCount - 1)
                        renderer.openPage(idx).use { page ->
                            pagePtsW = page.width.toFloat()
                            pagePtsH = page.height.toFloat()
                            val targetW = 1080
                            val targetH =
                                (targetW * page.height.toFloat() / page.width).roundToInt()
                            val bmp = Bitmap.createBitmap(
                                targetW,
                                targetH,
                                Bitmap.Config.ARGB_8888,
                            )
                            bmp.eraseColor(android.graphics.Color.WHITE)
                            page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            pageBitmap = bmp
                        }
                    }
                }
            }.onFailure { error = "Could not preview PDF: ${it.message}" }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Spacer(Modifier.height(12.dp))
            Text(
                "Secure Document Signing",
                style = MaterialTheme.typography.displaySmall,
                color = DesignTokens.Ink,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            Text(
                "Upload your PDF and apply your unique AI-generated signature in seconds.",
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.OnSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(24.dp))

            if (pageBitmap == null) {
                DashedUploadBox(
                    label = if (pdfBytes == null) "Select PDF" else pdfName,
                    onClick = { pdfPicker.launch(arrayOf("application/pdf")) },
                )
            } else {
                Text(
                    pdfName,
                    style = MaterialTheme.typography.labelMedium,
                    color = DesignTokens.OnSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))

                PagePreviewWithPlacement(
                    pageBitmap = pageBitmap!!,
                    sigBitmap = sigBitmap,
                    fracX = fracX,
                    fracY = fracY,
                    widthFrac = widthFrac,
                    onMove = { dx, dy -> fracX = dx; fracY = dy },
                )

                if (pageCount > 1) {
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconButton(
                            onClick = { if (pageIndex > 0) pageIndex-- },
                            enabled = pageIndex > 0,
                        ) {
                            Icon(
                                Icons.Outlined.ChevronLeft,
                                contentDescription = "Previous page",
                                tint = DesignTokens.Ink,
                            )
                        }
                        Text(
                            "Page ${pageIndex + 1} of $pageCount",
                            style = MaterialTheme.typography.labelMedium,
                            color = DesignTokens.OnSurface,
                        )
                        IconButton(
                            onClick = { if (pageIndex < pageCount - 1) pageIndex++ },
                            enabled = pageIndex < pageCount - 1,
                        ) {
                            Icon(
                                Icons.Outlined.ChevronRight,
                                contentDescription = "Next page",
                                tint = DesignTokens.Ink,
                            )
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))
                InkOutlinedButton(
                    text = "Choose a Different PDF",
                    onClick = { pdfPicker.launch(arrayOf("application/pdf")) },
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(Modifier.height(24.dp))
                Text(
                    "YOUR SIGNATURE",
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.OnSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                if (signatures.isEmpty()) {
                    Text(
                        "No saved signatures yet — create one in Studio first.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.OnSurfaceVariant,
                    )
                } else {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(signatures, key = { it.id }) { sig ->
                            val selected = sig.id == selectedSig?.id
                            Surface(
                                color = DesignTokens.SurfaceCard,
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(
                                    if (selected) 2.dp else 1.dp,
                                    if (selected) DesignTokens.Ink else DesignTokens.OutlineVariant,
                                ),
                                modifier = Modifier
                                    .width(170.dp)
                                    .clickable { selectedSig = sig },
                            ) {
                                Column(Modifier.padding(10.dp)) {
                                    SignaturePreview(strokeData = sig.strokeData, heightDp = 56)
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        sig.name,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = DesignTokens.OnSurface,
                                        maxLines = 1,
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(18.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        "SIGNATURE SIZE",
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.OnSurfaceVariant,
                    )
                    Text(
                        "${(widthFrac * 100).roundToInt()}%",
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.Secondary,
                    )
                }
                Slider(
                    value = widthFrac,
                    onValueChange = { widthFrac = it },
                    valueRange = 0.15f..0.7f,
                    colors = SliderDefaults.colors(
                        thumbColor = DesignTokens.Ink,
                        activeTrackColor = DesignTokens.Ink,
                        inactiveTrackColor = DesignTokens.SurfaceContainerHigh,
                    ),
                )

                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = sesAccepted,
                        onCheckedChange = { sesAccepted = it },
                        colors = CheckboxDefaults.colors(
                            checkedColor = DesignTokens.Ink,
                            uncheckedColor = DesignTokens.Outline,
                        ),
                    )
                    Text(
                        "I accept the Simple Electronic Signature (SES) disclaimer.",
                        style = MaterialTheme.typography.bodySmall,
                        color = DesignTokens.OnSurfaceVariant,
                    )
                }

                authStore.user?.let {
                    Spacer(Modifier.height(6.dp))
                    InkChip("${it.credits} credits available")
                }

                Spacer(Modifier.height(14.dp))
                InkPrimaryButton(
                    text = "Sign PDF (1 Credit)",
                    loading = signing,
                    enabled = sigBitmap != null && sesAccepted,
                    onClick = {
                        val bytes = pdfBytes ?: return@InkPrimaryButton
                        val sig = sigBitmap ?: return@InkPrimaryButton
                        scope.launch {
                            signing = true
                            error = null
                            savedNote = null
                            try {
                                val sigAspect = sig.height.toFloat() / sig.width
                                val wPts = widthFrac * pagePtsW
                                val hPts = wPts * sigAspect
                                val xPts = fracX * pagePtsW
                                val displayAspect = pagePtsH / pagePtsW
                                val hFrac = widthFrac * sigAspect / displayAspect
                                val yPts = pagePtsH * (1f - fracY - hFrac)

                                val (pdfB64, sigB64) = withContext(Dispatchers.Default) {
                                    val sigOut = ByteArrayOutputStream()
                                    sig.compress(Bitmap.CompressFormat.PNG, 100, sigOut)
                                    Base64.encodeToString(bytes, Base64.NO_WRAP) to
                                        Base64.encodeToString(sigOut.toByteArray(), Base64.NO_WRAP)
                                }

                                val res = apiClient.signPdf(
                                    pdfBase64 = pdfB64,
                                    signaturePngBase64 = sigB64,
                                    pageIndex = pageIndex,
                                    x = xPts.toDouble(),
                                    y = yPts.toDouble().coerceAtLeast(0.0),
                                    width = wPts.toDouble(),
                                    height = hPts.toDouble(),
                                    fileName = pdfName,
                                )
                                if (res.ok == true && res.pdfBase64 != null) {
                                    signedBytes = Base64.decode(res.pdfBase64, Base64.DEFAULT)
                                    signedName = res.fileName ?: "signed.pdf"
                                    creditsRemaining = res.creditsRemaining
                                    authStore.refreshUser()
                                } else {
                                    error = res.error ?: "Signing failed."
                                }
                            } catch (e: Exception) {
                                error = e.message ?: "Signing failed."
                            } finally {
                                signing = false
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

            signedBytes?.let { bytes ->
                Spacer(Modifier.height(20.dp))
                InkCard(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "Document Signed",
                        style = MaterialTheme.typography.titleLarge,
                        color = DesignTokens.Ink,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        buildString {
                            append(signedName)
                            creditsRemaining?.let { append(" · $it credits left") }
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.OnSurfaceVariant,
                    )
                    Spacer(Modifier.height(16.dp))
                    if (Build.VERSION.SDK_INT >= 29) {
                        InkPrimaryButton(
                            text = "Save to Downloads",
                            onClick = {
                                scope.launch {
                                    val ok = withContext(Dispatchers.IO) {
                                        saveToDownloads(context, bytes, signedName)
                                    }
                                    savedNote = if (ok) {
                                        "Saved to Downloads as $signedName."
                                    } else {
                                        "Could not save — try Share instead."
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Spacer(Modifier.height(10.dp))
                    }
                    InkOutlinedButton(
                        text = "Share Signed PDF",
                        onClick = {
                            scope.launch {
                                val uri = withContext(Dispatchers.IO) {
                                    val dir = File(context.cacheDir, "shared").apply { mkdirs() }
                                    val file = File(dir, signedName)
                                    file.writeBytes(bytes)
                                    FileProvider.getUriForFile(
                                        context,
                                        "${context.packageName}.fileprovider",
                                        file,
                                    )
                                }
                                val intent = Intent(Intent.ACTION_SEND).apply {
                                    type = "application/pdf"
                                    putExtra(Intent.EXTRA_STREAM, uri)
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }
                                context.startActivity(Intent.createChooser(intent, "Share signed PDF"))
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    savedNote?.let {
                        Spacer(Modifier.height(10.dp))
                        Text(
                            it,
                            style = MaterialTheme.typography.bodySmall,
                            color = DesignTokens.Secondary,
                        )
                    }
                }
            }

            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun DashedUploadBox(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(320.dp)
            .clip(RoundedCornerShape(12.dp))
            .drawBehind {
                drawRoundRect(
                    color = DesignTokens.Outline,
                    style = Stroke(
                        width = 2.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(14f, 12f)),
                    ),
                    cornerRadius = CornerRadius(12.dp.toPx()),
                )
            }
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(
                color = DesignTokens.SurfaceContainer,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.size(64.dp),
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(
                        Icons.Outlined.UploadFile,
                        contentDescription = null,
                        tint = DesignTokens.Ink,
                        modifier = Modifier.size(28.dp),
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            Text(
                label,
                style = MaterialTheme.typography.labelLarge,
                color = DesignTokens.OnSurface,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "Maximum file size: 10MB",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.OnSurfaceVariant,
            )
        }
    }
}

@Composable
private fun PagePreviewWithPlacement(
    pageBitmap: Bitmap,
    sigBitmap: Bitmap?,
    fracX: Float,
    fracY: Float,
    widthFrac: Float,
    onMove: (Float, Float) -> Unit,
) {
    var containerSize by remember { mutableStateOf(IntSize.Zero) }
    val pageAspect = pageBitmap.width.toFloat() / pageBitmap.height

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(pageAspect)
            .clip(RoundedCornerShape(8.dp))
            .border(1.dp, DesignTokens.OutlineVariant, RoundedCornerShape(8.dp))
            .onSizeChanged { containerSize = it },
    ) {
        Image(
            bitmap = pageBitmap.asImageBitmap(),
            contentDescription = "PDF page preview",
            contentScale = ContentScale.FillWidth,
            modifier = Modifier.fillMaxSize(),
        )

        if (sigBitmap != null && containerSize != IntSize.Zero) {
            val sigAspect = sigBitmap.height.toFloat() / sigBitmap.width
            val boxW = widthFrac * containerSize.width
            val boxH = boxW * sigAspect
            Box(
                modifier = Modifier
                    .offset {
                        IntOffset(
                            (fracX * containerSize.width).roundToInt()
                                .coerceIn(0, (containerSize.width - boxW).roundToInt().coerceAtLeast(0)),
                            (fracY * containerSize.height).roundToInt()
                                .coerceIn(0, (containerSize.height - boxH).roundToInt().coerceAtLeast(0)),
                        )
                    }
                    .size(
                        width = (boxW / LocalDensityValue()).dp,
                        height = (boxH / LocalDensityValue()).dp,
                    )
                    .background(DesignTokens.SecondaryContainer.copy(alpha = 0.25f))
                    .border(1.dp, DesignTokens.Secondary, RoundedCornerShape(2.dp))
                    .pointerInput(containerSize) {
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            val maxX = 1f - boxW / containerSize.width
                            val maxY = 1f - boxH / containerSize.height
                            onMove(
                                (fracX + dragAmount.x / containerSize.width)
                                    .coerceIn(0f, maxX.coerceAtLeast(0f)),
                                (fracY + dragAmount.y / containerSize.height)
                                    .coerceIn(0f, maxY.coerceAtLeast(0f)),
                            )
                        }
                    },
            ) {
                Image(
                    bitmap = sigBitmap.asImageBitmap(),
                    contentDescription = "Signature placement",
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
    }
}

@Composable
private fun LocalDensityValue(): Float =
    androidx.compose.ui.platform.LocalDensity.current.density

private fun queryDisplayName(context: android.content.Context, uri: android.net.Uri): String? =
    runCatching {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) cursor.getString(idx) else null
        }
    }.getOrNull()

private fun saveToDownloads(
    context: android.content.Context,
    bytes: ByteArray,
    fileName: String,
): Boolean = runCatching {
    val values = ContentValues().apply {
        put(MediaStore.Downloads.DISPLAY_NAME, fileName)
        put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
    }
    val uri = context.contentResolver.insert(
        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
        values,
    ) ?: return false
    context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) } ?: return false
    true
}.getOrDefault(false)
