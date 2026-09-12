/**
 * Public Personality generator (#2529).
 *
 * Produces a coherent, playable personality — what the character wants, how
 * they relate to others, what changes under pressure, how they speak, and
 * what contradiction makes them feel human — rather than a flat adjective
 * list. Follows the public-villain.ts shape: flat config, a JSON-schema
 * prompt with `### Heading` markdown sections, and a hand-assembled,
 * internally-consistent local fallback.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { formatCampaignContextBlock } from "./campaign-context";
import { factionConfig } from "./public-faction-constants";

export const personalityConfig = {
  // Genre uses the canonical 13-theme vocabulary directly (no per-generator
  // synonym mapping needed — see add-generator skill Part C step 0).
  genres: factionConfig.themes,
  roleHints: [
    "Random",
    "Ally / Companion",
    "Contact / Informant",
    "Rival",
    "Authority Figure",
    "Merchant / Service Provider",
    "Mentor",
    "Stranger the party meets once",
    "Player Character",
  ],
  temperaments: [
    "Random",
    "Calm",
    "Volatile",
    "Anxious",
    "Steady",
    "Restless",
    "Melancholic",
    "Buoyant",
  ],
  socialStyles: [
    "Random",
    "Warm and open",
    "Guarded",
    "Charming and performative",
    "Blunt",
    "Deferential",
    "Domineering",
    "Quietly observant",
  ],
  moralOutlooks: [
    "Random",
    "Rigid principle",
    "Pragmatic self-interest",
    "Loyalty above all",
    "Opportunistic",
    "Idealistic",
    "Fatalistic",
    "Transactional",
  ],
  emotionalOpenness: ["Random", "Very open", "Selectively open", "Closed off"],
  confidenceLevels: [
    "Random",
    "Quietly certain",
    "Outwardly bold, inwardly unsure",
    "Genuinely insecure",
    "Overcompensating",
  ],
  optimismSpectrum: [
    "Random",
    "Strongly optimistic",
    "Cautiously hopeful",
    "Neutral",
    "Cynical",
    "Strongly pessimistic",
  ],
  expressiveness: ["Random", "Reserved", "Measured", "Expressive", "Volatile"],
  cooperationStyles: [
    "Random",
    "Cooperative",
    "Independent",
    "Competitive",
    "Situational",
  ],
} as const;

export interface PersonalityGeneratorOptions {
  genre?: string;
  roleHint?: string;
  temperament?: string;
  socialStyle?: string;
  moralOutlook?: string;
  emotionalOpenness?: string;
  confidence?: string;
  optimism?: string;
  expressiveness?: string;
  cooperationStyle?: string;
  ageOrLifeStage?: string;
  relationshipContext?: string;
  concept?: string;
  campaignContext?: string;
}

export interface ResolvedPersonality {
  genre: string;
  roleHint: string;
  temperament: string;
  socialStyle: string;
  moralOutlook: string;
  emotionalOpenness: string;
  confidence: string;
  optimism: string;
  expressiveness: string;
  cooperationStyle: string;
  ageOrLifeStage?: string;
  relationshipContext?: string;
  concept?: string;
  campaignContext?: string;
  placeholderName: string;
}

function resolvePick(
  requested: string | undefined,
  options: readonly string[],
  rng: Rng,
): string {
  const real = options.filter((o) => o !== "Random");
  if (!requested || requested === "Random") return pickFrom(real, rng);
  return requested;
}

function resolvePersonality(
  options: PersonalityGeneratorOptions,
  rng: Rng,
): ResolvedPersonality {
  return {
    genre: options.genre || pickFrom(personalityConfig.genres, rng),
    roleHint: resolvePick(options.roleHint, personalityConfig.roleHints, rng),
    temperament: resolvePick(
      options.temperament,
      personalityConfig.temperaments,
      rng,
    ),
    socialStyle: resolvePick(
      options.socialStyle,
      personalityConfig.socialStyles,
      rng,
    ),
    moralOutlook: resolvePick(
      options.moralOutlook,
      personalityConfig.moralOutlooks,
      rng,
    ),
    emotionalOpenness: resolvePick(
      options.emotionalOpenness,
      personalityConfig.emotionalOpenness,
      rng,
    ),
    confidence: resolvePick(
      options.confidence,
      personalityConfig.confidenceLevels,
      rng,
    ),
    optimism: resolvePick(
      options.optimism,
      personalityConfig.optimismSpectrum,
      rng,
    ),
    expressiveness: resolvePick(
      options.expressiveness,
      personalityConfig.expressiveness,
      rng,
    ),
    cooperationStyle: resolvePick(
      options.cooperationStyle,
      personalityConfig.cooperationStyles,
      rng,
    ),
    ageOrLifeStage: options.ageOrLifeStage?.trim() || undefined,
    relationshipContext: options.relationshipContext?.trim() || undefined,
    concept: options.concept?.trim() || undefined,
    campaignContext: options.campaignContext?.trim() || undefined,
    placeholderName: generateName(rng),
  };
}

export interface PersonalityPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedPersonality;
}

/**
 * The generator's central quality bar (#2529): a flat trait list or the same
 * recurring archetype is a failure, not a valid output.
 */
