import type { SoundBiteRequest } from "schema";

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

export function buildEntityVoicePrompt(request: SoundBiteRequest): string {
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

export function buildScholarVoicePrompt(request: SoundBiteRequest): string {
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
