import type { VoiceProfile } from "schema";

/**
 * Maps a VoiceProfile to one of the 28 Gemini prebuilt voice names.
 *
 * Female voices:
 *  Achernar    — soft, clear, professional; steady pacing
 *  Autonoe     — high-pitched, bright, animated, friendly
 *  Callirhoe   — elegant, smooth, measured, calm
 *  Despina     — energetic, snappy, conversational
 *  Erinome     — soft, quiet; excellent for whispering text
 *  Gacrux      — mid-range, assured, formal / authoritative
 *  Kore        — youthful, light, fluid conversationalist
 *  Laomedeia   — precise, rhythmic, academic delivery
 *  Leda        — deep, velvety feminine tone, rich presence
 *  Pulcherrima — highly melodic, expressive, storytelling weight
 *  Sulafat     — smooth, warm, natural
 *  Vindemiatrix— crisp, high-end definition, clear diction
 *  Zephyr      — airy, soft, modern, and light
 *
 * Male voices:
 *  Achird      — deep, authoritative, documentary style
 *  Algenib     — casual, modern, fast-paced mid-range
 *  Algieba     — introspective, slightly raspy, dramatic
 *  Alnilam     — bold, resonant, high-clarity broadcast
 *  Charon      — low, warm, heavily textured, deliberate
 *  Enceladus   — crisp, clear, technical announcer
 *  Fenrir      — low-register, gravelly, highly expressive
 *  Iapetus     — friendly, approachable, commercial
 *  Orus        — bright, clear, highly articulated
 *  Puck        — snappy, energetic, expressive character voice
 *  Rasalgethi  — rich, warm, grandfatherly / mature
 *  Sadachbia   — sharp, analytical, clean
 *  Sadaltager  — relaxed, smooth, lower-mid range
 *  Schedar     — direct, neutral, instructional
 *  Zubenelgenubi — heavy bass, deeply resonant, powerful
 */
