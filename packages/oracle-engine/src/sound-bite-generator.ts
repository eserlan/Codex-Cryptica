/**
 * Sound Bite Generator
 *
 * Orchestrates the full sound bite pipeline:
 *   1. Build a Gemini generation prompt from entity lore + vault context
 *   2. Parse structured JSON: transcript + voice profile + optional scholar attribution
 *   3. Synthesize audio via TTS (Gemini 2.5 Flash Preview TTS or Web Speech API fallback)
 *   4. Return a SoundBiteResult
 *
 * Persistence is the caller's responsibility — this module only generates.
 */

import type {
  SoundBiteGenerationService,
  SoundBiteRequest,
  SoundBiteResult,
  SoundBiteVoiceMode,
  ScholarAttribution,
  VoiceProfile as SchemaVoiceProfile,
  ContextRetrievalService,
  TextGenerationService,
} from "schema";

// ─── Error classes ────────────────────────────────────────────────────────────

export class SoundBiteGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SoundBiteGenerationError";
  }
}

export class SoundBiteContentPolicyError extends SoundBiteGenerationError {
  constructor(
    message = "Couldn't generate a sound bite for this entity. Try enriching its lore.",
  ) {
    super(message);
    this.name = "SoundBiteContentPolicyError";
  }
}

// ─── Internal interfaces ──────────────────────────────────────────────────────

// Use the schema-defined VoiceProfile so the generator and saved entity share
// the same type. The alias keeps all existing internal code unchanged.
type VoiceProfile = SchemaVoiceProfile;

/** Internal parsed result from Gemini generation call */
interface GenerationOutput {
  transcript: string;
  voiceProfile: VoiceProfile;
  scholarAttribution?: ScholarAttribution;
}

/** TTS service interface — two implementations: Gemini and WebSpeech */
interface TTSService {
  synthesize(
    text: string,
    voiceProfile: VoiceProfile,
    apiKey: string,
  ): Promise<Blob | null>;
}

// ─── TTS implementations ──────────────────────────────────────────────────────

/**
 * GeminiTTSService — Advanced tier
 * Synthesizes audio via Gemini 2.5 Flash Preview TTS for rich voice control.
 */
class GeminiTTSService implements TTSService {
  async synthesize(
    text: string,
    voiceProfile: VoiceProfile,
    apiKey: string,
  ): Promise<Blob | null> {
    if (!apiKey) {
      console.warn("[GeminiTTS] No API key — skipping Gemini TTS");
      return null;
    }
    try {
      const voiceName = buildGeminiVoiceName(voiceProfile);
      const styleInstruction = buildVoiceStyleInstruction(voiceProfile);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

      const requestBody: Record<string, unknown> = {
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      };

      // Pass accent + tone to Gemini as a natural-language style instruction.
      // Gemini 2.5 Flash TTS honours this alongside the prebuilt voice name.
      if (styleInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: styleInstruction }],
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "(unreadable)");
        console.warn(
          `[GeminiTTS] HTTP ${response.status}: ${errBody.slice(0, 200)}`,
        );
        return null;
      }

      const json = await response.json();
      const audioData: string | undefined =
        json?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
      if (!audioData) {
        console.warn(
          "[GeminiTTS] Response OK but no audio data in payload:",
          JSON.stringify(json).slice(0, 300),
        );
        return null;
      }

      const mimeType: string =
        json?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.mime_type ??
        "audio/pcm";
      const sampleRate = parseInt(
        mimeType.match(/rate=(\d+)/i)?.[1] ?? "24000",
        10,
      );
      const binary = atob(audioData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return pcmBytesToWav(bytes, sampleRate);
    } catch (err) {
      console.warn("[GeminiTTS] synthesize threw:", err);
      return null;
    }
  }
}

/**
 * WebSpeechTTSService — Lite tier / offline fallback
 * Synthesizes audio via browser SpeechSynthesis with best-effort voice mapping.
 */
