package com.inkflow.ai.core

import com.google.gson.annotations.SerializedName

data class UserDto(
    val id: String,
    val email: String?,
    val name: String?,
    val credits: Int,
    val plan: String,
    val role: String = "user",
)

data class AuthResponse(
    val ok: Boolean = false,
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val expiresIn: Int? = null,
    val user: UserDto? = null,
    val error: String? = null,
    val code: String? = null,
)

data class MeResponse(
    val ok: Boolean = false,
    val user: UserDto? = null,
    val error: String? = null,
    val code: String? = null,
)

data class OkResponse(
    val ok: Boolean? = null,
    val error: String? = null,
    val message: String? = null,
)

data class StrokePointDto(val x: Double, val y: Double)

data class SignatureStrokeDto(
    val id: String,
    val order: Int,
    val label: String,
    val points: List<StrokePointDto>,
)

data class SignatureSettingsDto(
    val text: String? = null,
    val baseId: String? = null,
    val fluidity: Double? = null,
    val rhythm: Double? = null,
    val pressure: Double? = null,
    val slant: Double? = null,
    val size: Double? = null,
    val inkColor: String? = null,
)

data class StrokeDataDto(
    val version: Int,
    val width: Double,
    val height: Double,
    val text: String,
    val baseId: String,
    val strokes: List<SignatureStrokeDto>,
    val settings: SignatureSettingsDto,
    val createdAt: String? = null,
)

data class GenerateResponse(
    val ok: Boolean? = null,
    val creditsRemaining: Int? = null,
    val settings: SignatureSettingsDto? = null,
    val strokeData: StrokeDataDto? = null,
    val error: String? = null,
    val code: String? = null,
)

data class SavedSignatureDto(
    val id: String,
    val name: String,
    val strokeData: StrokeDataDto,
    val savedAt: String,
    val source: String? = null,
)

data class SignaturesListResponse(
    val ok: Boolean? = null,
    val signatures: List<SavedSignatureDto>? = null,
    val error: String? = null,
)

data class SaveSignatureResponse(
    val ok: Boolean? = null,
    val signature: SavedSignatureDto? = null,
    val creditsRemaining: Int? = null,
    val charged: Boolean? = null,
    val error: String? = null,
    val code: String? = null,
)

data class GoogleProductDto(
    val productId: String,
    val kind: String,
    val packId: String,
    val credits: Int,
    val amountCents: Int,
    val currency: String,
)

data class GoogleProductsResponse(
    val ok: Boolean? = null,
    val products: List<GoogleProductDto>? = null,
    val error: String? = null,
)

data class VerifyGoogleResponse(
    val ok: Boolean = false,
    val purchaseId: String? = null,
    val creditsGranted: Int? = null,
    val credits: Int? = null,
    val plan: String? = null,
    val reason: String? = null,
    val message: String? = null,
)

data class TemplatesResponse(
    val ok: Boolean? = null,
    val unlocked: List<String>? = null,
    val unlockCost: Int? = null,
    val error: String? = null,
)

data class UnlockTemplateResponse(
    val ok: Boolean? = null,
    val baseId: String? = null,
    val name: String? = null,
    val alreadyOwned: Boolean? = null,
    val creditsRemaining: Int? = null,
    val error: String? = null,
    val code: String? = null,
)

data class SignPdfResponse(
    val ok: Boolean? = null,
    val pdfBase64: String? = null,
    val fileName: String? = null,
    val creditsRemaining: Int? = null,
    val error: String? = null,
    val code: String? = null,
)

data class CloudDocumentDto(
    val id: String,
    val fileName: String,
    val pageCount: Int = 1,
    val byteSize: Long = 0,
    val savedAt: String,
    /** Only present when a single document is fetched by id. */
    val pdfBase64: String? = null,
)

data class DocumentsListResponse(
    val ok: Boolean? = null,
    val documents: List<CloudDocumentDto>? = null,
    val error: String? = null,
    val code: String? = null,
)

data class DocumentResponse(
    val ok: Boolean? = null,
    val document: CloudDocumentDto? = null,
    val error: String? = null,
    val code: String? = null,
)

class ApiException(message: String, val code: String? = null) : Exception(message)
