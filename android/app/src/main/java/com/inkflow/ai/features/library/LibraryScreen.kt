package com.inkflow.ai.features.library

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.CloudDocumentDto
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.SavedSignatureDto
import com.inkflow.ai.core.ShowcaseBackgrounds
import com.inkflow.ai.core.SignatureBases
import com.inkflow.ai.core.SignatureFontArt
import com.inkflow.ai.core.renderPdfPage
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.InkCard
import com.inkflow.ai.ui.InkOutlinedButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

private enum class LibraryTab { SIGNATURES, DOCUMENTS }

@Composable
fun LibraryScreen(apiClient: ApiClient) {
    var tab by remember { mutableStateOf(LibraryTab.SIGNATURES) }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(Modifier.padding(20.dp)) {
            Text(
                "Cloud Library",
                style = MaterialTheme.typography.displaySmall,
                color = DesignTokens.Ink,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Your saved signatures and signed documents, synced to every device.",
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.OnSurfaceVariant,
            )
            Spacer(Modifier.height(14.dp))
            LibraryTabs(selected = tab, onSelect = { tab = it })
        }

        when (tab) {
            LibraryTab.SIGNATURES -> SignaturesTab(apiClient)
            LibraryTab.DOCUMENTS -> DocumentsTab(apiClient)
        }
    }
}

