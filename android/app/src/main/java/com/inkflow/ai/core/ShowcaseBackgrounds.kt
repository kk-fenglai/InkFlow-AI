package com.inkflow.ai.core

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.net.Uri
import android.util.Base64
import java.io.ByteArrayOutputStream

/**
 * Native ports of the website's showcase background presets
 * (src/lib/signature-backgrounds.ts). Each preset draws the same artwork the
 * web renders from its SVG, and carries that SVG as a data URL so signatures
 * saved from Android show the identical background in the web library.
 */

/** Same cap the website enforces on uploaded backgrounds (MAX_BACKGROUND_BYTES). */
const val MAX_BACKGROUND_DATA_URL = 800_000

class ShowcasePreset(
    val id: String,
    val name: String,
    svg: String,
    private val draw: (Canvas) -> Unit,
) {
    /** Same value the website stores in settings.backgroundImage. */
    val dataUrl: String = "data:image/svg+xml," + encodeUriComponent(svg)

    private var cached: Bitmap? = null

    /** The preset artwork at its native 800x400 size (matches the web SVGs). */
    fun bitmap(): Bitmap = cached
        ?: Bitmap.createBitmap(800, 400, Bitmap.Config.ARGB_8888)
            .also { draw(Canvas(it)); cached = it }
}

object ShowcaseBackgrounds {
    val presets: List<ShowcasePreset> = listOf(
        ShowcasePreset(
            id = "parchment",
            name = "Parchment",
            svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"400\">" +
                "<defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">" +
                "<stop offset=\"0%\" stop-color=\"#f7f0dc\"/>" +
                "<stop offset=\"50%\" stop-color=\"#efe3c8\"/>" +
                "<stop offset=\"100%\" stop-color=\"#e5d5b0\"/>" +
                "</linearGradient></defs>" +
                "<rect width=\"100%\" height=\"100%\" fill=\"url(#g)\"/>" +
                "<rect x=\"24\" y=\"24\" width=\"752\" height=\"352\" fill=\"none\" " +
                "stroke=\"#c9b896\" stroke-width=\"1\" opacity=\"0.5\"/></svg>",
            draw = ::drawParchment,
        ),
        ShowcasePreset(
            id = "linen",
            name = "Linen",
            svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"400\">" +
                "<rect width=\"100%\" height=\"100%\" fill=\"#faf8f4\"/>" +
                "<rect x=\"0\" y=\"0\" width=\"800\" height=\"400\" fill=\"url(#n)\" opacity=\"0.08\"/>" +
                "<defs><pattern id=\"n\" width=\"4\" height=\"4\" patternUnits=\"userSpaceOnUse\">" +
                "<circle cx=\"1\" cy=\"1\" r=\"0.6\" fill=\"#8a8278\"/></pattern></defs></svg>",
            draw = ::drawLinen,
        ),
        ShowcasePreset(
            id = "marble",
            name = "Marble",
            svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"400\">" +
                "<defs><linearGradient id=\"m\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">" +
                "<stop offset=\"0%\" stop-color=\"#2a2d32\"/>" +
                "<stop offset=\"100%\" stop-color=\"#1a1c20\"/>" +
                "</linearGradient></defs>" +
                "<rect width=\"100%\" height=\"100%\" fill=\"url(#m)\"/>" +
                "<ellipse cx=\"200\" cy=\"120\" rx=\"180\" ry=\"80\" fill=\"#ffffff\" opacity=\"0.04\"/>" +
                "<ellipse cx=\"600\" cy=\"280\" rx=\"220\" ry=\"90\" fill=\"#ffffff\" opacity=\"0.03\"/></svg>",
            draw = ::drawMarble,
        ),
        ShowcasePreset(
            id = "card",
            name = "Studio card",
            svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"400\">" +
                "<rect width=\"100%\" height=\"100%\" fill=\"#f3efe8\"/>" +
                "<rect x=\"40\" y=\"30\" width=\"720\" height=\"340\" rx=\"12\" fill=\"#fffcf7\" " +
                "stroke=\"#d4cfc4\" stroke-width=\"2\"/>" +
                "<rect x=\"40\" y=\"30\" width=\"720\" height=\"340\" rx=\"12\" fill=\"none\" " +
                "stroke=\"#ffffff\" stroke-width=\"1\" opacity=\"0.6\"/></svg>",
            draw = ::drawCard,
        ),
    )

    fun find(id: String?): ShowcasePreset? = presets.firstOrNull { it.id == id }