const ARCHETYPE_VARIETY_GUARDRAIL = `Do not default to the same recurring archetype (most commonly "sarcastic but secretly caring", or "gruff exterior, heart of gold"). Vary the core behavioural pattern, the specific contradiction, and the pressure response across generations rather than reusing one recognisable type. The contradiction must arise from psychological sense, not be bolted on for novelty: a trait that produces its own opposite under specific conditions (loyalty that becomes suffocating possessiveness, generosity that is really discomfort with being owed nothing) reads as more human than two unrelated traits stapled together.`;

const COHERENCE_PASS = `Before returning, run a coherence pass: the drives, the virtue/flaw pair, the contradiction, the pressure response, the social behaviour, and the speech style must all describe the same person — someone reading only the roleplaying cues should recognise the same character described in the core personality line. The flaw must be a direct consequence of the virtue, not an unrelated weakness. The mannerism/tell must be restrained (one or two behavioural details, not a costume of quirks). Do not invent a repetitive catchphrase or verbal tic unless the options explicitly call for one. Do not assign trauma as the default explanation for the flaw or boundary unless the campaign context supports it.`;

/**
 * Guards against the failure mode where every section is internally coherent
 * but the piece as a whole just proves the same thesis six times over (user
 * feedback, 2026-09-12): Core Personality states the central tension, then
 * Drives, Virtue and Flaw, Contradiction, Under Pressure, and Social
 * Behaviour all restate it in slightly different words instead of adding new
 * information.
 */
const NON_REPETITION_GUARDRAIL = `Each section must add genuinely new behavioural information — do not restate the core personality, the drives, or the contradiction in different words section after section. Once a trait is established, later sections should show a new consequence or a different facet of it, not re-explain the trait itself: Drives should describe five distinct wants, not five phrasings of the same want; Social Behaviour should differentiate the four groups from each other, not just from the core description. Favour concrete, observable behaviour ("checks the exits twice, then makes himself stop") over psychological narration ("this reflects a fear of losing control") — one or two brief insight lines across the whole piece are plenty; if you notice yourself explaining what a behaviour "really means" more than twice, cut it back to the behaviour itself.`;

