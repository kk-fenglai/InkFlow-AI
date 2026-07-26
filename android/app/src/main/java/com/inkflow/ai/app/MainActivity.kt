package com.inkflow.ai.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.inkflow.ai.InkFlowApp
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.ui.InkFlowTheme
import com.inkflow.ai.ui.RootNav

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as InkFlowApp
        setContent {
            InkFlowTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = DesignTokens.Background,
                ) {
                    RootNav(
                        authStore = app.authStore,
                        apiClient = app.apiClient,
                        networkMonitor = app.networkMonitor,
                    )
                }
            }
        }
    }
}
