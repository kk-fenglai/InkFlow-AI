package com.inkflow.ai.features.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.SavedSignatureDto
import com.inkflow.ai.core.SignaturePreview
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.InkCard
import kotlinx.coroutines.launch

@Composable
fun LibraryScreen(apiClient: ApiClient) {
    var items by remember { mutableStateOf<List<SavedSignatureDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            error = null
            try {
                items = apiClient.fetchSignatures()
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(Modifier.padding(20.dp)) {
            Text(
                "Cloud Library",
                style = MaterialTheme.typography.displaySmall,
                color = DesignTokens.Ink,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Your saved signatures, synced to every device.",
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.OnSurfaceVariant,
            )
        }
        when {
            loading && items.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = DesignTokens.Secondary)
                }
            }
            items.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        error ?: "No signatures yet.\nGenerate one in Studio and save it here.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = DesignTokens.OnSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    items(items, key = { it.id }) { item ->
                        InkCard(
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(14.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        item.name,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = DesignTokens.Ink,
                                    )
                                    Text(
                                        item.savedAt,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = DesignTokens.OnSurfaceVariant,
                                    )
                                }
                                IconButton(
                                    onClick = {
                                        scope.launch {
                                            try {
                                                apiClient.deleteSignature(item.id)
                                                items = items.filter { it.id != item.id }
                                            } catch (e: Exception) {
                                                error = e.message
                                            }
                                        }
                                    },
                                ) {
                                    Icon(
                                        Icons.Outlined.DeleteOutline,
                                        contentDescription = "Delete",
                                        tint = DesignTokens.OnSurfaceVariant,
                                    )
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            SignaturePreview(strokeData = item.strokeData, heightDp = 80)
                        }
                    }
                }
            }
        }
        error?.takeIf { items.isNotEmpty() }?.let {
            ErrorText(it, modifier = Modifier.padding(16.dp))
        }
    }
}
