package com.inkflow.ai.features.account

/**
 * Static presentation metadata for the Account pricing section. Google Play's
 * ProductDetails only carries a name and a localized price, so the descriptions,
 * credit counts, and badges are mirrored here from the website's pricing constants
 * (src/lib/constants.ts). Keep this copy in sync with the web.
 */

/** New accounts receive this many free credits on registration (FREE_STARTER_CREDITS). */
const val FREE_STARTER_CREDITS = 5

/** The Play product id of the Pro subscription — rendered apart from the credit packs. */
const val PRO_MONTHLY_PRODUCT_ID = "com.inkflow.ai.pro.monthly"

data class PackMeta(val credits: Int, val description: String, val badge: String?)

/** Keyed by Google Play product id (AppConfig.productIds), mirroring CREDIT_PACKS. */
val PACK_META: Map<String, PackMeta> = mapOf(
    "com.inkflow.ai.credits.20" to PackMeta(
        credits = 20,
        description = "Try final ink, cloud saves, and PDF signing.",
        badge = null,
    ),
    "com.inkflow.ai.credits.50" to PackMeta(
        credits = 50,
        description = "Best for regular studio use.",
        badge = "Best value",
    ),
    "com.inkflow.ai.credits.120" to PackMeta(
        credits = 120,
        description = "Volume pricing — includes commercial export rights.",
        badge = null,
    ),
)

/** Feature bullets for Studio Pro, mirroring SUBSCRIPTION_PLAN + PRICING_TIERS "pro". */
val PRO_FEATURES: List<String> = listOf(
    "120 credits every month",
    "Pro plan badge on account",
    "Manage billing anytime",
    "Cancel anytime",
)

data class UsageRow(val action: String, val cost: Int, val free: Boolean)

/** Credit-usage rows, mirroring CREDIT_USAGE_ITEMS. */
val CREDIT_USAGE_ROWS: List<UsageRow> = listOf(
    UsageRow("Render Final Ink (HD PNG)", 1, free = false),
    UsageRow("Refinement Workbench (PNG export)", 0, free = true),
    UsageRow("SVG vector export", 1, free = false),
    UsageRow("AI natural language tune (every 3 uses)", 1, free = false),
    UsageRow("Save to cloud (free templates)", 0, free = true),
    UsageRow("Save to cloud (premium templates)", 1, free = false),
    UsageRow("Premium template unlock (permanent)", 1, free = false),
    UsageRow("Sign PDF", 1, free = false),
    UsageRow("Live preview & watermarked export", 0, free = true),
    UsageRow("10 free signature templates", 0, free = true),
)