@Composable
private fun LibraryTabs(selected: LibraryTab, onSelect: (LibraryTab) -> Unit) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(DesignTokens.SurfaceContainer)
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        LibraryTab.entries.forEach { entry ->
            val active = entry == selected
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(if (active) DesignTokens.Ink else DesignTokens.SurfaceContainer)
                    .clickable { onSelect(entry) }
                    .padding(horizontal = 18.dp, vertical = 8.dp),
            ) {
                Text(
                    if (entry == LibraryTab.SIGNATURES) "Signatures" else "Documents",
                    style = MaterialTheme.typography.labelLarge,
                    color = if (active) DesignTokens.SurfaceCard else DesignTokens.OnSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun SignaturesTab(apiClient: ApiClient) {
    var items by remember { mutableStateOf<List<SavedSignatureDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        loading = true
        error = null
        try {
            items = apiClient.fetchSignatures()
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        when {
            loading && items.isEmpty() -> LoadingBox()
            items.isEmpty() -> {
                EmptyBox(
                    error ?: "No signatures yet.\nGenerate one in Studio and save it here.",
                )
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    items(items, key = { it.id }) { item ->
                        InkCard(
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(14.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        item.name,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = DesignTokens.Ink,
                                    )
                                    Text(
                                        item.savedAt,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = DesignTokens.OnSurfaceVariant,
                                    )
                                }
                                IconButton(
                                    onClick = {
                                        scope.launch {
                                            try {
                                                apiClient.deleteSignature(item.id)
                                                items = items.filter { it.id != item.id }
                                            } catch (e: Exception) {
                                                error = e.message
                                            }
                                        }
                                    },
                                ) {
                                    Icon(
                                        Icons.Outlined.DeleteOutline,
                                        contentDescription = "Delete",
                                        tint = DesignTokens.OnSurfaceVariant,
                                    )
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            val base = SignatureBases.find(item.strokeData.baseId)
                            val settings = item.strokeData.settings
                            val bg = remember(item.id) {
                                ShowcaseBackgrounds.resolveBackgroundBitmap(settings.backgroundImage)
                            }
                            SignatureFontArt(
                                text = item.strokeData.text,
                                fontFamily = base.fontFamily,
                                slantDeg = settings.slant ?: base.slant,
                                sizeMul = settings.size ?: base.size,
                                inkColorHex = settings.inkColor,
                                heightDp = 80,
                                backgroundBitmap = bg,
                                backgroundOpacity = (settings.backgroundOpacity ?: 100.0).toInt(),
                                backgroundFit = settings.backgroundFit ?: "cover",
                            )
                        }
                    }
                }
            }
        }
        error?.takeIf { items.isNotEmpty() }?.let {
            ErrorText(it, modifier = Modifier.padding(16.dp))
        }
    }
}

@Composable
private fun DocumentsTab(apiClient: ApiClient) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var items by remember { mutableStateOf<List<CloudDocumentDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var note by remember { mutableStateOf<String?>(null) }
    var busyId by remember { mutableStateOf<String?>(null) }

    // Documents are multi-megabyte, so only the one being previewed is held.
    var openId by remember { mutableStateOf<String?>(null) }
    var openPreview by remember { mutableStateOf<Bitmap?>(null) }

    LaunchedEffect(Unit) {
        loading = true
        error = null
        try {
            items = apiClient.fetchDocuments()
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    suspend fun loadBytes(id: String): ByteArray? {
        val doc = apiClient.fetchDocument(id)
        val b64 = doc.pdfBase64 ?: return null
        return withContext(Dispatchers.Default) { Base64.decode(b64, Base64.DEFAULT) }
    }

    Column(Modifier.fillMaxSize()) {
        when {
            loading && items.isEmpty() -> LoadingBox()
            items.isEmpty() -> {
                EmptyBox(
                    error?.let { "Could not load your documents.\n$it" }
                        ?: "No signed documents yet.\nSign a PDF and choose “Save to Cloud Library”.",
                )
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    items(items, key = { it.id }) { doc ->
                        InkCard(
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(14.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        doc.fileName,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = DesignTokens.Ink,
                                    )
                                    Text(
                                        "${doc.savedAt.take(10)} · ${doc.pageCount} page" +
                                            (if (doc.pageCount == 1) "" else "s") +
                                            " · ${formatByteSize(doc.byteSize)}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = DesignTokens.OnSurfaceVariant,
                                    )
                                }
                                IconButton(
                                    enabled = busyId == null,
                                    onClick = {
                                        scope.launch {
                                            busyId = doc.id
                                            try {
                                                apiClient.deleteDocument(doc.id)
                                                items = items.filter { it.id != doc.id }
                                                if (openId == doc.id) {
                                                    openId = null
                                                    openPreview = null
                                                }
                                                note = "Removed ${doc.fileName}."
                                            } catch (e: Exception) {
                                                error = e.message
                                            } finally {
                                                busyId = null
                                            }
                                        }
                                    },
                                ) {
                                    Icon(
                                        Icons.Outlined.DeleteOutline,
                                        contentDescription = "Delete",
                                        tint = DesignTokens.OnSurfaceVariant,
                                    )
                                }
                            }

                            if (openId == doc.id) {
                                openPreview?.let { bmp ->
                                    Spacer(Modifier.height(10.dp))
                                    Image(
                                        bitmap = bmp.asImageBitmap(),
                                        contentDescription = "${doc.fileName} preview",
                                        contentScale = ContentScale.FillWidth,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(bmp.width.toFloat() / bmp.height)
                                            .clip(RoundedCornerShape(6.dp))
                                            .border(
                                                1.dp,
                                                DesignTokens.OutlineVariant,
                                                RoundedCornerShape(6.dp),
                                            ),
                                    )
                                }
                            }

                            Spacer(Modifier.height(12.dp))
                            InkOutlinedButton(
                                text = if (openId == doc.id) "Hide Preview" else "Preview",
                                enabled = busyId == null,
                                onClick = {
                                    if (openId == doc.id) {
                                        openId = null
                                        openPreview = null
                                        return@InkOutlinedButton
                                    }
                                    scope.launch {
                                        busyId = doc.id
                                        error = null
                                        try {
                                            val bytes = loadBytes(doc.id)
                                            if (bytes == null) {
                                                error = "Could not open document."
                                            } else {
                                                openPreview = withContext(Dispatchers.IO) {
                                                    renderPdfPage(
                                                        context,
                                                        bytes,
                                                        0,
                                                        "library-preview.pdf",
                                                    )?.bitmap
                                                }
                                                openId = doc.id
                                            }
                                        } catch (e: Exception) {
                                            error = e.message
                                        } finally {
                                            busyId = null
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                            )
                            Spacer(Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (Build.VERSION.SDK_INT >= 29) {
                                    InkOutlinedButton(
                                        text = "Download",
                                        enabled = busyId == null,
                                        onClick = {
                                            scope.launch {
                                                busyId = doc.id
                                                error = null
                                                try {
                                                    val bytes = loadBytes(doc.id)
                                                    note = if (bytes != null &&
                                                        withContext(Dispatchers.IO) {
                                                            saveToDownloads(
                                                                context,
                                                                bytes,
                                                                doc.fileName,
                                                            )
                                                        }
                                                    ) {
                                                        "Saved ${doc.fileName} to Downloads."
                                                    } else {
                                                        "Could not save — try Share instead."
                                                    }
                                                } catch (e: Exception) {
                                                    error = e.message
                                                } finally {
                                                    busyId = null
                                                }
                                            }
                                        },
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                InkOutlinedButton(
                                    text = "Share",
                                    enabled = busyId == null,
                                    onClick = {
                                        scope.launch {
                                            busyId = doc.id
                                            error = null
                                            try {
                                                val bytes = loadBytes(doc.id)
                                                if (bytes == null) {
                                                    error = "Could not open document."
                                                } else {
                                                    sharePdf(context, bytes, doc.fileName)
                                                }
                                            } catch (e: Exception) {
                                                error = e.message
                                            } finally {
                                                busyId = null
                                            }
                                        }
                                    },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }
            }
        }

        note?.let {
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Secondary,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )
        }
        error?.takeIf { items.isNotEmpty() }?.let {
            ErrorText(it, modifier = Modifier.padding(16.dp))
        }
    }
}

@Composable
private fun LoadingBox() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = DesignTokens.Secondary)
    }
}

@Composable
private fun EmptyBox(message: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            message,
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.OnSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 32.dp),
        )
    }
}

private fun formatByteSize(bytes: Long): String = when {
    bytes < 1024 -> "$bytes B"
    bytes < 1024 * 1024 -> "${bytes / 1024} KB"
    else -> String.format("%.1f MB", bytes / (1024.0 * 1024.0))
}

private fun sharePdf(context: Context, bytes: ByteArray, fileName: String) {
    val dir = File(context.cacheDir, "shared").apply { mkdirs() }
    val file = File(dir, fileName)
    file.writeBytes(bytes)
    val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "application/pdf"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Share signed PDF"))
}

private fun saveToDownloads(
    context: Context,
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
