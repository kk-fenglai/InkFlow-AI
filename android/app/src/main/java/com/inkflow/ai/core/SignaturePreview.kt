package com.inkflow.ai.core

import android.graphics.Bitmap
import android.graphics.Canvas as AndroidCanvas
import android.graphics.Color as AndroidColor
import android.graphics.Paint
import android.graphics.Path
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import kotlin.math.min

@Composable
fun SignaturePreview(
    strokeData: StrokeDataDto,
    modifier: Modifier = Modifier,
    heightDp: Int = 140,
) {
    val ink = parseInkColor(strokeData.settings.inkColor)
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(heightDp.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(DesignTokens.SurfaceContainerLow),
    ) {
        val scale = min(size.width / strokeData.width.toFloat(), size.height / strokeData.height.toFloat())
        strokeData.strokes.sortedBy { it.order }.forEach { stroke ->
            if (stroke.points.size < 2) return@forEach
            val path = androidx.compose.ui.graphics.Path()
            val first = stroke.points.first()
            path.moveTo(first.x.toFloat() * scale, first.y.toFloat() * scale)
            stroke.points.drop(1).forEach { p ->
                path.lineTo(p.x.toFloat() * scale, p.y.toFloat() * scale)
            }
            drawPath(
                path = path,
                color = ink,
                style = Stroke(
                    width = maxOf(1.5f, 2f * scale),
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round,
                ),
            )
        }
    }
}

fun renderStrokeBitmap(strokeData: StrokeDataDto, width: Int = 800): Bitmap {
    val aspect = strokeData.height / strokeData.width
    val height = (width * aspect).toInt().coerceAtLeast(1)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = AndroidCanvas(bitmap)
    canvas.drawColor(AndroidColor.TRANSPARENT)
    val scale = min(width / strokeData.width, height / strokeData.height).toFloat()
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        strokeWidth = maxOf(1.5f, 2f * scale)
        color = parseAndroidInk(strokeData.settings.inkColor)
    }
    strokeData.strokes.sortedBy { it.order }.forEach { stroke ->
        if (stroke.points.size < 2) return@forEach
        val path = Path()
        val first = stroke.points.first()
        path.moveTo(first.x.toFloat() * scale, first.y.toFloat() * scale)
        stroke.points.drop(1).forEach { p ->
            path.lineTo(p.x.toFloat() * scale, p.y.toFloat() * scale)
        }
        canvas.drawPath(path, paint)
    }
    return bitmap
}

private fun parseInkColor(hex: String?): Color {
    return try {
        val cleaned = (hex ?: "#1d1c16").removePrefix("#")
        val value = cleaned.toLong(16)
        if (cleaned.length <= 6) {
            Color(
                red = ((value shr 16) and 0xFF) / 255f,
                green = ((value shr 8) and 0xFF) / 255f,
                blue = (value and 0xFF) / 255f,
            )
        } else {
            Color(value.toInt())
        }
    } catch (_: Exception) {
        DesignTokens.OnSurface
    }
}

private fun parseAndroidInk(hex: String?): Int {
    return try {
        AndroidColor.parseColor(hex ?: "#1d1c16")
    } catch (_: Exception) {
        AndroidColor.parseColor("#1d1c16")
    }
}
