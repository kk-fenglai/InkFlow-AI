package com.inkflow.ai.core

import android.content.Context
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import java.io.File
import kotlin.math.roundToInt

class PdfPageRender(
    val bitmap: Bitmap,
    val pageCount: Int,
    val ptsW: Float,
    val ptsH: Float,
)

/**
 * Rasterises one page of [bytes]. PdfRenderer only reads from a seekable file
 * descriptor, so the document is staged in the cache directory first.
 *
 * Call from a background dispatcher — decoding a large page is not instant.
 */
fun renderPdfPage(
    context: Context,
    bytes: ByteArray,
    pageIndex: Int,
    cacheName: String,
    targetWidth: Int = 1080,
): PdfPageRender? = runCatching {
    val file = File(context.cacheDir, cacheName)
    file.writeBytes(bytes)
    ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
        PdfRenderer(pfd).use { renderer ->
            val idx = pageIndex.coerceIn(0, renderer.pageCount - 1)
            renderer.openPage(idx).use { page ->
                val targetH = (targetWidth * page.height.toFloat() / page.width).roundToInt()
                val bmp = Bitmap.createBitmap(targetWidth, targetH, Bitmap.Config.ARGB_8888)
                bmp.eraseColor(android.graphics.Color.WHITE)
                page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                PdfPageRender(
                    bitmap = bmp,
                    pageCount = renderer.pageCount,
                    ptsW = page.width.toFloat(),
                    ptsH = page.height.toFloat(),
                )
            }
        }
    }
}.getOrNull()
