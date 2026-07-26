package com.inkflow.ai.core

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class AuthStore(
    private val api: ApiClient,
    private val tokenStore: TokenStore,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    var user by mutableStateOf<UserDto?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)

    val isAuthenticated: Boolean get() = user != null

    init {
        scope.launch { restoreSession() }
    }

    suspend fun restoreSession() {
        if (tokenStore.accessToken == null) return
        isLoading = true
        try {
            user = api.fetchMe()
        } catch (e: Exception) {
            // Only a rejected token should end the session. Failing because the
            // device is offline would otherwise sign the user out mid-session.
            if ((e as? ApiException)?.code != ApiClient.OFFLINE_CODE) {
                user = null
                api.clearTokens()
            }
        } finally {
            isLoading = false
        }
    }

    suspend fun login(email: String, password: String) {
        isLoading = true
        errorMessage = null
        try {
            applyAuth(api.login(email.trim(), password))
        } catch (e: Exception) {
            errorMessage = e.message
        } finally {
            isLoading = false
        }
    }

    suspend fun register(email: String, password: String, name: String) {
        isLoading = true
        errorMessage = null
        try {
            applyAuth(api.register(email.trim(), password, name.ifBlank { null }))
        } catch (e: Exception) {
            errorMessage = e.message
        } finally {
            isLoading = false
        }
    }

    suspend fun logout() {
        api.logout()
        user = null
    }

    fun clearSession() {
        user = null
    }

    suspend fun refreshUser() {
        if (!isAuthenticated) return
        try {
            user = api.fetchMe()
        } catch (e: Exception) {
            errorMessage = e.message
        }
    }

    fun applyCredits(credits: Int?, plan: String?) {
        val current = user ?: return
        user = current.copy(
            credits = credits ?: current.credits,
            plan = plan ?: current.plan,
        )
    }

    private fun applyAuth(res: AuthResponse) {
        if (!res.ok || res.accessToken == null || res.refreshToken == null || res.user == null) {
            throw ApiException(res.error ?: "Authentication failed", res.code)
        }
        api.setTokens(res.accessToken, res.refreshToken)
        user = res.user
    }
}
