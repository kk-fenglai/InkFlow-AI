package com.inkflow.ai.features.account

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.android.billingclient.api.ProductDetails
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.AppConfig
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.BillingManager
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.InkCard
import com.inkflow.ai.ui.InkChip
import com.inkflow.ai.ui.InkOutlinedButton
import com.inkflow.ai.ui.InkPrimaryButton
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Currency

/**
 * Credit and Pro purchases, shown inline on the Account screen — buying is
 * account management, so it does not warrant its own destination. Mirrors the
 * website's /pricing page: pack descriptions, per-credit pricing, a Best-value
 * badge, a highlighted Pro subscription, and a credit-usage table.
 */
@Composable
fun BuyCreditsSection(
    authStore: AuthStore,
    apiClient: ApiClient,
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
            error = "No Play products loaded. Configure IAP in Play Console or " +
                "use a licensed test account."
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
                is BillingManager.PurchaseEvent.Error -> error = event.message
                BillingManager.PurchaseEvent.Cancelled -> message = "Purchase cancelled"
            }
        }
    }

    fun buy(details: ProductDetails) {
        error = null
        if (!billing.launchPurchase(activity, details)) {
            error = "Could not start purchase flow"
        }
    }

    // Present packs in the configured order (20 → 50 → 120), subscription apart.
    val byId = products.associateBy { it.productId }
    val packs = AppConfig.productIds
        .filter { it != PRO_MONTHLY_PRODUCT_ID }
        .mapNotNull { byId[it] }
    val pro = byId[PRO_MONTHLY_PRODUCT_ID]

    Column(Modifier.fillMaxWidth()) {
        Text(
            "CREDITS & PRO",
            style = MaterialTheme.typography.labelSmall,
            color = DesignTokens.OnSurfaceVariant,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "Purchases use Google Play Billing and sync to your InkFlow account.",
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.OnSurfaceVariant,
        )
        Spacer(Modifier.height(14.dp))

        if (loading) {
            CircularProgressIndicator(
                color = DesignTokens.Secondary,
                modifier = Modifier.height(28.dp),
            )
        }

        packs.forEach { details ->
            CreditPackCard(details = details, onBuy = { buy(details) })
            Spacer(Modifier.height(10.dp))
        }

        pro?.let {
            Spacer(Modifier.height(6.dp))
            ProSubscriptionCard(details = it, onSubscribe = { buy(it) })
            Spacer(Modifier.height(10.dp))
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
            Spacer(Modifier.height(10.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Secondary)
        }
        error?.let {
            Spacer(Modifier.height(10.dp))
            ErrorText(it)
        }

        Spacer(Modifier.height(24.dp))
        CreditUsageCard()
    }
}

@Composable
private fun CreditPackCard(details: ProductDetails, onBuy: () -> Unit) {
    val meta = PACK_META[details.productId]
    val oneTime = details.oneTimePurchaseOfferDetails
    val price = oneTime?.formattedPrice ?: "—"
    val perCredit = perCreditPrice(details, meta?.credits)

    InkCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                meta?.badge?.let {
                    InkChip(it)
                    Spacer(Modifier.height(6.dp))
                }
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
                perCredit?.let {
                    Text(
                        "$it per credit",
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.OnSurfaceVariant,
                    )
                }
                meta?.description?.let {
                    Spacer(Modifier.height(6.dp))
                    Text(
                        it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.OnSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            InkPrimaryButton(text = "Buy", onClick = onBuy)
        }
    }
}

@Composable
private fun ProSubscriptionCard(details: ProductDetails, onSubscribe: () -> Unit) {
    val price = details.subscriptionOfferDetails
        ?.firstOrNull()
        ?.pricingPhases
        ?.pricingPhaseList
        ?.firstOrNull()
        ?.formattedPrice
        ?: "—"

    InkCard(
        modifier = Modifier.fillMaxWidth(),
        containerColor = DesignTokens.Secondary.copy(alpha = 0.06f),
    ) {
        Column(Modifier.fillMaxWidth()) {
            InkChip("Most popular")
            Spacer(Modifier.height(8.dp))
            Text(
                details.name,
                style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Ink,
            )
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    price,
                    style = MaterialTheme.typography.headlineSmall,
                    color = DesignTokens.Secondary,
                )
                Text(
                    " / month",
                    style = MaterialTheme.typography.labelMedium,
                    color = DesignTokens.OnSurfaceVariant,
                )
            }
            Spacer(Modifier.height(12.dp))
            PRO_FEATURES.forEach { feature ->
                Row(verticalAlignment = Alignment.Top) {
                    Text(
                        "•  ",
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Secondary,
                    )
                    Text(
                        feature,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.OnSurfaceVariant,
                    )
                }
                Spacer(Modifier.height(4.dp))
            }
            Spacer(Modifier.height(12.dp))
            InkPrimaryButton(
                text = "Subscribe",
                onClick = onSubscribe,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun CreditUsageCard() {
    InkCard(modifier = Modifier.fillMaxWidth()) {
        Text(
            "Credit usage",
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Ink,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "Credits power final exports, cloud saves, AI tuning, SVG export, and " +
                "PDF signing. Every template, previews, and practice stay free.",
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.OnSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        CREDIT_USAGE_ROWS.forEachIndexed { index, row ->
            Row(
                modifier = Modifier.fillMaxWidth().height(36.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    row.action,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (row.free) DesignTokens.OnSurfaceVariant else DesignTokens.Ink,
                    modifier = Modifier.weight(1f),
                )
                Spacer(Modifier.width(12.dp))
                Text(
                    if (row.free) "Free" else "${row.cost} cr",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = if (row.free) DesignTokens.OnSurfaceVariant else DesignTokens.Secondary,
                )
            }
            if (index < CREDIT_USAGE_ROWS.lastIndex) {
                HorizontalDivider(color = DesignTokens.SurfaceContainerHigh, thickness = 1.dp)
            }
        }
        Spacer(Modifier.height(12.dp))
        Text(
            "New accounts receive $FREE_STARTER_CREDITS free credits on registration.",
            style = MaterialTheme.typography.labelSmall,
            color = DesignTokens.OnSurfaceVariant,
        )
    }
}

/** Localized per-credit price from Play's price micros, or null if unavailable. */
private fun perCreditPrice(details: ProductDetails, credits: Int?): String? {
    val offer = details.oneTimePurchaseOfferDetails ?: return null
    if (credits == null || credits <= 0) return null
    val micros = offer.priceAmountMicros
    if (micros <= 0) return null
    val amount = micros / 1_000_000.0 / credits
    return try {
        NumberFormat.getCurrencyInstance().apply {
            currency = Currency.getInstance(offer.priceCurrencyCode)
            maximumFractionDigits = 2
        }.format(amount)
    } catch (_: Exception) {
        null
    }
}
