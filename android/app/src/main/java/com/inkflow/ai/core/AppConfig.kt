package com.inkflow.ai.core

object AppConfig {
    const val API_BASE_URL = com.inkflow.ai.BuildConfig.API_BASE_URL

    val productIds = listOf(
        "com.inkflow.ai.credits.20",
        "com.inkflow.ai.credits.50",
        "com.inkflow.ai.credits.120",
        "com.inkflow.ai.pro.monthly",
    )

    val subscriptionIds = setOf("com.inkflow.ai.pro.monthly")
}