export function buildGeminiVoiceName(profile: VoiceProfile): string {
  const tone = (profile.tone ?? "").toLowerCase();
  const { gender, ageRange } = profile;

  /** Returns true if any of the supplied patterns match the tone string. */
  const is = (...patterns: RegExp[]) => patterns.some((p) => p.test(tone));

  // ── Female ───────────────────────────────────────────────────────────────
  if (gender === "female") {
    if (ageRange === "child") return "Autonoe"; // bright, animated, friendly

    if (
      is(/whisper|hushed|murmur|muted|barely audible|soft.*quiet|quiet.*soft/)
    )
      return "Erinome"; // soft, quiet — assassins, spies, ghosts
    if (
      is(
        /ethereal|airy|fae|mystical|otherworldly|haunting|spectral|celestial|divine/,
      )
    )
      return "Zephyr"; // airy, soft — fairies, elementals, serene spirits
    if (
      is(/dark|sinister|menac|cold|cruel|deadly|venom|ruthless|imperious.*dark/)
    )
      return "Leda"; // deep, velvety — dark queens, villainess, sorceresses
    if (is(/scholarly|academic|learned|intellectual|analytical|methodical/))
      return "Laomedeia"; // precise, rhythmic — scholars, librarians, court mages
    if (
      is(
        /melodic|storytelling|theatrical|bardic|enchanting|performative|lyrical/,
      )
    )
      return "Pulcherrima"; // melodic, expressive — bards, seers, storytellers
    if (is(/energetic|fierce|spirited|brash|headstrong|snappy|bold.*voice/))
      return "Despina"; // energetic, snappy — warriors, merchants, adventurers
    if (is(/regal|imperious|commanding|formal|authoritative|stately/))
      return "Gacrux"; // assured, formal — nobles, guild masters, officials
    if (is(/elegant|refined|graceful|aristocratic|dignified|noble/))
      return "Callirhoe"; // elegant, smooth — aristocrats, high priestesses, diplomats
    if (is(/warm|nurturing|motherly|caring|gentle|kind/)) return "Sulafat"; // smooth, warm — healers, innkeepers, kindly figures
    if (is(/crisp|sharp.*diction|precise.*speech|articulate|clipped/))
      return "Vindemiatrix"; // crisp diction — commanders, precise speakers

    // Age-range defaults
    if (ageRange === "elder") return "Leda"; // deep, rich presence
    if (ageRange === "middle-aged") return "Achernar"; // soft, clear, professional
    return "Kore"; // youthful, light (young-adult)
  }

  // ── Male ─────────────────────────────────────────────────────────────────
  if (gender === "male") {
    if (ageRange === "child") return "Puck"; // snappy, energetic

    if (
      is(
        /booming|thunderous|bass|titanic|godlike|monstrous.*power|ancient.*power|overwhelming/,
      )
    )
      return "Zubenelgenubi"; // heavy bass — titans, demi-gods, ancient monsters
    if (
      is(
        /gravelly|raspy|grim|sinister|menac|dark|brutal|savage|vicious|fierce|aggressive|wrathful/,
      )
    )
      return "Fenrir"; // gravelly, expressive — villains, beasts, dark warriors
    if (
      is(
        /brooding|introspective|melancholic|dramatic|troubled|wistful|contemplative|fatalistic/,
      )
    )
      return "Algieba"; // slightly raspy, dramatic — anti-heroes, tragic figures
    if (
      is(
        /scholarly|analytical|intellectual|academic|technical|precise|methodical/,
      )
    )
      return "Sadachbia"; // sharp, analytical — wizards, tacticians, scholars
    if (
      is(
        /commanding|authoritative|resonant|herald|bold.*voice|declarative|imperious/,
      )
    )
      return "Alnilam"; // bold, resonant — heralds, battle priests, commanders
    if (is(/heroic|valiant|noble.*voice|bright.*voice|paladin|champion/))
      return "Orus"; // bright, articulate — paladins, champions, young nobles
    if (is(/warm|grandfatherly|fatherly|gentle.*wise|nurturing|avuncular/))
      return "Rasalgethi"; // warm, mature — sages, elder mentors, kindly figures
    if (is(/playful|mischiev|jovial|cheerful|witty|energetic.*voice|trickster/))
      return "Puck"; // snappy, expressive — bards, tricksters, young rogues
    if (is(/smooth|suave|charming|velvet|silken|persuasive|silver.?tongue/))
      return "Sadaltager"; // relaxed, smooth — diplomats, spies, silver-tongued rogues
    if (is(/casual|conversational|relaxed|modern|laid.?back|informal/))
      return "Algenib"; // casual, mid-range — merchants, common folk
    if (is(/friendly|approachable|amiable|affable|warm.*voice/))
      return "Iapetus"; // friendly — innkeepers, friendly NPCs

    // Age-range defaults
    if (ageRange === "elder") return "Charon"; // low, warm, deliberate — the classic sage
    if (ageRange === "middle-aged") return "Iapetus"; // friendly, approachable baseline
    return "Puck"; // young-adult default
  }

  // ── Neutral / unspecified ─────────────────────────────────────────────────
  if (is(/ethereal|mystical|airy|otherworldly/)) return "Zephyr";
  return "Kore"; // neutral default: youthful, light, fluid
}

/**
 * Build a natural-language speaking-style instruction for Gemini TTS.
 *
 * Passed as systemInstruction alongside the prebuilt voice name so Gemini
 * can shape accent, pacing, and emotional delivery beyond what the voice
 * preset alone provides. Returns null when there's nothing to say.
 */
export function buildVoiceStyleInstruction(
  profile: VoiceProfile,
): string | null {
  const parts: string[] = [];

  if (profile.accent) {
    parts.push(`Speak with a ${profile.accent} accent.`);
  }

  if (profile.tone) {
    parts.push(`Your speaking tone is ${profile.tone}.`);
  }

  switch (profile.ageRange) {
    case "elder":
      parts.push("Speak at a deliberate, measured pace with gravitas.");
      break;
    case "child":
      parts.push("Speak with an energetic, youthful voice at a quick pace.");
      break;
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
