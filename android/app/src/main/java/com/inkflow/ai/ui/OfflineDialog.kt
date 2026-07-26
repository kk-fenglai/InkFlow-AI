package com.inkflow.ai.ui

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.WifiOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.NetworkMonitor

/**
 * Watches connectivity for the whole app and raises [OfflineDialog] as soon as the
 * device goes offline. A dismissal is forgotten once the connection comes back, so
 * the next drop-out is announced again.
 */
@Composable
fun OfflineWatcher(networkMonitor: NetworkMonitor) {
    var dismissed by remember { mutableStateOf(false) }
    val online by networkMonitor.isOnline.collectAsStateWithLifecycle()

    // Callbacks can be missed while the app sits in the background, so re-check
    // whenever it comes back to the foreground.
    LifecycleResumeEffect(Unit) {
        networkMonitor.refresh()
        onPauseOrDispose { }
    }

    LaunchedEffect(online) {
        if (online) dismissed = false
    }

    if (!online && !dismissed) {
        OfflineDialog(
            onRetry = { networkMonitor.refresh() },
            onDismiss = { dismissed = true },
        )
    }
}

/**
 * Blocking notice shown whenever the device drops off the network. Dismissing it
 * only hides it until connectivity actually changes, so the user is never stuck
 * behind a dialog they cannot clear.
 */
@Composable
fun OfflineDialog(onRetry: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
        ),
        containerColor = DesignTokens.SurfaceCard,
        icon = {
            Icon(
                Icons.Outlined.WifiOff,
                contentDescription = null,
                tint = DesignTokens.Error,
                modifier = Modifier.size(28.dp),
            )
        },
        title = {
            Text(
                "No internet connection",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Ink,
            )
        },
        text = {
            Text(
                "InkFlow AI needs a network connection to generate, save, and sign " +
                    "signatures. Please turn on Wi-Fi or mobile data and try again.",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.OnSurfaceVariant,
            )
        },
        confirmButton = {
            TextButton(onClick = onRetry) {
                Text(
                    "Retry",
                    style = MaterialTheme.typography.labelLarge,
                    color = DesignTokens.Ink,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(
                    "Dismiss",
                    style = MaterialTheme.typography.labelLarge,
                    color = DesignTokens.OnSurfaceVariant,
                )
            }
        },
    )
}
