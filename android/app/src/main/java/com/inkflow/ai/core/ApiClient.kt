package com.inkflow.ai.core

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import java.io.IOException
import java.lang.reflect.Type
import java.util.concurrent.TimeUnit

class ApiClient(private val tokenStore: TokenStore) {
    companion object {
        const val OFFLINE_CODE = "NETWORK_UNAVAILABLE"
        const val OFFLINE_MESSAGE =
            "No internet connection. Please connect to a network and try again."
    }

    private val gson = Gson()
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private val refreshMutex = Mutex()

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            },
        )
        .build()

    fun setTokens(access: String, refresh: String) {
        tokenStore.accessToken = access
        tokenStore.refreshToken = refresh
    }

    fun clearTokens() {
        tokenStore.clear()
    }

    suspend fun login(email: String, password: String): AuthResponse =
        post("/api/mobile/login", mapOf("email" to email, "password" to password), auth = false)

    suspend fun register(email: String, password: String, name: String?): AuthResponse {
        val body = mutableMapOf<String, Any>("email" to email, "password" to password)
        if (!name.isNullOrBlank()) body["name"] = name
        return post("/api/mobile/register", body, auth = false)
    }

    suspend fun refreshSession(): AuthResponse {
        val refresh = tokenStore.refreshToken
            ?: throw ApiException("No refresh token", "NO_REFRESH")
        return post("/api/mobile/refresh", mapOf("refreshToken" to refresh), auth = false)
    }

    suspend fun logout() {
        val refresh = tokenStore.refreshToken
        if (refresh != null) {
            runCatching {
                post<AuthResponse>("/api/mobile/logout", mapOf("refreshToken" to refresh), auth = false)
            }
        }
        clearTokens()
    }

    suspend fun fetchMe(): UserDto {
        val res: MeResponse = get("/api/mobile/me")
        return res.user ?: throw ApiException(res.error ?: "Unauthorized", res.code)
    }

    suspend fun generateFinalInk(
        text: String,
        baseId: String = "poet",
        fluidity: Double = 50.0,
        rhythm: Double = 50.0,
        pressure: Double = 50.0,
        slant: Double = 0.0,
        size: Double = 1.0,
    ): GenerateResponse = post(
        "/api/generate",
        mapOf(
            "text" to text,
            "baseId" to baseId,
            "fluidity" to fluidity,
            "rhythm" to rhythm,
            "pressure" to pressure,
            "slant" to slant,
            "size" to size,
        ),
    )

    suspend fun fetchSignatures(): List<SavedSignatureDto> {
        val res: SignaturesListResponse = get("/api/signatures")
        return res.signatures.orEmpty()
    }

    suspend fun saveSignature(name: String, strokeData: StrokeDataDto): SaveSignatureResponse {
        val strokeJson = gson.toJsonTree(strokeData)
        return post(
            "/api/signatures",
            mapOf("name" to name, "strokeData" to strokeJson),
        )
    }

    /**
     * Saves straight from the studio settings — the server builds the stroke
     * payload and charges the 1-credit cloud-save fee. No paid generate needed.
     */
    suspend fun saveSignatureFromSettings(
        name: String,
        settings: SignatureSettingsDto,
        canvasWidth: Int,
        canvasHeight: Int,
    ): SaveSignatureResponse = post(
        "/api/signatures",
        mapOf(
            "name" to name,
            "settings" to gson.toJsonTree(settings),
            "canvasWidth" to canvasWidth,
            "canvasHeight" to canvasHeight,
        ),
    )

    /** Stores a photo-extracted transparent PNG in the cloud library (1 credit). */
    suspend fun saveCapturedSignature(
        name: String,
        capturedImage: String,
        canvasWidth: Int,
        canvasHeight: Int,
    ): SaveSignatureResponse = post(
        "/api/signatures",
        mapOf(
            "name" to name,
            "kind" to "captured",
            "capturedImage" to capturedImage,
            "canvasWidth" to canvasWidth,
            "canvasHeight" to canvasHeight,
        ),
    )

    suspend fun deleteSignature(id: String) {
        delete<OkResponse>("/api/signatures/$id")
    }

    suspend fun deleteAccount() {
        delete<OkResponse>("/api/account")
        clearTokens()
    }

    suspend fun fetchGoogleProducts(): List<GoogleProductDto> {
        val res: GoogleProductsResponse = get("/api/google/products")
        return res.products.orEmpty()
    }

    suspend fun verifyGooglePurchase(
        productId: String,
        purchaseToken: String,
        productType: String,
    ): VerifyGoogleResponse = post(
        "/api/google/verify-purchase",
        mapOf(
            "productId" to productId,
            "purchaseToken" to purchaseToken,
            "productType" to productType,
        ),
    )

    suspend fun forgotPassword(email: String) {
        post<OkResponse>("/api/auth/forgot-password", mapOf("email" to email), auth = false)
    }

    suspend fun signPdf(
        pdfBase64: String,
        signaturePngBase64: String,
        pageIndex: Int,
        x: Double,
        y: Double,
        width: Double,
        height: Double,
        fileName: String,
    ): SignPdfResponse = post(
        "/api/sign/pdf",
        mapOf(
            "pdfBase64" to pdfBase64,
            "signaturePngBase64" to signaturePngBase64,
            "pageIndex" to pageIndex,
            "x" to x,
            "y" to y,
            "width" to width,
            "height" to height,
            "fileName" to fileName,
            "sesAccepted" to true,
        ),
    )

    /** Keeps a finished PDF in the cloud library. Free — signing already charged. */
    suspend fun uploadDocument(fileName: String, pdfBase64: String): DocumentResponse =
        post(
            "/api/documents",
            mapOf("fileName" to fileName, "pdfBase64" to pdfBase64),
        )

    suspend fun fetchDocuments(): List<CloudDocumentDto> {
        val res: DocumentsListResponse = get("/api/documents")
        return res.documents.orEmpty()
    }

    suspend fun fetchDocument(id: String): CloudDocumentDto {
        val res: DocumentResponse = get("/api/documents/$id")
        return res.document
            ?: throw ApiException(res.error ?: "Document not found.", res.code)
    }

    suspend fun deleteDocument(id: String) {
        delete<OkResponse>("/api/documents/$id")
    }

    private suspend inline fun <reified T> get(path: String): T =
        request(path, "GET", null, retryOn401 = true)

    private suspend inline fun <reified T> post(
        path: String,
        body: Map<String, Any?>,
        auth: Boolean = true,
    ): T = request(path, "POST", body, retryOn401 = auth)

    private suspend inline fun <reified T> delete(path: String): T =
        request(path, "DELETE", null, retryOn401 = true)

    private suspend inline fun <reified T> request(
        path: String,
        method: String,
        body: Map<String, Any?>?,
        retryOn401: Boolean,
    ): T {
        val type = object : TypeToken<T>() {}.type
        return requestTyped(path, method, body, retryOn401, type)
    }

    private suspend fun <T> requestTyped(
        path: String,
        method: String,
        body: Map<String, Any?>?,
        retryOn401: Boolean,
        type: Type,
        isRetry: Boolean = false,
    ): T = withContext(Dispatchers.IO) {
        val url = AppConfig.API_BASE_URL.trimEnd('/') + "/" + path.trimStart('/')
        val builder = Request.Builder().url(url)
        tokenStore.accessToken?.let {
            builder.header("Authorization", "Bearer $it")
        }
        builder.header("Accept", "application/json")
        if (body != null) {
            val json = gson.toJson(body)
            builder.method(method, json.toRequestBody(jsonMedia))
            builder.header("Content-Type", "application/json")
        } else {
            builder.method(
                method,
                if (method == "GET" || method == "DELETE") null else "".toRequestBody(jsonMedia),
            )
        }

        // A dropped connection reads as "Unable to resolve host …" out of OkHttp;
        // translate it into something a user can act on.
        val response = try {
            client.newCall(builder.build()).execute()
        } catch (_: IOException) {
            throw ApiException(OFFLINE_MESSAGE, OFFLINE_CODE)
        }
        val bytes = try {
            response.body?.string().orEmpty()
        } catch (_: IOException) {
            throw ApiException(OFFLINE_MESSAGE, OFFLINE_CODE)
        }

        if (response.code == 401 && retryOn401 && !isRetry) {
            refreshMutex.withLock {
                val refreshed = refreshSession()
                if (refreshed.ok && refreshed.accessToken != null && refreshed.refreshToken != null) {
                    setTokens(refreshed.accessToken, refreshed.refreshToken)
                    return@withContext requestTyped(
                        path,
                        method,
                        body,
                        retryOn401 = false,
                        type = type,
                        isRetry = true,
                    )
                }
            }
        }

        if (response.code >= 400) {
            val err = runCatching { gson.fromJson(bytes, AuthResponse::class.java) }.getOrNull()
            throw ApiException(
                err?.error ?: "HTTP ${response.code}",
                err?.code,
            )
        }

        @Suppress("UNCHECKED_CAST")
        (gson.fromJson<T>(bytes, type) ?: throw ApiException("Empty response"))
    }
}