export class WebSpeechTTSService implements TTSService {
  async synthesize(
    text: string,
    voiceProfile: VoiceProfile,
    _apiKey: string,
  ): Promise<Blob | null> {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;

    return new Promise<Blob | null>((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        applyWebSpeechVoice(utterance, voiceProfile);
        utterance.onend = () => resolve(null);
        utterance.onerror = () => resolve(null);
        window.speechSynthesis.speak(utterance);
      } catch {
        resolve(null);
      }
    });
  }

  /** Called separately to just play audio without capturing a Blob */
  play(text: string, voiceProfile: VoiceProfile): void {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    applyWebSpeechVoice(utterance, voiceProfile);
    window.speechSynthesis.speak(utterance);
  }
}

// ─── Voice mapping helpers ────────────────────────────────────────────────────

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

function applyWebSpeechVoice(
  utterance: SpeechSynthesisUtterance,
  profile: VoiceProfile,
): void {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;

  const genderHint = profile.gender === "female" ? "female" : "male";
  const match = voices.find(
    (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes(genderHint),
  );
  if (match) utterance.voice = match;

  switch (profile.ageRange) {
    case "child":
      utterance.rate = 1.1;
      utterance.pitch = 1.5;
      break;
    case "young-adult":
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      break;
    case "middle-aged":
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      break;
    case "elder":
      utterance.rate = 0.85;
      utterance.pitch = 0.8;
      break;
  }
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

const MAX_LORE_CHARS = 2000;

/**
 * Instructions on inline audio delivery tags, included in every generation
 * prompt. The OPENING tag should establish accent + overall style so TTS
 * picks it up reliably — subsequent tags are for emotional shifts only.
 */
const AUDIO_TAG_INSTRUCTIONS = `
AUDIO DELIVERY TAGS (for the transcript field):
The TTS engine reads these inline tags to shape delivery. Two kinds:

1. OPENING STYLE TAG (required if the character has an accent or distinctive voice):
   Place a single descriptive tag at the very start of the transcript that establishes the character's accent, age, and overall tone. This is the TTS engine's primary cue for the voice.
   Examples:
     [elderly Hungarian scholar, measured and solemn] "The archives define…"
     [young gravelly-voiced rogue, conspiratorial] "Nobody saw me. Nobody ever does."
     [ancient elven queen, cold and imperious] "You dare address me directly?"
     [gruff Scottish blacksmith, exasperated] "I've told ye three times already!"
   If there's no accent and the tone is plain, you may omit the opening tag.

2. MOMENT TAGS (use sparingly — only for genuine tonal shifts or key emotional beats):
   Place [tag] immediately before the word or phrase it affects.
   Examples:
     "I've seen the abyss." [gravely] "It looked back."
     "Of course," [sarcastically] "that went exactly as planned."
     [barely containing rage] You dare show your face here?
     [barely audible] "…run."

Rules:
- The opening style tag counts as your one establishing tag — don't repeat the accent on every line
- Match text to emotion — if the words and tag agree, delivery sounds far more natural
- Use punctuation (!, ?, …, —) alongside moment tags for maximum effect
- You can be specific and creative: [slowly, like she's choosing every word], [like she's reading a death sentence]
- Do NOT wrap the entire transcript in a single moment tag
`.trim();

// Patterns that indicate a model refusal rather than a valid transcript.
const CONTENT_POLICY_SIGNALS = [
  /i(?:'m| am) unable to (generate|create|produce|write)/i,
  /i can(?:'t| not) (generate|create|produce|write)/i,
  /i(?:'ll| will) not (generate|create|produce|write)/i,
  /not able to generate/i,
  /this (request|content) (violates|goes against)/i,
];

function buildEntityVoicePrompt(request: SoundBiteRequest): string {
  const { entity } = request;
  const lore = [entity.content, entity.lore].filter(Boolean).join("\n\n");
  const truncatedLore =
    lore.length > MAX_LORE_CHARS ? lore.slice(0, MAX_LORE_CHARS) + "…" : lore;
  const labels = entity.labels?.join(", ") || "";

  return `You are generating a sound bite for a roleplaying game entity.

ENTITY:
Name: ${entity.title}
Type: ${entity.type}
Labels: ${labels || "none"}
Description:
${truncatedLore || "(No description provided — use the entity name and type to invent something fitting.)"}

TASK:
Write a short, evocative quote (1–3 sentences) IN THE FIRST PERSON, as if this entity is speaking directly. Capture their voice, personality, and essence.

Also infer voice synthesis parameters (voiceProfile) based on the entity's nature. If the entity has an accent, lead the transcript with an opening style tag that describes their accent, age, and tone (e.g. [elderly dwarvish smith, gruff and proud]) — this is the primary cue for the TTS engine. The voiceProfile "tone" mirrors the opening tag's global style; moment tags in the transcript handle shifts within the quote.

${AUDIO_TAG_INSTRUCTIONS}

Respond with ONLY valid JSON in this exact shape:
{
  "transcript": "<1-3 sentence first-person quote, with optional inline [delivery tags]>",
  "voiceProfile": {
    "gender": "male" | "female" | "neutral",
    "ageRange": "child" | "young-adult" | "middle-aged" | "elder",
    "accent": "<accent string or null>",
    "tone": "<overall delivery style, e.g. gruff, serene, commanding, whimsical>"
  }
}`;
}

function buildScholarVoicePrompt(request: SoundBiteRequest): string {
  const { entity, vaultEntitySummaries } = request;
  const lore = [entity.content, entity.lore].filter(Boolean).join("\n\n");
  const truncatedLore =
    lore.length > MAX_LORE_CHARS ? lore.slice(0, MAX_LORE_CHARS) + "…" : lore;
  const labels = entity.labels?.join(", ") || "";

  const vaultContext =
    vaultEntitySummaries.length > 0
      ? `\nKNOWN VAULT ENTITIES (potential scholars):\n${vaultEntitySummaries
          .slice(0, 20)
          .map((e) => `- ${e.title} (${e.type}): ${e.summary}`)
          .join("\n")}`
      : "";

  return `You are generating a scholar's sound bite for a roleplaying game entity.

SUBJECT ENTITY:
Name: ${entity.title}
Type: ${entity.type}
Labels: ${labels || "none"}
Description:
${truncatedLore || "(No description provided — use the entity name and type to invent something fitting.)"}
${vaultContext}

TASK:
1. If any of the Known Vault Entities could plausibly be an expert, historian, or scholar with knowledge of "${entity.title}", use one as the attributed scholar.
2. If no suitable vault entity exists, invent a contextually fitting scholar name and title (appropriate to the entity's subject matter, period, and world).
3. Write a short, evocative quote (1–3 sentences) IN THE THIRD PERSON, as if this named scholar is commenting on the subject entity. Make it sound authoritative and immersive.

If the scholar has an accent or distinctive regional voice, lead the transcript with an opening style tag (e.g. [aged Venetian archivist, precise and reverent]) — this is the primary cue for the TTS engine. The voiceProfile "tone" mirrors this global style; use additional moment tags only for genuine shifts within the quote.

${AUDIO_TAG_INSTRUCTIONS}

Respond with ONLY valid JSON in this exact shape:
{
  "transcript": "<1-3 sentence third-person scholarly quote, with optional inline [delivery tags]>",
  "voiceProfile": {
    "gender": "male" | "female" | "neutral",
    "ageRange": "child" | "young-adult" | "middle-aged" | "elder",
    "accent": "<accent string or null>",
    "tone": "<overall delivery style, e.g. scholarly, authoritative, reverent>"
  },
  "scholarAttribution": {
    "name": "<Scholar Name>",
    "title": "<Scholar Title or Role>"
  }
}`;
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function parseGenerationOutput(
  raw: string,
  voiceMode: SoundBiteVoiceMode,
): GenerationOutput {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new SoundBiteGenerationError(
      "Failed to parse sound bite response. Please try again.",
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).transcript !== "string" ||
    !(parsed as Record<string, unknown>).voiceProfile
  ) {
    throw new SoundBiteGenerationError(
      "Unexpected sound bite response shape. Please try again.",
    );
  }

  const obj = parsed as Record<string, unknown>;
  const vp = obj.voiceProfile as Record<string, unknown>;

  const voiceProfile: VoiceProfile = {
    gender: (["male", "female", "neutral"].includes(vp.gender as string)
      ? vp.gender
      : "neutral") as VoiceProfile["gender"],
    ageRange: (["child", "young-adult", "middle-aged", "elder"].includes(
      vp.ageRange as string,
    )
      ? vp.ageRange
      : "middle-aged") as VoiceProfile["ageRange"],
    accent: typeof vp.accent === "string" ? vp.accent : null,
    tone: typeof vp.tone === "string" ? vp.tone : "neutral",
  };

  const result: GenerationOutput = {
    transcript: (obj.transcript as string).trim(),
    voiceProfile,
  };

  if (voiceMode === "scholar" && obj.scholarAttribution) {
    const sa = obj.scholarAttribution as Record<string, unknown>;
    if (typeof sa.name === "string" && typeof sa.title === "string") {
      result.scholarAttribution = {
        name: sa.name.trim(),
        title: sa.title.trim(),
      };
    }
  }

  return result;
}

// ─── Logger interface ─────────────────────────────────────────────────────────

export interface SoundBiteLogger {
  log(msg: string, data?: unknown): void;
  warn(msg: string, data?: unknown): void;
  error(msg: string, data?: unknown): void;
}

const consoleLogger: SoundBiteLogger = {
  log: (msg, data) =>
    data !== undefined ? console.log(msg, data) : console.log(msg),
  warn: (msg, data) =>
    data !== undefined ? console.warn(msg, data) : console.warn(msg),
  error: (msg, data) =>
    data !== undefined ? console.error(msg, data) : console.error(msg),
};

// ─── SoundBiteGenerator ───────────────────────────────────────────────────────

export class SoundBiteGenerator implements SoundBiteGenerationService {
  private readonly logger: SoundBiteLogger;

  constructor(
    private readonly textGeneration: TextGenerationService,
    private readonly ttsService: TTSService,
    private readonly _contextRetrieval: ContextRetrievalService,
    logger?: SoundBiteLogger,
  ) {
    this.logger = logger ?? consoleLogger;
  }

  async generateSoundBite(
    apiKey: string,
    modelName: string,
    request: SoundBiteRequest,
    options?: { isGuest?: boolean; isDemoMode?: boolean },
  ): Promise<SoundBiteResult> {
    const L = this.logger;
    L.log(
      `[SoundBite] generateSoundBite start — entity="${request.entity.title}" voiceMode=${request.voiceMode} model=${modelName} apiKey=${apiKey ? apiKey.slice(0, 6) + "…" : "(empty)"} isGuest=${options?.isGuest} isDemoMode=${options?.isDemoMode}`,
    );

    if (options?.isGuest) {
      throw new SoundBiteGenerationError("Guests cannot generate sound bites.");
    }

    const prompt =
      request.voiceMode === "entity"
        ? buildEntityVoicePrompt(request)
        : buildScholarVoicePrompt(request);

    L.log(`[SoundBite] prompt built (${prompt.length} chars)`);

    let output: GenerationOutput;
    try {
      const raw = await this._callTextGeneration(
        apiKey,
        modelName,
        prompt,
        options?.isDemoMode,
      );
      L.log(
        `[SoundBite] raw response (${raw.length} chars): ${raw.slice(0, 300)}`,
      );
      output = parseGenerationOutput(raw, request.voiceMode);
      L.log(
        `[SoundBite] parse OK — transcript="${output.transcript.slice(0, 80)}"`,
      );
    } catch (err) {
      L.warn(`[SoundBite] first attempt failed`, err);
      if (err instanceof SoundBiteGenerationError) throw err;
      L.log(`[SoundBite] retrying with strict JSON prompt…`);
      try {
        const retryPrompt =
          prompt +
          "\n\nIMPORTANT: Respond with ONLY the JSON object. No markdown, no explanation.";
        const raw = await this._callTextGeneration(
          apiKey,
          modelName,
          retryPrompt,
          options?.isDemoMode,
        );
        output = parseGenerationOutput(raw, request.voiceMode);
        L.log(
          `[SoundBite] retry parse OK — transcript="${output.transcript.slice(0, 80)}"`,
        );
      } catch (retryErr) {
        L.error(`[SoundBite] retry also failed`, retryErr);
        if (retryErr instanceof SoundBiteGenerationError) throw retryErr;
        throw new SoundBiteGenerationError(
          "Couldn't generate a sound bite. Please try again.",
        );
      }
    }

    // If a saved voiceProfile was supplied (matching voice mode), use it for
    // TTS to preserve speaker timbre across regenerations. The LLM still
    // freely generates its own profile in JSON (used as fallback when absent).
    const effectiveVoiceProfile = request.voiceProfile ?? output.voiceProfile;

    let audioBlob: Blob | null = null;
    if (!options?.isDemoMode) {
      L.log(
        `[SoundBite] calling TTS synthesize — voice: ${effectiveVoiceProfile.gender} ${effectiveVoiceProfile.ageRange} (${effectiveVoiceProfile.tone})`,
      );
      audioBlob = await this.ttsService.synthesize(
        output.transcript,
        effectiveVoiceProfile,
        apiKey,
      );
      L.log(
        `[SoundBite] TTS result: ${audioBlob ? `Blob(${audioBlob.size}B)` : "null"}`,
      );
    }

    L.log(`[SoundBite] done ✓`);
    return {
      transcript: output.transcript,
      audioBlob,
      voiceMode: request.voiceMode,
      scholarAttribution: output.scholarAttribution,
      voiceProfile: effectiveVoiceProfile,
    };
  }

  private async _callTextGeneration(
    apiKey: string,
    modelName: string,
    prompt: string,
    isDemoMode?: boolean,
  ): Promise<string> {
    const L = this.logger;
    let collected = "";
    let chunkCount = 0;

    L.log(`[SoundBite] _callTextGeneration: invoking generateResponse…`);
    try {
      await this.textGeneration.generateResponse(
        apiKey,
        prompt,
        [],
        "",
        modelName,
        (partial) => {
          collected = partial;
          chunkCount++;
        },
        isDemoMode,
      );
    } catch (err) {
      L.error(`[SoundBite] textGeneration.generateResponse threw`, err);
      throw err;
    }

    L.log(
      `[SoundBite] generateResponse done — chunks=${chunkCount} totalChars=${collected.length}` +
        (collected.length
          ? ` first100="${collected.slice(0, 100)}"`
          : " (empty response)"),
    );

    if (!collected.trim()) {
      L.error(`[SoundBite] empty response from model`);
      throw new SoundBiteGenerationError(
        "Empty response from model. Please try again.",
      );
    }

    const matched = CONTENT_POLICY_SIGNALS.find((pattern) =>
      pattern.test(collected),
    );
    if (matched) {
      L.warn(`[SoundBite] content policy signal detected: ${matched}`);
      throw new SoundBiteContentPolicyError();
    }

    return collected;
  }
}

// ─── CascadingTTSService ──────────────────────────────────────────────────────

class CascadingTTSService implements TTSService {
  private readonly gemini = new GeminiTTSService();
  private readonly webSpeech = new WebSpeechTTSService();

  async synthesize(
    text: string,
    voiceProfile: VoiceProfile,
    apiKey: string,
  ): Promise<Blob | null> {
    if (apiKey) {
      const blob = await this.gemini.synthesize(text, voiceProfile, apiKey);
      if (blob) return blob;
      console.warn(
        "[CascadingTTS] Gemini TTS returned null — falling back to WebSpeech",
      );
    }
    console.log("[CascadingTTS] Using WebSpeech TTS");
    return this.webSpeech.synthesize(text, voiceProfile, apiKey);
  }
}

// ─── PCM → WAV helper ────────────────────────────────────────────────────────

/**
 * Wraps raw 16-bit signed little-endian mono PCM bytes in a RIFF/WAV container.
 * Gemini TTS always returns this format (audio/pcm;rate=24000).
 */
export function pcmBytesToWav(
  pcm: Uint8Array,
  sampleRate: number,
  numChannels = 1,
  bitsPerSample = 16,
): Blob {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(pcm);
  return new Blob([buffer], { type: "audio/wav" });
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getSoundBiteGenerator(
  textGeneration: TextGenerationService,
  contextRetrieval: ContextRetrievalService,
  ttsService?: TTSService,
  logger?: SoundBiteLogger,
): SoundBiteGenerator {
  return new SoundBiteGenerator(
    textGeneration,
    ttsService ?? new CascadingTTSService(),
    contextRetrieval,
    logger,
  );
}

// Re-export for convenience
export { type TTSService, type VoiceProfile, GeminiTTSService };
