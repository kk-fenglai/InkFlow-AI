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

    var message by mutableStateOf<String?>(null)
    var error by mutableStateOf<String?>(null)

    // Showcase background — mirrors the website's optional export background.
    var backgroundEnabled by mutableStateOf(false)
    /** Preset id, or "custom" for an uploaded image; null = none. */
    var backgroundSelection by mutableStateOf<String?>(null)
    var backgroundCustomBitmap by mutableStateOf<Bitmap?>(null)
    var backgroundCustomDataUrl by mutableStateOf<String?>(null)
    var backgroundOpacity by mutableFloatStateOf(100f)
    var backgroundFit by mutableStateOf("cover")

    /** Resolved background artwork for rendering, or null when disabled/none. */
    val backgroundBitmap: Bitmap?
        get() = when {
            !backgroundEnabled -> null
            backgroundSelection == "custom" -> backgroundCustomBitmap
            else -> ShowcaseBackgrounds.find(backgroundSelection)?.bitmap()
        }

    /** Data URL persisted with the signature so the web renders the same background. */
    val backgroundDataUrl: String?
        get() = when {
            !backgroundEnabled -> null
            backgroundSelection == "custom" -> backgroundCustomDataUrl
            else -> ShowcaseBackgrounds.find(backgroundSelection)?.dataUrl
        }

    fun applyBase(id: String) {
        val base = SignatureBases.find(id)
        baseId = id
        fluidity = base.fluidity.toFloat()
        rhythm = base.rhythm.toFloat()
        pressure = base.pressure.toFloat()
    }
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

    var signedBytes by mutableStateOf<ByteArray?>(null)
    var signedName by mutableStateOf("signed.pdf")
    var creditsRemaining by mutableStateOf<Int?>(null)
    var savedNote by mutableStateOf<String?>(null)
    var error by mutableStateOf<String?>(null)

    // Result step: the signed document is shown back to the user before they
    // decide where it goes (device download, cloud library, or share).
    var signedPreview by mutableStateOf<Bitmap?>(null)
    var signedPageIndex by mutableIntStateOf(0)
    var signedPageCount by mutableIntStateOf(1)
    var uploadedDocId by mutableStateOf<String?>(null)

    /** Clears the result step so the editor comes back for another document. */
    fun startNewDocument() {
        pdfBytes = null
        pdfName = "document.pdf"
        pageCount = 0
        pageIndex = 0
        pageBitmap = null
        signedBytes = null
        signedName = "signed.pdf"
        signedPreview = null
        signedPageIndex = 0
        signedPageCount = 1
        uploadedDocId = null
        creditsRemaining = null
        savedNote = null
        error = null
    }
}