export function buildPersonalityPrompt(
  options: PersonalityGeneratorOptions = {},
  entityContext = "",
  sessionContext = "",
  rng: Rng = defaultRng,
): PersonalityPrompt {
  const resolved = resolvePersonality(options, rng);

  const entityContextBlock = entityContext.trim()
    ? `\n\nExisting character context (this is established fact — extend it, never contradict or overwrite it; the generated personality must be consistent with everything stated here):\n${entityContext.trim()}\n`
    : "";

  const userMessage = `Generate a coherent, playable character personality in JSON format. The result must answer "how do I portray this character at the table?", not just list adjectives. British English. System-neutral.
Options:
- Genre / Theme: ${resolved.genre}
- Role / Context: ${resolved.roleHint}
- Temperament: ${resolved.temperament}
- Social Style: ${resolved.socialStyle}
- Moral Outlook: ${resolved.moralOutlook}
- Emotional Openness: ${resolved.emotionalOpenness}
- Confidence: ${resolved.confidence}
- Optimism / Pessimism: ${resolved.optimism}
- Expressiveness: ${resolved.expressiveness}
- Cooperative / Competitive: ${resolved.cooperationStyle}
${resolved.ageOrLifeStage ? `- Age / Life Stage: ${resolved.ageOrLifeStage}\n` : ""}${resolved.relationshipContext ? `- Relationship Context: ${resolved.relationshipContext}\n` : ""}${resolved.concept ? `- Free-text Concept: ${resolved.concept}\n` : ""}${formatCampaignContextBlock(resolved.campaignContext)}${entityContextBlock}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A name fitting the genre, or a short role-based label if a full character name is not appropriate (3-6 words)",
  "content": "Table-usable quick reference markdown (use exactly these '###' headings, in this order): '### Core Personality' (one or two sentences capturing the central behavioural pattern — never a comma-separated adjective list), '### Speech & Conversational Style' (concise vs rambling, blunt vs indirect, formal vs casual, whether they ask questions or make assertions, and one specific conversational habit — no invented catchphrase unless requested), '### Mannerism / Tell' (one or two restrained behavioural tells, not a list of quirks), '### Roleplaying Cues' (3 to 5 concrete, immediately usable behavioural instructions, e.g. 'Answers suspicious questions with another question' — instructions, not prose biography).",
  "lore": "GM-only markdown (use exactly these '###' headings, in this order): '### Outward Demeanour vs Inner Nature' (how they appear to others, contrasted with what is actually happening internally), '### Drives' (as bullets: what they want, what they fear, what they protect, what they envy or resent, what they need from other people — each one sentence naming a distinct want, not five phrasings of the same want), '### Virtue and Flaw' (a strength stated first, then the specific way that same strength produces the weakness — not two unrelated traits), '### Contradiction' (at least one meaningful internal tension that makes psychological sense, stated plainly), '### Under Pressure' (how they change when frightened, angry, cornered, embarrassed, exhausted, or losing control — specific enough to guide roleplay, not just 'they get defensive'), '### Social Behaviour' (brief coverage of how they treat strangers, friends/trusted people, authority figures, and rivals/enemies — only make a category radically different from the others if the core personality justifies it), '### Boundary / Trigger' (something likely to provoke an unusually strong response, arising from the generated personality rather than random trauma decoration), '### Example Reactions' (optional expanded reference — short, non-scripted illustrations of how they might react if praised, threatened, caught lying, offered power, betrayed, or asked for help — pick 3 of these 6, do not do all of them, and keep each one a behaviour, not dialogue).",
  "labels": ["personality", "personality-generator", "imported-draft"]
}
Quality guardrails: prefer a coherent behavioural concept with internal tension over a trait list. ${ARCHETYPE_VARIETY_GUARDRAIL}
${COHERENCE_PASS}
${NON_REPETITION_GUARDRAIL}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates coherent, playable RPG character personalities in JSON format, prioritising behavioural specificity over descriptive adjectives.",
    userMessage,
    resolved,
  };
}

export function parsePersonalityResponse(
  text: string,
  resolved: ResolvedPersonality,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "character",
    kind: "personality",
    title: data.title || resolved.placeholderName,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["personality", "personality-generator", "imported-draft"],
    status: "active",
  };
}

/**
 * Six internally-consistent personality cores for the local (non-AI)
 * fallback, deliberately spread across different behavioural patterns so the
 * deterministic path doesn't default to one recognisable archetype either.
 * Each flavor already satisfies the coherence requirements the AI prompt
 * asks for: drives, virtue/flaw, contradiction, and pressure response all
 * describe the same person.
 */
interface PersonalityFlavor {
  corePersonality: string;
  outwardDemeanour: string;
  innerNature: string;
  drives: {
    wants: string;
    fears: string;
    protects: string;
    envies: string;
    needs: string;
  };
  virtue: string;
  flaw: string;
  contradiction: string;
  underPressure: string;
  social: {
    strangers: string;
    friends: string;
    authority: string;
    rivals: string;
  };
  speechStyle: string;
  mannerism: string;
  boundary: string;
  roleplayingCues: readonly string[];
  exampleReactions: readonly [string, string, string];
}

const PERSONALITY_FLAVORS: readonly PersonalityFlavor[] = [
  {
    corePersonality:
      "Generous with money and time, but treats anyone they help as someone who now belongs to their circle.",
    outwardDemeanour:
      "Warm, hospitable, quick to offer help before it is asked for.",
    innerNature:
      "Keeps a private ledger of who has been helped and quietly expects loyalty in return, even if they would never call it a debt.",
    drives: {
      wants: "to be the person everyone turns to first",
      fears: "being needed by no one",
      protects: "the people they have already helped",
      envies: "those who seem to need nobody's help at all",
      needs: "regular proof that the help was appreciated",
    },
    virtue: "Genuinely generous, and it costs them something real every time.",
    flaw: "Cannot tolerate someone they helped drifting away, and reads distance as betrayal.",
    contradiction:
      "Gives freely and without conditions in the moment, then feels quietly wronged the first time it is not repaid in loyalty.",
    underPressure:
      "Becomes controlling, inserting themselves into decisions they were not invited into, framed as concern rather than interference.",
    social: {
      strangers:
        "Offers help almost immediately, sizing them up as a future connection.",
      friends: "Fiercely protective, to the point of overstepping.",
      authority:
        "Polite, but privately resents being told what to do with their own generosity.",
      rivals: "Cold and transactional, generosity withdrawn entirely.",
    },
    speechStyle:
      "Warm and direct, asks personal questions early, deflects questions about themselves with humour.",
    mannerism:
      "Touches people's shoulders or arms when reassuring them; remembers small details others mentioned once.",
    boundary: "Being thanked and then never contacted again.",
    roleplayingCues: [
      "Offers unsolicited help before being asked, and remembers exactly who has not thanked them for it.",
      "Changes the subject whenever someone tries to help them in return.",
      "Reacts to a friend pulling away with concern that slides into control within a scene or two.",
      "Brings up a past favour lightly, as a joke, when they actually need something now.",
    ],
    exampleReactions: [
      "Praised: deflects immediately, redirects credit to someone else, visibly uncomfortable.",
      "Betrayed: goes quiet rather than angry, then spends the next scene testing whether the friendship is salvageable.",
      "Asked for help: says yes before hearing the full request.",
    ],
  },
  {
    corePersonality:
      "Calm and methodical under scrutiny, but privately terrified of being caught making the wrong call.",
    outwardDemeanour:
      "Composed, deliberate, the one who stays level-headed when others panic.",
    innerNature:
      "Runs every decision through an exhausting internal audit and rarely trusts their own first instinct.",
    drives: {
      wants: "to never be the reason something went wrong",
      fears: "being blamed publicly for a mistake",
      protects: "their reputation for reliability",
      envies: "people who act decisively without visible doubt",
      needs: "explicit confirmation they made the right call",
    },
    virtue: "Careful and thorough, rarely acts without thinking it through.",
    flaw: "Freezes at the exact moment a fast, imperfect decision would have been better than a slow, correct one.",
    contradiction:
      "Projects total confidence in front of a group while privately rehearsing every way the plan could fail.",
    underPressure:
      "Overexplains their reasoning at length, as if the explanation itself will prevent blame.",
    social: {
      strangers: "Formal and measured, gives little away.",
      friends:
        "Opens up slightly, but still rehearses what to say before saying it.",
      authority: "Deferential and precise, anticipates what will be asked.",
      rivals: "Meticulously polite, using correctness as a weapon.",
    },
    speechStyle:
      "Measured and complete sentences, answers questions with more detail than asked for, rarely interrupts.",
    mannerism:
      "Pauses noticeably before answering anything that could be held against them later.",
    boundary: "Being blamed for a decision they warned against.",
    roleplayingCues: [
      "Answers a direct question with a fully-reasoned explanation instead of a short answer.",
      "Volunteers to double-check something that has already been checked.",
      "Under sudden pressure, talks through their reasoning out loud rather than acting.",
      "Privately keeps a mental record of who agreed with a plan that went wrong.",
    ],
    exampleReactions: [
      "Threatened: becomes more precise and controlled, not less.",
      "Caught lying: over-explains rather than denying, unable to leave it unaddressed.",
      "Offered power: hesitates, immediately lists the ways it could go wrong.",
    ],
  },
  {
    corePersonality:
      "Restless and quick to act, treating hesitation itself as the real danger.",
    outwardDemeanour:
      "Energetic, decisive, first to move when a situation stalls.",
    innerNature:
      "Cannot sit with an unresolved problem without doing something about it, useful or not.",
    drives: {
      wants: "forward motion, any motion, over standing still",
      fears: "being stuck in a situation with no way to act",
      protects: "their own ability to choose what happens next",
      envies: "people who seem content to wait and plan",
      needs: "a reason to move that others will follow",
    },
    virtue: "Genuinely brave, first to step into danger others hesitate over.",
    flaw: "Acts before a plan is ready, and treats planning itself as a stalling tactic.",
    contradiction:
      "Craves being trusted to lead, but bristles the moment someone actually gives them an order.",
    underPressure:
      "Becomes reckless, taking a bigger risk specifically because someone told them to wait.",
    social: {
      strangers:
        "Direct, sizes them up fast, decides quickly whether to trust them.",
      friends:
        "Loyal to a fault, will act rashly on their behalf without being asked.",
      authority:
        "Outwardly compliant, privately resentful, and will act against instructions if convinced they are right.",
      rivals: "Confrontational, treats disagreement as a challenge.",
    },
    speechStyle:
      "Short sentences, blunt, interrupts when impatient, asks 'so what do we do' more than 'what do you think'.",
    mannerism:
      "Restless hands, already moving toward the door before a plan is finished.",
    boundary: "Being told to wait while someone they care about is at risk.",
    roleplayingCues: [
      "Moves to act before the group finishes discussing the plan.",
      "Volunteers for the dangerous task, then resents being thanked for it as though it were a favour.",
      "Pushes back hard against direct orders, even reasonable ones.",
      "Goes quiet and sullen, rather than argumentative, when overruled.",
    ],
    exampleReactions: [
      "Praised: brushes it off, uncomfortable with being the centre of attention for something already done.",
      "Threatened: moves toward the threat rather than away from it.",
      "Asked for help: already acting before the request finishes.",
    ],
  },
  {
    corePersonality:
      "Quietly observant and slow to trust, but fiercely loyal once someone has actually earned it.",
    outwardDemeanour:
      "Reserved, watches more than they speak, gives little away in a first meeting.",
    innerNature:
      "Notices far more than they let on, and is constantly assessing whether people mean what they say.",
    drives: {
      wants: "to know who someone really is before committing to them",
      fears: "trusting the wrong person again",
      protects: "the small number of people who have already earned trust",
      envies: "people who trust easily and seem never to be burned for it",
      needs: "consistency over time, not a single grand gesture",
    },
    virtue: "Loyal without limit, once trust is actually earned.",
    flaw: "Makes people prove themselves for so long that some give up before they ever get there.",
    contradiction:
      "Claims not to care what people think of them, but notices and remembers every small slight.",
    underPressure:
      "Withdraws entirely, going silent rather than asking for help.",
    social: {
      strangers: "Guarded, answers in as few words as possible.",
      friends:
        "Unshakeable loyalty, will act against their own interest for them.",
      authority:
        "Compliant on the surface, privately weighing whether the authority has earned obedience.",
      rivals: "Cold, unreadable, gives nothing away.",
    },
    speechStyle:
      "Sparse, answers are short unless the topic is something they actually care about, rarely volunteers information.",
    mannerism:
      "Watches exits and other people's hands; goes still rather than fidgeting when uneasy.",
    boundary: "Discovering someone they trusted has been lying to them.",
    roleplayingCues: [
      "Answers a personal question with a shorter answer than the question deserves.",
      "Notices a detail nobody else mentioned, and says nothing about it until it matters.",
      "When someone they trust is threatened, acts immediately and without discussion.",
      "Goes quiet rather than asking for help, even when clearly struggling.",
    ],
    exampleReactions: [
      "Betrayed: does not confront immediately — watches, confirms, then acts decisively.",
      "Offered power: suspicious of the offer before considering the power itself.",
      "Caught lying: admits it flatly, without excuse or elaboration.",
    ],
  },
  {
    corePersonality:
      "Charming and performative in public, using humour to control how much of themselves anyone actually sees.",
    outwardDemeanour:
      "Quick-witted, entertaining, the one who defuses tension with a joke.",
    innerNature:
      "Uses the performance deliberately, as a way to keep every conversation on their own terms.",
    drives: {
      wants: "to be liked by everyone in the room",
      fears: "being genuinely, personally known and found lacking",
      protects: "the version of themselves other people actually see",
      envies: "people who can be sincere without flinching",
      needs: "laughter, or at least a reaction, to know a scene is going well",
    },
    virtue: "Genuinely good at putting other people at ease.",
    flaw: "Cannot stop performing even in moments that call for plain sincerity.",
    contradiction:
      "Desperately wants to be truly known, but deflects with a joke the instant a conversation gets close.",
    underPressure:
      "Jokes harder, escalating the performance exactly when the room most needs sincerity.",
    social: {
      strangers:
        "Instantly charming, performs a version of warmth before real warmth has a chance to form.",
      friends:
        "Genuinely caring underneath, but still slips into performance under any stress.",
      authority:
        "Charms rather than complies, tests how far the performance can get them.",
      rivals: "Needles with humour rather than open hostility.",
    },
    speechStyle:
      "Quick, deflects with a joke when a question gets personal, changes the subject through humour rather than refusal.",
    mannerism:
      "A practised laugh that does not always reach their eyes; fills silences reflexively.",
    boundary:
      "A joke landing badly and exposing something they meant to keep hidden.",
    roleplayingCues: [
      "Deflects a personal or probing question with a joke rather than answering it directly.",
      "Fills an uncomfortable silence with humour before anyone else can speak.",
      "Drops the performance for exactly one unguarded sentence, then immediately covers it with a joke.",
      "Reads the room accurately and adjusts the performance instantly to match it.",
    ],
    exampleReactions: [
      "Praised sincerely: deflects with a joke, visibly thrown by genuine sincerity.",
      "Caught lying: charms rather than denies, tries to make it funny before it becomes serious.",
      "Asked for help with something personal: agrees, but changes the subject as soon as possible afterward.",
    ],
  },
  {
    corePersonality:
      "Rigidly principled, applying the same standard to themselves that they demand of everyone else.",
    outwardDemeanour:
      "Direct, unyielding, says what they actually think regardless of the cost.",
    innerNature:
      "Holds themselves to the standard first and hardest, and quietly doubts whether they always meet it.",
    drives: {
      wants: "to act in a way they could defend to anyone",
      fears: "becoming someone they would not respect",
      protects:
        "the principle itself, sometimes over the person it was meant to help",
      envies: "people who can compromise without it costing them anything",
      needs:
        "to know their own actions were actually justified, not just convenient",
    },
    virtue: "Genuinely principled, will not bend for convenience or pressure.",
    flaw: "Treats compromise as failure, even when compromise was the better outcome for everyone involved.",
    contradiction:
      "Judges others harshly for small compromises while privately aware of the one principle they themselves once broke.",
    underPressure:
      "Becomes rigid and unbending exactly when flexibility is needed, doubling down rather than adapting.",
    social: {
      strangers:
        "Direct and unguarded, treats them exactly as their actions warrant.",
      friends:
        "Loyal, but will criticise them openly the moment they compromise a principle.",
      authority:
        "Respectful only as far as the authority is itself principled; openly defiant otherwise.",
      rivals:
        "Argues on principle rather than personal animosity, which can read as colder than it is.",
    },
    speechStyle:
      "Blunt, states positions as fact, rarely softens a disagreement, asks pointed questions.",
    mannerism:
      "A fixed, direct gaze when stating something they believe strongly; folds arms when disapproving.",
    boundary:
      "Being asked to compromise the one principle they consider non-negotiable.",
    roleplayingCues: [
      "States a disagreement plainly rather than letting it pass for the sake of harmony.",
      "Criticises a friend's compromise openly, even in front of others.",
      "Refuses an easier path because it conflicts with a stated principle.",
      "Goes quiet and controlled, rather than loud, when genuinely angry.",
    ],
    exampleReactions: [
      "Offered power: interrogates the terms before the opportunity itself.",
      "Caught in their own past compromise: uncharacteristically defensive, unwilling to discuss it.",
      "Betrayed: does not forgive easily, treats it as a permanent fact about the person.",
    ],
  },
] as const;

function formatDrives(drives: PersonalityFlavor["drives"]): string {
  return [
    `- **Wants**: ${drives.wants}`,
    `- **Fears**: ${drives.fears}`,
    `- **Protects**: ${drives.protects}`,
    `- **Envies or resents**: ${drives.envies}`,
    `- **Needs from others**: ${drives.needs}`,
  ].join("\n");
}

function formatExampleReactions(reactions: readonly string[]): string {
  return reactions.map((r) => `- ${r}`).join("\n");
}

/**
 * Local (non-AI) fallback. Picks one of six pre-authored, internally
 * coherent personality flavors rather than assembling unrelated traits.
 */
export function generatePersonalityLocal(
  options: PersonalityGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolvePersonality(options, rng);
  const flavor = pickFrom(PERSONALITY_FLAVORS, rng);

  const content = `### Core Personality
${flavor.corePersonality}

### Speech & Conversational Style
${flavor.speechStyle}

### Mannerism / Tell
${flavor.mannerism}

### Roleplaying Cues
${flavor.roleplayingCues.map((cue) => `- ${cue}`).join("\n")}`;

  const lore = `### Outward Demeanour vs Inner Nature
Outwardly: ${flavor.outwardDemeanour} Inwardly: ${flavor.innerNature}

### Drives
${formatDrives(flavor.drives)}

### Virtue and Flaw
**Virtue**: ${flavor.virtue} **Flaw**: ${flavor.flaw}

### Contradiction
${flavor.contradiction}

### Under Pressure
${flavor.underPressure}

### Social Behaviour
**Strangers**: ${flavor.social.strangers} **Friends**: ${flavor.social.friends} **Authority figures**: ${flavor.social.authority} **Rivals**: ${flavor.social.rivals}

### Boundary / Trigger
${flavor.boundary}

### Example Reactions
${formatExampleReactions(flavor.exampleReactions)}`;

  return {
    type: "character",
    kind: "personality",
    title: resolved.placeholderName,
    summary: flavor.corePersonality,
    content,
    lore,
    labels: ["personality", "personality-generator", "imported-draft"],
    status: "active",
  };
}
