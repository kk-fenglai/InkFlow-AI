export type TemplateTier = "free" | "premium";
export type TemplateCategory =
  | "business"
  | "artistic"
  | "classic"
  | "expressive";

export interface ArtistBase {
  id: string;
  name: string;
  blurb: string;
  fontFamily: string;
  tier: TemplateTier;
  category: TemplateCategory;
  defaults: {
    fluidity: number;
    rhythm: number;
    pressure: number;
    slant: number;
    size: number;
  };
  previewClass: string;
  refImage?: string;
}

function base(
  id: string,
  name: string,
  blurb: string,
  fontFamily: string,
  tier: TemplateTier,
  category: TemplateCategory,
  defaults: ArtistBase["defaults"],
  refImage?: string,
): ArtistBase {
  return {
    id,
    name,
    blurb,
    fontFamily,
    tier,
    category,
    defaults,
    previewClass: `font-sig-${id}`,
    refImage,
  };
}

/** 50 signature templates — 10 free, 40 premium (1 credit unlock each). */
export const ARTIST_BASES = [
  base("poet", "The Poet", "Fluid, expressive", "'Great Vibes', cursive", "free", "artistic", { fluidity: 85, rhythm: 60, pressure: 55, slant: 8, size: 1 }, "/images/base-poet.png"),
  base("classic", "The Classic", "Light, casual", "'Sacramento', cursive", "free", "classic", { fluidity: 65, rhythm: 70, pressure: 30, slant: 4, size: 1.1 }),
  base("architect", "The Architect", "Precise, angular", "'Tangerine', cursive", "free", "business", { fluidity: 45, rhythm: 90, pressure: 35, slant: 2, size: 1.35 }, "/images/base-architect.png"),
  base("executive", "The Executive", "Bold, decisive", "'Yellowtail', cursive", "free", "business", { fluidity: 70, rhythm: 75, pressure: 80, slant: 10, size: 0.95 }, "/images/base-executive.png"),
  base("scribe", "The Scribe", "Neat, readable", "'Cedarville Cursive', cursive", "free", "business", { fluidity: 55, rhythm: 82, pressure: 40, slant: 5, size: 1.05 }),
  base("signer", "The Signer", "Friendly script", "'Dancing Script', cursive", "free", "expressive", { fluidity: 72, rhythm: 65, pressure: 45, slant: 6, size: 1.08 }),
  base("minimal", "The Minimalist", "Clean, modern", "'Caveat', cursive", "free", "classic", { fluidity: 50, rhythm: 88, pressure: 28, slant: 2, size: 1.15 }),
  base("formal", "The Formalist", "Refined, upright", "'Italianno', cursive", "free", "business", { fluidity: 58, rhythm: 78, pressure: 38, slant: 3, size: 1.2 }),
  base("clerk", "The Clerk", "Everyday practical", "'Patrick Hand', cursive", "free", "business", { fluidity: 48, rhythm: 80, pressure: 32, slant: 1, size: 1.1 }),
  base("draft", "The Drafter", "Quick, natural", "'Indie Flower', cursive", "free", "expressive", { fluidity: 62, rhythm: 58, pressure: 36, slant: 5, size: 1.05 }),
  base("romantic", "The Romantic", "Soft, looping", "'Parisienne', cursive", "premium", "artistic", { fluidity: 78, rhythm: 55, pressure: 50, slant: 6, size: 1.05 }),
  base("bold", "The Maverick", "Round, confident", "'Pacifico', cursive", "premium", "expressive", { fluidity: 60, rhythm: 85, pressure: 90, slant: 0, size: 0.8 }),
  base("maestro", "The Maestro", "Sweeping elegance", "'Allura', cursive", "premium", "artistic", { fluidity: 88, rhythm: 58, pressure: 52, slant: 9, size: 1.02 }),
  base("virtuoso", "The Virtuoso", "Brush-like flair", "'Alex Brush', cursive", "premium", "artistic", { fluidity: 82, rhythm: 62, pressure: 58, slant: 7, size: 1.12 }),
  base("noble", "The Noble", "Regal thin strokes", "'Pinyon Script', cursive", "premium", "classic", { fluidity: 75, rhythm: 72, pressure: 42, slant: 5, size: 1.18 }),
  base("heritage", "The Heritage", "Vintage calligraphy", "'Mr De Haviland', cursive", "premium", "classic", { fluidity: 80, rhythm: 50, pressure: 48, slant: 4, size: 1.25 }),
  base("flourish", "The Flourish", "Ornate swashes", "'Bilbo Swash Caps', cursive", "premium", "expressive", { fluidity: 90, rhythm: 48, pressure: 62, slant: 6, size: 0.92 }),
  base("dynasty", "The Dynasty", "Powerful curves", "'Kaushan Script', cursive", "premium", "expressive", { fluidity: 68, rhythm: 70, pressure: 85, slant: 8, size: 0.88 }),
  base("couture", "The Couture", "Fashion editorial", "'Mrs Saint Delafield', cursive", "premium", "artistic", { fluidity: 86, rhythm: 52, pressure: 44, slant: 5, size: 1.15 }),
  base("regal", "The Regal", "Ceremonial grace", "'Petit Formal Script', cursive", "premium", "classic", { fluidity: 76, rhythm: 68, pressure: 46, slant: 4, size: 1.08 }),
  base("sapphire", "The Sapphire", "Jewel-toned flow", "'Rouge Script', cursive", "premium", "artistic", { fluidity: 84, rhythm: 54, pressure: 50, slant: 7, size: 1.06 }),
  base("velvet", "The Velvet", "Dramatic romance", "'Lovers Quarrel', cursive", "premium", "artistic", { fluidity: 79, rhythm: 46, pressure: 55, slant: 6, size: 1.22 }),
  base("amber", "The Amber", "Warm retro ink", "'Satisfy', cursive", "premium", "expressive", { fluidity: 66, rhythm: 64, pressure: 72, slant: 5, size: 0.94 }),
  base("ivory", "The Ivory", "Whisper-light touch", "'La Belle Aurore', cursive", "premium", "classic", { fluidity: 74, rhythm: 60, pressure: 34, slant: 3, size: 1.2 }),
  base("obsidian", "The Obsidian", "Sharp contrast", "'Aguafina Script', cursive", "premium", "business", { fluidity: 71, rhythm: 76, pressure: 68, slant: 9, size: 0.98 }),
  base("ember", "The Ember", "Fiery energy", "'Euphoria Script', cursive", "premium", "expressive", { fluidity: 83, rhythm: 56, pressure: 60, slant: 8, size: 1.04 }),
  base("silk", "The Silk", "Silken glide", "'Qwitcher Grypen', cursive", "premium", "artistic", { fluidity: 87, rhythm: 50, pressure: 47, slant: 5, size: 1.1 }),
  base("bronze", "The Bronze", "Sturdy character", "'Ranga', cursive", "premium", "business", { fluidity: 58, rhythm: 84, pressure: 74, slant: 6, size: 0.96 }),
  base("crystal", "The Crystal", "Clear refinement", "'Marck Script', cursive", "premium", "classic", { fluidity: 77, rhythm: 66, pressure: 43, slant: 4, size: 1.14 }),
  base("platinum", "The Platinum", "Polished luxury", "'Niconne', cursive", "premium", "classic", { fluidity: 73, rhythm: 70, pressure: 41, slant: 3, size: 1.16 }),
  base("garnet", "The Garnet", "Deep richness", "'Felipa', cursive", "premium", "artistic", { fluidity: 81, rhythm: 57, pressure: 53, slant: 7, size: 1.07 }),
  base("pearl", "The Pearl", "Lustrous finesse", "'Rochester', cursive", "premium", "classic", { fluidity: 69, rhythm: 74, pressure: 39, slant: 2, size: 1.19 }),
  base("onyx", "The Onyx", "Dark elegance", "'Sevillana', cursive", "premium", "artistic", { fluidity: 85, rhythm: 49, pressure: 57, slant: 6, size: 1.01 }),
  base("ruby", "The Ruby", "Vivid personality", "'Condiment', cursive", "premium", "expressive", { fluidity: 64, rhythm: 68, pressure: 82, slant: 7, size: 0.9 }),
  base("jade", "The Jade", "Calm balance", "'Sue Ellen Francisco', cursive", "premium", "classic", { fluidity: 72, rhythm: 71, pressure: 37, slant: 3, size: 1.13 }),
  base("coral", "The Coral", "Playful bounce", "'Meow Script', cursive", "premium", "expressive", { fluidity: 76, rhythm: 59, pressure: 51, slant: 8, size: 1.0 }),
  base("slate", "The Slate", "Understated cool", "'Nothing You Could Do', cursive", "premium", "business", { fluidity: 52, rhythm: 86, pressure: 31, slant: 1, size: 1.12 }),
  base("zenith", "The Zenith", "Peak sophistication", "'Kristi', cursive", "premium", "artistic", { fluidity: 80, rhythm: 53, pressure: 49, slant: 5, size: 1.17 }),
  base("horizon", "The Horizon", "Wide open flow", "'Over the Rainbow', cursive", "premium", "expressive", { fluidity: 70, rhythm: 61, pressure: 46, slant: 6, size: 1.09 }),
  base("eclipse", "The Eclipse", "Mysterious depth", "'Fondamento', cursive", "premium", "classic", { fluidity: 67, rhythm: 73, pressure: 44, slant: 4, size: 1.11 }),
  base("aurora", "The Aurora", "Northern shimmer", "'Ballet', cursive", "premium", "artistic", { fluidity: 89, rhythm: 47, pressure: 40, slant: 5, size: 1.21 }),
  base("monarch", "The Monarch", "Royal swash", "'Berkshire Swash', cursive", "premium", "classic", { fluidity: 78, rhythm: 63, pressure: 56, slant: 5, size: 1.05 }),
  base("legend", "The Legend", "Iconic presence", "'Clicker Script', cursive", "premium", "expressive", { fluidity: 63, rhythm: 77, pressure: 78, slant: 9, size: 0.93 }),
  base("muse", "The Muse", "Inspired curves", "'Norican', cursive", "premium", "artistic", { fluidity: 86, rhythm: 51, pressure: 48, slant: 6, size: 1.03 }),
  base("oracle", "The Oracle", "Wise restraint", "'Delius', cursive", "premium", "classic", { fluidity: 61, rhythm: 79, pressure: 35, slant: 2, size: 1.18 }),
  base("palace", "The Palace", "Grand hall ink", "'MonteCarlo', cursive", "premium", "classic", { fluidity: 74, rhythm: 67, pressure: 45, slant: 4, size: 1.15 }),
  base("summit", "The Summit", "Elevated mark", "'Princess Sofia', cursive", "premium", "artistic", { fluidity: 82, rhythm: 55, pressure: 42, slant: 5, size: 1.08 }),
  base("vista", "The Vista", "Panoramic sweep", "'Whisper', cursive", "premium", "expressive", { fluidity: 88, rhythm: 44, pressure: 38, slant: 4, size: 1.24 }),
  base("charm", "The Charm", "Effortless appeal", "'Charm', cursive", "premium", "expressive", { fluidity: 75, rhythm: 62, pressure: 47, slant: 7, size: 1.06 }),
  base("grace", "The Grace", "Timeless poise", "'Gwendolyn', cursive", "premium", "classic", { fluidity: 79, rhythm: 65, pressure: 43, slant: 3, size: 1.14 }),
] as const satisfies readonly ArtistBase[];

export type ArtistBaseId = (typeof ARTIST_BASES)[number]["id"];

export const ARTIST_BASE_IDS: readonly ArtistBaseId[] = ARTIST_BASES.map(
  (b) => b.id,
);
