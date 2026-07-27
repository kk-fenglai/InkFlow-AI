package com.inkflow.ai.core

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import java.io.ByteArrayOutputStream
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

/**
 * Kotlin port of the website's photo-to-signature extraction pipeline
 * (src/lib/ink-refine.ts). All pixel work runs on-device; only the final
 * transparent PNG goes to the cloud via the captured-signature save.
 */

data class InkImageStats(
    val meanLuminance: Double,
    val stdLuminance: Double,
    val darkPixelRatio: Double,
    val paperLuminance: Double,
    val inkLuminance: Double,
)

data class InkRefineParams(
    val threshold: Int,
    val smoothing: Int,
    val inkColor: String,
    val refineStrength: Int,
    val aiNote: String,
)

/** Same cap the /api/signatures captured path enforces (~2.5 MB binary). */
const val MAX_CAPTURED_DATA_URL = 3_500_000

object InkExtract {

    /** Decodes a picked/taken photo downscaled to a workable size. */
    fun decodeScaled(resolver: ContentResolver, uri: Uri, maxDim: Int = 1400): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
            ?: return null
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / sample > maxDim) sample *= 2
        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        return resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
    }

    /** Histogram-based luminance stats — mirror of computeImageStats(). */
    fun computeStats(bitmap: Bitmap): InkImageStats {
        val w = bitmap.width
        val h = bitmap.height
        val pixels = IntArray(w * h)
        bitmap.getPixels(pixels, 0, w, 0, 0, w, h)

        val hist = IntArray(256)
        var sum = 0.0
        var sumSq = 0.0
        var count = 0L
        var dark = 0L
        for (p in pixels) {
            val a = p ushr 24
            if (a < 16) continue
            val r = (p shr 16) and 0xFF
            val g = (p shr 8) and 0xFF
            val b = p and 0xFF
            val lum = 0.299 * r + 0.587 * g + 0.114 * b
            sum += lum
            sumSq += lum * lum
            count++
            if (lum < 128) dark++
            hist[min(255, lum.toInt())]++
        }
        if (count == 0L) {
            return InkImageStats(255.0, 0.0, 0.0, 255.0, 0.0)
        }
        val mean = sum / count
        val variance = sumSq / count - mean * mean
        return InkImageStats(
            meanLuminance = mean,
            stdLuminance = sqrt(max(0.0, variance)),
            darkPixelRatio = dark.toDouble() / count,
            paperLuminance = percentile(hist, count, 0.85),
            inkLuminance = percentile(hist, count, 0.12),
        )
    }

    private fun percentile(hist: IntArray, count: Long, p: Double): Double {
        val target = floor(p * (count - 1)).toLong()
        var seen = 0L
        for (i in 0..255) {
            seen += hist[i]
            if (seen > target) return i.toDouble()
        }
        return 255.0
    }

    /** Mirror of analyzeRefineStats(): derive slider defaults from the stats. */
    fun analyze(stats: InkImageStats): InkRefineParams {
        val contrast = stats.paperLuminance - stats.inkLuminance
        val lowContrast = contrast < 40
        val veryDarkInk = stats.inkLuminance < 60
        val noisy = stats.stdLuminance > 55

        var threshold = (stats.paperLuminance + stats.inkLuminance) / 2 / 255 * 100
        threshold = threshold.coerceIn(35.0, 82.0)
        if (lowContrast) threshold -= 8
        if (veryDarkInk) threshold += 6
        if (stats.darkPixelRatio > 0.45) threshold += 5

        var smoothing = if (noisy) 48.0 else if (stats.stdLuminance > 35) 38.0 else 28.0
        if (lowContrast) smoothing += 8

        var refineStrength = 50
        if (lowContrast) refineStrength = 65
        if (noisy) refineStrength = 72

        val notes = buildList {
            if (lowContrast) add("boosted separation for faint ink")
            if (noisy) add("increased smoothing for paper noise")
            if (stats.darkPixelRatio < 0.02) add("light ink detected — lower threshold")
        }

        return InkRefineParams(
            threshold = threshold.roundToInt(),
            smoothing = smoothing.roundToInt(),
            inkColor = if (veryDarkInk) "#1d1c16" else "#3a2e1a",
            refineStrength = refineStrength,
            aiNote = if (notes.isNotEmpty()) {
                "Analysis: ${notes.joinToString("; ")}."
            } else {
                "Analysis tuned threshold and smoothing for your photo."
            },
        )
    }

    /**
     * Mirror of processInkPixels() with transparent background: isolates ink
     * strokes onto a transparent canvas in the given ink color.
     */
    fun process(
        source: Bitmap,
        threshold: Int,
        smoothing: Int,
        refineStrength: Int,
        inkColorHex: String,
    ): Bitmap {
        val w = source.width
        val h = source.height
        val pixels = IntArray(w * h)
        source.getPixels(pixels, 0, w, 0, 0, w, h)

        val cut = threshold / 100f * 255f
        val ramp = max(1f, smoothing / 100f * 120f)
        val strength = refineStrength / 100f
        val ink = runCatching { android.graphics.Color.parseColor(inkColorHex) }
            .getOrDefault(0xFF1D1C16.toInt())
        val inkR = (ink shr 16) and 0xFF
        val inkG = (ink shr 8) and 0xFF
        val inkB = ink and 0xFF

        var lum = FloatArray(w * h)
        for (i in pixels.indices) {
            val p = pixels[i]
            val a = p ushr 24
            lum[i] = if (a == 0) {
                255f
            } else {
                (0.299f * ((p shr 16) and 0xFF) +
                    0.587f * ((p shr 8) and 0xFF) +
                    0.114f * (p and 0xFF))
            }
        }
        if (strength > 0.5f) lum = boxBlur(lum, w, h)

        val out = IntArray(w * h)
        for (i in out.indices) {
            var alpha = 1f - (lum[i] - (cut - ramp)) / (2f * ramp)
            alpha = alpha.coerceIn(0f, 1f)
            if (strength > 0.55f && alpha > 0.15f && alpha < 0.85f) {
                alpha = if (alpha > 0.5f) 1f else 0f
            }
            out[i] = ((alpha * 255).roundToInt() shl 24) or
                (inkR shl 16) or (inkG shl 8) or inkB
        }

        val result = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        result.setPixels(out, 0, w, 0, 0, w, h)
        return result
    }

    /** 3x3 box blur, edge-clamped — mirror of boxBlurLum(radius = 1). */
    private fun boxBlur(src: FloatArray, w: Int, h: Int): FloatArray {
        val out = FloatArray(src.size)
        for (y in 0 until h) {
            for (x in 0 until w) {
                var sum = 0f
                var n = 0
                for (dy in -1..1) {
                    val ny = y + dy
                    if (ny < 0 || ny >= h) continue
                    for (dx in -1..1) {
                        val nx = x + dx
                        if (nx < 0 || nx >= w) continue
                        sum += src[ny * w + nx]
                        n++
                    }
                }
                out[y * w + x] = sum / n
            }
        }
        return out
    }

    /** Crops to the inked bounding box with padding; null when nothing inked. */
    fun trimTransparent(bitmap: Bitmap, pad: Int = 12): Bitmap? {
        val w = bitmap.width
        val h = bitmap.height
        val pixels = IntArray(w * h)
        bitmap.getPixels(pixels, 0, w, 0, 0, w, h)
        var minX = w
        var minY = h
        var maxX = -1
        var maxY = -1
        for (y in 0 until h) {
            val row = y * w
            for (x in 0 until w) {
                if ((pixels[row + x] ushr 24) > 16) {
                    if (x < minX) minX = x
                    if (x > maxX) maxX = x
                    if (y < minY) minY = y
                    if (y > maxY) maxY = y
                }
            }
        }
        if (maxX < 0) return null
        val left = max(0, minX - pad)
        val top = max(0, minY - pad)
        val right = min(w - 1, maxX + pad)
        val bottom = min(h - 1, maxY + pad)
        return Bitmap.createBitmap(bitmap, left, top, right - left + 1, bottom - top + 1)
    }

    /** Transparent PNG data URL within the server's captured-image cap. */
    fun toPngDataUrl(bitmap: Bitmap): String? {
        var bmp = bitmap
        repeat(4) {
            val out = ByteArrayOutputStream()
            bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
            val dataUrl = "data:image/png;base64," +
                Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
            if (dataUrl.length <= MAX_CAPTURED_DATA_URL) return dataUrl
            if (bmp.width < 2 || bmp.height < 2) return null
            bmp = Bitmap.createScaledBitmap(bmp, bmp.width / 2, bmp.height / 2, true)
        }
        return null
    }
}
