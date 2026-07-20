package com.inkflow.ai.core

/** Mirrors src/lib/signature-bases.ts — 50 templates, 10 free, 40 premium. */
enum class Tier { FREE, PREMIUM }

data class SignatureBase(
    val id: String,
    val name: String,
    val blurb: String,
    /** Google Fonts family name, resolved at runtime via downloadable fonts. */
    val fontFamily: String,
    val tier: Tier,
    val category: String,
    val fluidity: Double,
    val rhythm: Double,
    val pressure: Double,
    val slant: Double,
    val size: Double,
)

private typealias T = SignatureBase

object SignatureBases {
    val all: List<SignatureBase> = listOf(
        T("poet", "The Poet", "Fluid, expressive", "Great Vibes", Tier.FREE, "artistic", 85.0, 60.0, 55.0, 8.0, 1.0),
        T("classic", "The Classic", "Light, casual", "Sacramento", Tier.FREE, "classic", 65.0, 70.0, 30.0, 4.0, 1.1),
        T("architect", "The Architect", "Precise, angular", "Tangerine", Tier.FREE, "business", 45.0, 90.0, 35.0, 2.0, 1.35),
        T("executive", "The Executive", "Bold, decisive", "Yellowtail", Tier.FREE, "business", 70.0, 75.0, 80.0, 10.0, 0.95),
        T("scribe", "The Scribe", "Neat, readable", "Cedarville Cursive", Tier.FREE, "business", 55.0, 82.0, 40.0, 5.0, 1.05),
        T("signer", "The Signer", "Friendly script", "Dancing Script", Tier.FREE, "expressive", 72.0, 65.0, 45.0, 6.0, 1.08),
        T("minimal", "The Minimalist", "Clean, modern", "Caveat", Tier.FREE, "classic", 50.0, 88.0, 28.0, 2.0, 1.15),
        T("formal", "The Formalist", "Refined, upright", "Italianno", Tier.FREE, "business", 58.0, 78.0, 38.0, 3.0, 1.2),
        T("clerk", "The Clerk", "Everyday practical", "Patrick Hand", Tier.FREE, "business", 48.0, 80.0, 32.0, 1.0, 1.1),
        T("draft", "The Drafter", "Quick, natural", "Indie Flower", Tier.FREE, "expressive", 62.0, 58.0, 36.0, 5.0, 1.05),
        T("romantic", "The Romantic", "Soft, looping", "Parisienne", Tier.PREMIUM, "artistic", 78.0, 55.0, 50.0, 6.0, 1.05),
        T("bold", "The Maverick", "Round, confident", "Pacifico", Tier.PREMIUM, "expressive", 60.0, 85.0, 90.0, 0.0, 0.8),
        T("maestro", "The Maestro", "Sweeping elegance", "Allura", Tier.PREMIUM, "artistic", 88.0, 58.0, 52.0, 9.0, 1.02),
        T("virtuoso", "The Virtuoso", "Brush-like flair", "Alex Brush", Tier.PREMIUM, "artistic", 82.0, 62.0, 58.0, 7.0, 1.12),
        T("noble", "The Noble", "Regal thin strokes", "Pinyon Script", Tier.PREMIUM, "classic", 75.0, 72.0, 42.0, 5.0, 1.18),
        T("heritage", "The Heritage", "Vintage calligraphy", "Mr De Haviland", Tier.PREMIUM, "classic", 80.0, 50.0, 48.0, 4.0, 1.25),
        T("flourish", "The Flourish", "Ornate swashes", "Bilbo Swash Caps", Tier.PREMIUM, "expressive", 90.0, 48.0, 62.0, 6.0, 0.92),
        T("dynasty", "The Dynasty", "Powerful curves", "Kaushan Script", Tier.PREMIUM, "expressive", 68.0, 70.0, 85.0, 8.0, 0.88),
        T("couture", "The Couture", "Fashion editorial", "Mrs Saint Delafield", Tier.PREMIUM, "artistic", 86.0, 52.0, 44.0, 5.0, 1.15),
        T("regal", "The Regal", "Ceremonial grace", "Petit Formal Script", Tier.PREMIUM, "classic", 76.0, 68.0, 46.0, 4.0, 1.08),
        T("sapphire", "The Sapphire", "Jewel-toned flow", "Rouge Script", Tier.PREMIUM, "artistic", 84.0, 54.0, 50.0, 7.0, 1.06),
        T("velvet", "The Velvet", "Dramatic romance", "Lovers Quarrel", Tier.PREMIUM, "artistic", 79.0, 46.0, 55.0, 6.0, 1.22),
        T("amber", "The Amber", "Warm retro ink", "Satisfy", Tier.PREMIUM, "expressive", 66.0, 64.0, 72.0, 5.0, 0.94),
        T("ivory", "The Ivory", "Whisper-light touch", "La Belle Aurore", Tier.PREMIUM, "classic", 74.0, 60.0, 34.0, 3.0, 1.2),
        T("obsidian", "The Obsidian", "Sharp contrast", "Aguafina Script", Tier.PREMIUM, "business", 71.0, 76.0, 68.0, 9.0, 0.98),
        T("ember", "The Ember", "Fiery energy", "Euphoria Script", Tier.PREMIUM, "expressive", 83.0, 56.0, 60.0, 8.0, 1.04),
        T("silk", "The Silk", "Silken glide", "Qwitcher Grypen", Tier.PREMIUM, "artistic", 87.0, 50.0, 47.0, 5.0, 1.1),
        T("bronze", "The Bronze", "Sturdy character", "Ranga", Tier.PREMIUM, "business", 58.0, 84.0, 74.0, 6.0, 0.96),
        T("crystal", "The Crystal", "Clear refinement", "Marck Script", Tier.PREMIUM, "classic", 77.0, 66.0, 43.0, 4.0, 1.14),
        T("platinum", "The Platinum", "Polished luxury", "Niconne", Tier.PREMIUM, "classic", 73.0, 70.0, 41.0, 3.0, 1.16),
        T("garnet", "The Garnet", "Deep richness", "Felipa", Tier.PREMIUM, "artistic", 81.0, 57.0, 53.0, 7.0, 1.07),
        T("pearl", "The Pearl", "Lustrous finesse", "Rochester", Tier.PREMIUM, "classic", 69.0, 74.0, 39.0, 2.0, 1.19),
        T("onyx", "The Onyx", "Dark elegance", "Sevillana", Tier.PREMIUM, "artistic", 85.0, 49.0, 57.0, 6.0, 1.01),
        T("ruby", "The Ruby", "Vivid personality", "Condiment", Tier.PREMIUM, "expressive", 64.0, 68.0, 82.0, 7.0, 0.9),
        T("jade", "The Jade", "Calm balance", "Sue Ellen Francisco", Tier.PREMIUM, "classic", 72.0, 71.0, 37.0, 3.0, 1.13),
        T("coral", "The Coral", "Playful bounce", "Meow Script", Tier.PREMIUM, "expressive", 76.0, 59.0, 51.0, 8.0, 1.0),
        T("slate", "The Slate", "Understated cool", "Nothing You Could Do", Tier.PREMIUM, "business", 52.0, 86.0, 31.0, 1.0, 1.12),
        T("zenith", "The Zenith", "Peak sophistication", "Kristi", Tier.PREMIUM, "artistic", 80.0, 53.0, 49.0, 5.0, 1.17),
        T("horizon", "The Horizon", "Wide open flow", "Over the Rainbow", Tier.PREMIUM, "expressive", 70.0, 61.0, 46.0, 6.0, 1.09),
        T("eclipse", "The Eclipse", "Mysterious depth", "Fondamento", Tier.PREMIUM, "classic", 67.0, 73.0, 44.0, 4.0, 1.11),
        T("aurora", "The Aurora", "Northern shimmer", "Ballet", Tier.PREMIUM, "artistic", 89.0, 47.0, 40.0, 5.0, 1.21),
        T("monarch", "The Monarch", "Royal swash", "Berkshire Swash", Tier.PREMIUM, "classic", 78.0, 63.0, 56.0, 5.0, 1.05),
        T("legend", "The Legend", "Iconic presence", "Clicker Script", Tier.PREMIUM, "expressive", 63.0, 77.0, 78.0, 9.0, 0.93),
        T("muse", "The Muse", "Inspired curves", "Norican", Tier.PREMIUM, "artistic", 86.0, 51.0, 48.0, 6.0, 1.03),
        T("oracle", "The Oracle", "Wise restraint", "Delius", Tier.PREMIUM, "classic", 61.0, 79.0, 35.0, 2.0, 1.18),
        T("palace", "The Palace", "Grand hall ink", "MonteCarlo", Tier.PREMIUM, "classic", 74.0, 67.0, 45.0, 4.0, 1.15),
        T("summit", "The Summit", "Elevated mark", "Princess Sofia", Tier.PREMIUM, "artistic", 82.0, 55.0, 42.0, 5.0, 1.08),
        T("vista", "The Vista", "Panoramic sweep", "Whisper", Tier.PREMIUM, "expressive", 88.0, 44.0, 38.0, 4.0, 1.24),
        T("charm", "The Charm", "Effortless appeal", "Charm", Tier.PREMIUM, "expressive", 75.0, 62.0, 47.0, 7.0, 1.06),
        T("grace", "The Grace", "Timeless poise", "Gwendolyn", Tier.PREMIUM, "classic", 79.0, 65.0, 43.0, 3.0, 1.14),    )

    val free: List<SignatureBase> = all.filter { it.tier == Tier.FREE }

    fun find(id: String): SignatureBase =
        all.firstOrNull { it.id == id } ?: all.first()

    fun byTier(tier: Tier?): List<SignatureBase> =
        if (tier == null) all else all.filter { it.tier == tier }

    val freeCount: Int get() = all.count { it.tier == Tier.FREE }
    val premiumCount: Int get() = all.count { it.tier == Tier.PREMIUM }
}
