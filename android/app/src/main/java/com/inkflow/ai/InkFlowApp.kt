package com.inkflow.ai

import android.app.Application
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.NetworkMonitor
import com.inkflow.ai.core.TokenStore

class InkFlowApp : Application() {
    lateinit var tokenStore: TokenStore
        private set
    lateinit var apiClient: ApiClient
        private set
    lateinit var authStore: AuthStore
        private set
    lateinit var networkMonitor: NetworkMonitor
        private set

    override fun onCreate() {
        super.onCreate()
        tokenStore = TokenStore(this)
        apiClient = ApiClient(tokenStore)
        authStore = AuthStore(apiClient, tokenStore)
        networkMonitor = NetworkMonitor(this).also { it.start() }
    }
}
