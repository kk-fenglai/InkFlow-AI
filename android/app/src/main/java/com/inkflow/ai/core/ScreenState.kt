package com.inkflow.ai.core

import android.graphics.Bitmap
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Work-in-progress state for the primary tabs.
 *
 * These holders live in [com.inkflow.ai.ui.RootNav], which stays composed while
 * tabs change. Keeping the state inside the screens would drop it every time the
 * user switches tabs — losing a typed name, a picked PDF, or a rendered
 * signature the user already paid a credit for.
 */
class StudioState {
    var text by mutableStateOf("")
    var baseId by mutableStateOf("poet")
    var fluidity by mutableFloatStateOf(85f)
    var rhythm by mutableFloatStateOf(60f)
    var pressure by mutableFloatStateOf(55f)

    var tierFilter by mutableStateOf<Tier?>(null)
    var galleryExpanded by mutableStateOf(false)
    var unlocked by mutableStateOf<Set<String>>(emptySet())
    var unlockCost by mutableIntStateOf(1)
    /** Guards the one-shot unlock fetch against refiring on every tab return. */
    var unlocksLoaded = false

    var strokeData by mutableStateOf<StrokeDataDto?>(null)
    var shareBitmap by mutableStateOf<Bitmap?>(null)
    var message by mutableStateOf<String?>(null)
    var error by mutableStateOf<String?>(null)

    fun applyBase(id: String) {
        val base = SignatureBases.find(id)
        baseId = id
        fluidity = base.fluidity.toFloat()
        rhythm = base.rhythm.toFloat()
        pressure = base.pressure.toFloat()
    }

    val currentLocked: Boolean
        get() = SignatureBases.find(baseId).tier == Tier.PREMIUM && baseId !in unlocked
}

class RefineState {
    var bitmap by mutableStateOf<Bitmap?>(null)
    var analysis by mutableStateOf<RefineAnalysisDto?>(null)
    var error by mutableStateOf<String?>(null)
}

class SignPdfState {
    var pdfBytes by mutableStateOf<ByteArray?>(null)
    var pdfName by mutableStateOf("document.pdf")
    var pageCount by mutableIntStateOf(0)
    var pageIndex by mutableIntStateOf(0)
    var pageBitmap by mutableStateOf<Bitmap?>(null)
    var pagePtsW by mutableFloatStateOf(612f)
    var pagePtsH by mutableFloatStateOf(792f)

    var signatures by mutableStateOf<List<SavedSignatureDto>>(emptyList())
    var selectedSig by mutableStateOf<SavedSignatureDto?>(null)
    var sigBitmap by mutableStateOf<Bitmap?>(null)

    var fracX by mutableFloatStateOf(0.55f)
    var fracY by mutableFloatStateOf(0.78f)
    var widthFrac by mutableFloatStateOf(0.35f)
    var sesAccepted by mutableStateOf(false)

    var signedBytes by mutableStateOf<ByteArray?>(null)
    var signedName by mutableStateOf("signed.pdf")
    var creditsRemaining by mutableStateOf<Int?>(null)
    var savedNote by mutableStateOf<String?>(null)
    var error by mutableStateOf<String?>(null)
}
