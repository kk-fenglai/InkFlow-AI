package com.inkflow.ai.features.account

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.AppConfig
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.InkCard
import com.inkflow.ai.ui.InkChip
import com.inkflow.ai.ui.InkOutlinedButton
import com.inkflow.ai.ui.InkPrimaryButton
import kotlinx.coroutines.launch

@Composable
fun AccountScreen(
    authStore: AuthStore,
    apiClient: ApiClient,
    onBuyCredits: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showDelete by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var deleteError by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text(
            "Account",
            style = MaterialTheme.typography.displaySmall,
            color = DesignTokens.Ink,
        )
        Spacer(Modifier.height(20.dp))

        authStore.user?.let { user ->
            InkCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(DesignTokens.Secondary.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            (user.name ?: user.email ?: "?").take(1).uppercase(),
                            style = MaterialTheme.typography.headlineMedium,
                            color = DesignTokens.Secondary,
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        user.name ?: "Studio Artist",
                        style = MaterialTheme.typography.titleLarge,
                        color = DesignTokens.Ink,
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        user.email.orEmpty(),
                        style = MaterialTheme.typography.labelMedium,
                        color = DesignTokens.OnSurfaceVariant,
                    )
                    Spacer(Modifier.height(12.dp))
                    InkChip("${user.credits} credits · ${user.plan}")
                }
            }
        }

        Spacer(Modifier.height(20.dp))
        InkPrimaryButton(
            text = "Buy Credits & Pro",
            onClick = onBuyCredits,
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(12.dp))
        InkOutlinedButton(
            text = "Sign Out",
            onClick = { scope.launch { authStore.logout() } },
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(28.dp))
        Text(
            "LEGAL",
            style = MaterialTheme.typography.labelSmall,
            color = DesignTokens.OnSurfaceVariant,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Privacy Policy",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = DesignTokens.Secondary,
            modifier = Modifier
                .clickable {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, Uri.parse("${AppConfig.API_BASE_URL}/privacy")),
                    )
                }
                .padding(vertical = 6.dp),
        )
        Text(
            "Terms of Service",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = DesignTokens.Secondary,
            modifier = Modifier
                .clickable {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, Uri.parse("${AppConfig.API_BASE_URL}/terms")),
                    )
                }
                .padding(vertical = 6.dp),
        )

        Spacer(Modifier.height(28.dp))
        Text(
            "Delete Account",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = DesignTokens.Error,
            modifier = Modifier
                .clickable(enabled = !deleting) { showDelete = true }
                .padding(vertical = 6.dp),
        )
        deleteError?.let {
            Spacer(Modifier.height(8.dp))
            ErrorText(it)
        }
        Spacer(Modifier.height(24.dp))
    }

    if (showDelete) {
        AlertDialog(
            onDismissRequest = { showDelete = false },
            containerColor = DesignTokens.SurfaceCard,
            title = {
                Text("Delete account?", style = MaterialTheme.typography.titleLarge)
            },
            text = {
                Text(
                    "This permanently deletes your account and cannot be undone.",
                    style = MaterialTheme.typography.bodyLarge,
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        scope.launch {
                            deleting = true
                            deleteError = null
                            try {
                                apiClient.deleteAccount()
                                authStore.clearSession()
                            } catch (e: Exception) {
                                deleteError = e.message
                            } finally {
                                deleting = false
                                showDelete = false
                            }
                        }
                    },
                ) {
                    Text("Delete", color = DesignTokens.Error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDelete = false }) {
                    Text("Cancel", color = DesignTokens.OnSurface)
                }
            },
        )
    }
}
