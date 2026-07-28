package com.inkflow.ai.core

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.acknowledgePurchase
import com.android.billingclient.api.consumePurchase
import com.android.billingclient.api.queryProductDetails
import com.android.billingclient.api.queryPurchasesAsync
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

class BillingManager(
    context: Context,
    private val api: ApiClient,
) : PurchasesUpdatedListener {
    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val _purchaseEvents = MutableSharedFlow<PurchaseEvent>(extraBufferCapacity = 8)
    val purchaseEvents: SharedFlow<PurchaseEvent> = _purchaseEvents

    private val billingClient = BillingClient.newBuilder(appContext)
        .setListener(this)
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
        )
        .build()

    sealed class PurchaseEvent {
        data class Success(val message: String, val credits: Int?, val plan: String?) : PurchaseEvent()
        data class Error(val message: String) : PurchaseEvent()
        data object Cancelled : PurchaseEvent()
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        scope.launch {
            when (result.responseCode) {
                BillingClient.BillingResponseCode.OK -> {
                    purchases.orEmpty().forEach { purchase ->
                        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                            fulfillAndEmit(purchase)
                        }
                    }
                }
                BillingClient.BillingResponseCode.USER_CANCELED -> {
                    _purchaseEvents.emit(PurchaseEvent.Cancelled)
                }
                else -> {
                    _purchaseEvents.emit(
                        PurchaseEvent.Error(result.debugMessage.ifBlank { "Purchase failed" }),
                    )
                }
            }
        }
    }

    suspend fun ensureConnected(): Boolean {
        if (billingClient.isReady) return true
        return suspendCancellableCoroutine { cont ->
            billingClient.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(billingResult: BillingResult) {
                    if (cont.isActive) {
                        cont.resume(billingResult.responseCode == BillingClient.BillingResponseCode.OK)
                    }
                }

                override fun onBillingServiceDisconnected() = Unit
            })
        }
    }

    suspend fun queryProducts(): List<ProductDetails> {
        if (!ensureConnected()) return emptyList()
        val inappIds = AppConfig.productIds.filter { it !in AppConfig.subscriptionIds }
        val inapp = queryByType(BillingClient.ProductType.INAPP, inappIds)
        val subs = queryByType(BillingClient.ProductType.SUBS, AppConfig.subscriptionIds.toList())
        return (inapp + subs).sortedBy { it.productId }
    }

    private suspend fun queryByType(type: String, ids: List<String>): List<ProductDetails> {
        if (ids.isEmpty()) return emptyList()
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                ids.map {
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(it)
                        .setProductType(type)
                        .build()
                },
            )
            .build()
        val result = billingClient.queryProductDetails(params)
        if (result.billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            return emptyList()
        }
        return result.productDetailsList.orEmpty()
    }

    fun launchPurchase(activity: Activity, details: ProductDetails): Boolean {
        val productParams = if (details.productType == BillingClient.ProductType.SUBS) {
            val offer = details.subscriptionOfferDetails?.firstOrNull() ?: return false
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .setOfferToken(offer.offerToken)
                .build()
        } else {
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .build()
        }
        val flow = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productParams))
            .build()
        val result = billingClient.launchBillingFlow(activity, flow)
        return result.responseCode == BillingClient.BillingResponseCode.OK
    }

    suspend fun restorePurchases(): String {
        if (!ensureConnected()) return "Billing unavailable"
        var count = 0
        var lastCredits: Int? = null
        var lastPlan: String? = null
        listOf(BillingClient.ProductType.INAPP, BillingClient.ProductType.SUBS).forEach { type ->
            val result = billingClient.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(type).build(),
            )
            if (result.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                result.purchasesList.forEach { purchase ->
                    if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                        val fulfilled = fulfillPurchase(purchase)
                        if (fulfilled != null) {
                            count++
                            lastCredits = fulfilled.credits
                            lastPlan = fulfilled.plan
                        }
                    }
                }
            }
        }
        return if (count > 0) {
            _purchaseEvents.emit(
                PurchaseEvent.Success("Restored $count purchase(s)", lastCredits, lastPlan),
            )
            "Restored $count purchase(s)"
        } else {
            "No purchases to restore"
        }
    }

    fun endConnection() {
        billingClient.endConnection()
    }

    private suspend fun fulfillAndEmit(purchase: Purchase) {
        val fulfilled = fulfillPurchase(purchase)
        if (fulfilled != null) {
            val msg = if ((fulfilled.creditsGranted ?: 0) > 0) {
                "+${fulfilled.creditsGranted} credits"
            } else {
                "Purchase applied"
            }
            _purchaseEvents.emit(PurchaseEvent.Success(msg, fulfilled.credits, fulfilled.plan))
        } else {
            _purchaseEvents.emit(PurchaseEvent.Error("Could not verify purchase"))
        }
    }

    private data class Fulfilled(
        val creditsGranted: Int?,
        val credits: Int?,
        val plan: String?,
    )

    private suspend fun fulfillPurchase(purchase: Purchase): Fulfilled? {
        val productId = purchase.products.firstOrNull() ?: return null
        val type = if (productId in AppConfig.subscriptionIds) "subs" else "inapp"
        return try {
            val res = api.verifyGooglePurchase(productId, purchase.purchaseToken, type)
            if (res.ok || res.reason == "already_completed") {
                if (type == "inapp") {
                    // Credit packs are consumables: consuming (which also acknowledges)
                    // is what makes the pack buyable again.
                    billingClient.consumePurchase(
                        ConsumeParams.newBuilder()
                            .setPurchaseToken(purchase.purchaseToken)
                            .build(),
                    )
                } else if (!purchase.isAcknowledged) {
                    billingClient.acknowledgePurchase(
                        AcknowledgePurchaseParams.newBuilder()
                            .setPurchaseToken(purchase.purchaseToken)
                            .build(),
                    )
                }
                Fulfilled(res.creditsGranted, res.credits, res.plan)
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }
    }
}
