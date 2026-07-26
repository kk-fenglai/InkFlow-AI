package com.inkflow.ai.core

import android.content.res.AssetManager
import android.graphics.Bitmap
import android.graphics.Canvas as AndroidCanvas
import android.graphics.Color as AndroidColor
import android.graphics.Paint
import android.graphics.Typeface
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlin.math.min
import kotlin.math.tan

/**
 * Renders the signature as the typed name in its cursive face — the same recipe
 * the website uses (signatureToSvg): centered text in the template font, skewed
 * by slant. This is the real signature artwork; the stroke polylines returned by
 * /api/generate are only a teachable tracing guide and must not be drawn as the
 * final ink (they look like a crude sketch).
 */

private const val DEFAULT_INK = "#1d1c16"

private fun loadTypeface(assets: AssetManager, family: String): Typeface =
    runCatching {
        Typeface.createFromAsset(assets, "fonts/${fontSlug(family)}.ttf")
    }.getOrDefault(Typeface.DEFAULT)

private fun parseInkInt(hex: String?): Int =
    runCatching { AndroidColor.parseColor(hex ?: DEFAULT_INK) }
        .getOrDefault(AndroidColor.parseColor(DEFAULT_INK))

/** Shared draw routine so the on-screen preview and the exported PNG are identical. */
private fun drawSignature(
    canvas: AndroidCanvas,
    width: Int,
    height: Int,
    text: String,
    typeface: Typeface,
    slantDeg: Double,
    sizeMul: Double,
    inkColor: Int,
) {
    if (width <= 0 || height <= 0) return
    val name = text.trim().ifEmpty { "Your Name" }
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        this.typeface = typeface
        color = inkColor
        textAlign = Paint.Align.CENTER
        // skewX in degrees → horizontal shear (SVG skewX uses tan of the angle).
        textSkewX = (-tan(Math.toRadians(slantDeg))).toFloat()
    }
    var fontSize = (min(height * 0.5, 140.0) * sizeMul).toFloat()
    paint.textSize = fontSize
    val maxWidth = width * 0.86f
    val measured = paint.measureText(name)
    if (measured > maxWidth && measured > 0f) {
        fontSize *= maxWidth / measured
        paint.textSize = fontSize
    }
    val fm = paint.fontMetrics
    val baseline = height / 2f - (fm.ascent + fm.descent) / 2f
    canvas.drawText(name, width / 2f, baseline, paint)
}

/** Transparent PNG of the signature for Save/Share. */
fun renderSignatureFontBitmap(
    assets: AssetManager,
    text: String,
    fontFamily: String,
    slantDeg: Double,
    sizeMul: Double,
    inkColorHex: String?,
    width: Int = 800,
    height: Int = 320,
): Bitmap {
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = AndroidCanvas(bitmap)
    canvas.drawColor(AndroidColor.TRANSPARENT)
    drawSignature(
        canvas = canvas,
        width = width,
        height = height,
        text = text,
        typeface = loadTypeface(assets, fontFamily),
        slantDeg = slantDeg,
        sizeMul = sizeMul,
        inkColor = parseInkInt(inkColorHex),
    )
    return bitmap
}

/** On-screen render of the final signature, matching the exported PNG exactly. */
@Composable
fun SignatureFontArt(
    text: String,
    fontFamily: String,
    slantDeg: Double,
    sizeMul: Double,
    inkColorHex: String?,
    modifier: Modifier = Modifier,
    heightDp: Int = 140,
) {
    val assets = LocalContext.current.assets
    val typeface = remember(fontFamily) { loadTypeface(assets, fontFamily) }
    val ink = remember(inkColorHex) { parseInkInt(inkColorHex) }
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(heightDp.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(DesignTokens.SurfaceContainerLow),
    ) {
        drawIntoCanvas { c ->
            drawSignature(
                canvas = c.nativeCanvas,
                width = size.width.toInt(),
                height = size.height.toInt(),
                text = text,
                typeface = typeface,
                slantDeg = slantDeg,
                sizeMul = sizeMul,
                inkColor = ink,
            )
        }
    }
}