    /**
     * Turns a saved settings.backgroundImage data URL back into artwork for
     * library previews. Preset SVGs (saved from Android or the web, whose SVG
     * only differs in whitespace) map to the native preset drawing; raster
     * data URLs are decoded directly. Unknown SVGs return null.
     */
    fun resolveBackgroundBitmap(dataUrl: String?): Bitmap? {
        if (dataUrl.isNullOrEmpty()) return null
        presets.firstOrNull { it.dataUrl == dataUrl }?.let { return it.bitmap() }
        if (dataUrl.startsWith("data:image/svg+xml,")) {
            val normalized = normalizeSvgDataUrl(dataUrl)
            return presets.firstOrNull { normalizeSvgDataUrl(it.dataUrl) == normalized }
                ?.bitmap()
        }
        val base64Marker = ";base64,"
        val idx = dataUrl.indexOf(base64Marker)
        if (!dataUrl.startsWith("data:image/") || idx < 0) return null
        return runCatching {
            val bytes = Base64.decode(dataUrl.substring(idx + base64Marker.length), Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        }.getOrNull()
    }

    private fun normalizeSvgDataUrl(dataUrl: String): String {
        val svg = runCatching {
            java.net.URLDecoder.decode(
                dataUrl.removePrefix("data:image/svg+xml,"),
                "UTF-8",
            )
        }.getOrDefault("")
        return svg.replace(Regex(">\\s+<"), "><").replace(Regex("\\s+"), " ").trim()
    }
}

/**
 * Mirror of the web drawBackgroundLayer: opacity 0-100, fit "cover" | "contain",
 * image centered either way.
 */
fun drawShowcaseBackground(
    canvas: Canvas,
    width: Int,
    height: Int,
    image: Bitmap,
    fit: String,
    opacity: Int,
) {
    if (width <= 0 || height <= 0 || image.width <= 0 || image.height <= 0) return
    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply {
        alpha = opacity.coerceIn(0, 100) * 255 / 100
    }
    val iw = image.width.toFloat()
    val ih = image.height.toFloat()
    val scale = if (fit == "contain") {
        minOf(width / iw, height / ih)
    } else {
        maxOf(width / iw, height / ih)
    }
    val dw = iw * scale
    val dh = ih * scale
    val dx = (width - dw) / 2f
    val dy = (height - dh) / 2f
    canvas.drawBitmap(image, null, RectF(dx, dy, dx + dw, dy + dh), paint)
}

class ShowcaseUpload(val bitmap: Bitmap, val dataUrl: String)

/**
 * Decodes a user-picked background image, downscaling and re-encoding as JPEG
 * until the data URL fits the website's 800 KB background budget.
 */
fun decodeShowcaseUpload(resolver: ContentResolver, uri: Uri): ShowcaseUpload? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        ?: return null
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 1600) sample *= 2
    val opts = BitmapFactory.Options().apply { inSampleSize = sample }
    var bitmap = resolver.openInputStream(uri)
        ?.use { BitmapFactory.decodeStream(it, null, opts) }
        ?: return null

    repeat(4) {
        for (quality in intArrayOf(85, 70, 55)) {
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
            val dataUrl = "data:image/jpeg;base64," +
                Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
            if (dataUrl.length <= MAX_BACKGROUND_DATA_URL) {
                return ShowcaseUpload(bitmap, dataUrl)
            }
        }
        if (bitmap.width < 2 || bitmap.height < 2) return null
        bitmap = Bitmap.createScaledBitmap(bitmap, bitmap.width / 2, bitmap.height / 2, true)
    }
    return null
}

/** JS encodeURIComponent, so preset data URLs match the website's byte-for-byte. */
private fun encodeUriComponent(s: String): String = buildString {
    for (b in s.toByteArray(Charsets.UTF_8)) {
        val ch = b.toInt().toChar()
        if (ch in 'A'..'Z' || ch in 'a'..'z' || ch in '0'..'9' || ch in "-_.!~*'()") {
            append(ch)
        } else {
            append('%')
            append("%02X".format(b.toInt() and 0xFF))
        }
    }
}

private fun drawParchment(c: Canvas) {
    val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader = LinearGradient(
            0f, 0f, 800f, 400f,
            intArrayOf(0xFFF7F0DC.toInt(), 0xFFEFE3C8.toInt(), 0xFFE5D5B0.toInt()),
            floatArrayOf(0f, 0.5f, 1f),
            Shader.TileMode.CLAMP,
        )
    }
    c.drawRect(0f, 0f, 800f, 400f, fill)
    val border = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1f
        color = 0xFFC9B896.toInt()
        alpha = 128
    }
    c.drawRect(24f, 24f, 776f, 376f, border)
}

private fun drawLinen(c: Canvas) {
    c.drawColor(0xFFFAF8F4.toInt())
    val dot = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF8A8278.toInt()
        alpha = 20
    }
    var y = 1f
    while (y < 400f) {
        var x = 1f
        while (x < 800f) {
            c.drawCircle(x, y, 0.6f, dot)
            x += 4f
        }
        y += 4f
    }
}

private fun drawMarble(c: Canvas) {
    val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader = LinearGradient(
            0f, 0f, 800f, 400f,
            0xFF2A2D32.toInt(), 0xFF1A1C20.toInt(),
            Shader.TileMode.CLAMP,
        )
    }
    c.drawRect(0f, 0f, 800f, 400f, fill)
    val glow = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFFFFF.toInt() }
    glow.alpha = 10
    c.drawOval(RectF(20f, 40f, 380f, 200f), glow)
    glow.alpha = 8
    c.drawOval(RectF(380f, 190f, 820f, 370f), glow)
}

private fun drawCard(c: Canvas) {
    c.drawColor(0xFFF3EFE8.toInt())
    val card = RectF(40f, 30f, 760f, 370f)
    val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFFCF7.toInt() }
    c.drawRoundRect(card, 12f, 12f, fill)
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f
        color = 0xFFD4CFC4.toInt()
    }
    c.drawRoundRect(card, 12f, 12f, stroke)
    stroke.strokeWidth = 1f
    stroke.color = 0xFFFFFFFF.toInt()
    stroke.alpha = 153
    c.drawRoundRect(card, 12f, 12f, stroke)
}
