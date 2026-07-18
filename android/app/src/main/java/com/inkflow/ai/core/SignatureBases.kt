package com.inkflow.ai.core

data class SignatureBase(
    val id: String,
    val name: String,
    val fluidity: Double,
    val rhythm: Double,
    val pressure: Double,
    val slant: Double,
    val size: Double,
)

object SignatureBases {
    val free = listOf(
        SignatureBase("poet", "The Poet", 85.0, 60.0, 55.0, 8.0, 1.0),
        SignatureBase("classic", "The Classic", 65.0, 70.0, 30.0, 4.0, 1.1),
        SignatureBase("architect", "The Architect", 45.0, 90.0, 35.0, 2.0, 1.35),
        SignatureBase("executive", "The Executive", 70.0, 75.0, 80.0, 10.0, 0.95),
        SignatureBase("scribe", "The Scribe", 55.0, 82.0, 40.0, 5.0, 1.05),
        SignatureBase("signer", "The Signer", 72.0, 65.0, 45.0, 6.0, 1.08),
        SignatureBase("minimal", "The Minimalist", 50.0, 88.0, 28.0, 2.0, 1.15),
        SignatureBase("formal", "The Formalist", 58.0, 78.0, 38.0, 3.0, 1.2),
        SignatureBase("clerk", "The Clerk", 48.0, 80.0, 32.0, 1.0, 1.1),
        SignatureBase("draft", "The Drafter", 62.0, 58.0, 36.0, 5.0, 1.05),
    )

    fun find(id: String): SignatureBase = free.firstOrNull { it.id == id } ?: free.first()
}
