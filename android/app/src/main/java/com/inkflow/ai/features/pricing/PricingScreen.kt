package com.inkflow.ai.features.pricing

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.android.billingclient.api.ProductDetails
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.BillingManager
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.InkCard
import com.inkflow.ai.ui.InkOutlinedButton
import com.inkflow.ai.ui.InkPrimaryButton
import kotlinx.coroutines.launch

@Composable
fun PricingScreen(
    authStore: AuthStore,
    apiClient: ApiClient,
    onClose: (() -> Unit)? = null,
) {
    val context = LocalContext.current
    val activity = context as Activity
    val scope = rememberCoroutineScope()
    val billing = remember { BillingManager(context, apiClient) }

    var products by remember { mutableStateOf<List<ProductDetails>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    DisposableEffect(Unit) {
        onDispose { billing.endConnection() }
    }

    LaunchedEffect(Unit) {
        loading = true
        products = billing.queryProducts()
        loading = false
        if (products.isEmpty()) {
            error = "No Play products loaded. Configure IAP in Play Console or use a licensed test account."
        }
    }

    LaunchedEffect(Unit) {
        billing.purchaseEvents.collect { event ->
            when (event) {
                is BillingManager.PurchaseEvent.Success -> {
                    message = event.message
                    error = null
                    authStore.applyCredits(event.credits, event.plan)
                    authStore.refreshUser()
                }
                is BillingManager.PurchaseEvent.Error -> {
                    error = event.message
                }
                BillingManager.PurchaseEvent.Cancelled -> {
                    message = "Purchase cancelled"
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(
            "Pricing",
            style = MaterialTheme.typography.displaySmall,
            color = DesignTokens.Ink,
        )
        Text(
            "Purchases use Google Play Billing. Credits sync to your InkFlow account.",
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.OnSurfaceVariant,
        )

        if (loading) {
            CircularProgressIndicator(color = DesignTokens.Secondary)
        }

        products.forEach { details ->
            val price = if (details.productType == "subs") {
                details.subscriptionOfferDetails
                    ?.firstOrNull()
                    ?.pricingPhases
                    ?.pricingPhaseList
                    ?.firstOrNull()
                    ?.formattedPrice
                    ?: "—"
            } else {
                details.oneTimePurchaseOfferDetails?.formattedPrice ?: "—"
            }
            InkCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            details.name,
                            style = MaterialTheme.typography.titleMedium,
                            color = DesignTokens.Ink,
                        )
                        Text(
                            price,
                            style = MaterialTheme.typography.bodyLarge,
                            color = DesignTokens.Secondary,
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    InkPrimaryButton(
                        text = "Buy",
                        onClick = {
                            error = null
                            if (!billing.launchPurchase(activity, details)) {
                                error = "Could not start purchase flow"
                            }
                        },
                    )
                }
            }
        }

        InkOutlinedButton(
            text = "Restore Purchases",
            onClick = {
                scope.launch {
                    message = billing.restorePurchases()
                    authStore.refreshUser()
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )

        message?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Secondary)
        }
        error?.let { ErrorText(it) }

        onClose?.let { close ->
            Spacer(Modifier.height(4.dp))
            InkOutlinedButton(text = "Close", onClick = close, modifier = Modifier.fillMaxWidth())
        }
        Spacer(Modifier.height(16.dp))
    }
}
