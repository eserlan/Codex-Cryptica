import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { parseFencedJson } from "./llm-response-utils";
import {
  type Rng,
  defaultRng,
  generatePlaceholderName,
  pickFrom,
} from "./random-utils";

export const secretSocietyConfig = {
  themes: [
    "Classic Fantasy",
    "Cosmic Horror",
    "Cyberpunk / Corporate",
    "Sci-Fi / Space Opera",
    "Post-Apocalyptic",
    "Modern Conspiracy",
  ],
  tones: ["Sinister", "Tragic", "Mythic", "Grotesque", "Grounded", "Silly"],
  scales: [
    "Local cell",
    "Neighbourhood movement",
    "City-wide sect",
    "Regional religion",
    "Hidden empire",
  ],
  publicFaces: [
    "Charity",
    "Church",
    "Guild",
    "Academic society",
    "Wellness group",
    "Gang",
    "Noble salon",
    "Corporate initiative",
    "Openly strange",
  ],
  dangers: [
    "Mostly harmless",
    "Socially disruptive",
    "Criminal",
    "Supernatural threat",
    "Apocalyptic threat",
  ],
  truths: [
    "Entirely fake",
    "Misunderstood truth",
    "Partial truth",
    "Horrifyingly real",
    "True, but not as they think",
  ],
} as const;

export interface SecretSocietyGeneratorOptions {
  theme?: string;
  tone?: string;
  scale?: string;
  publicFace?: string;
  dangerLevel?: string;
  truthRelationship?: string;
  campaignContext?: string;
}
interface Resolved {
  theme: string;
  tone: string;
  scale: string;
  publicFace: string;
  dangerLevel: string;
  truthRelationship: string;
  campaignContext?: string;
  title: string;
}
function resolve(options: SecretSocietyGeneratorOptions, rng: Rng): Resolved {
  return {
    theme: options.theme || secretSocietyConfig.themes[0],
    tone: options.tone || pickFrom(secretSocietyConfig.tones, rng),
    scale: options.scale || pickFrom(secretSocietyConfig.scales, rng),
    publicFace:
      options.publicFace || pickFrom(secretSocietyConfig.publicFaces, rng),
    dangerLevel:
      options.dangerLevel || pickFrom(secretSocietyConfig.dangers, rng),
    truthRelationship:
      options.truthRelationship || pickFrom(secretSocietyConfig.truths, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    title: `The ${generatePlaceholderName(rng)} Circle`,
  };
}
export function buildSecretSocietyPrompt(
  options: SecretSocietyGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
) {
  const r = resolve(options, rng);
  return {
    resolved: r,
    systemInstruction:
      "You create campaign-ready secret societies for tabletop RPGs. Return only valid JSON.",
    userMessage: `Create a Secret Society Generator result. Theme: ${r.theme}; tone: ${r.tone}; scale: ${r.scale}; public face: ${r.publicFace}; danger: ${r.dangerLevel}; relationship to truth: ${r.truthRelationship}.${r.campaignContext ? ` Campaign context: ${r.campaignContext}.` : ""}${sessionContext}\nReturn {title,summary,content,lore,labels}. Content must cover belief, ritual, public face, secret truth, conflict, and adventure hooks. Lore must include leader, taboo, recruitment, hierarchy, sacred object, meeting site, symbols, and follow-up suggestions. Keep every detail internally consistent.`,
  };
}
export function parseSecretSocietyResponse(
  text: string,
  resolved: Resolved,
): PublicGeneratorOutput {
  let data: Record<string, unknown> = {};
  try {
    data = parseFencedJson<Record<string, unknown>>(text);
  } catch {
    // Fall back to the resolved defaults when a provider returns malformed JSON.
  }
  const labels = Array.isArray(data.labels)
    ? data.labels.filter((label): label is string => typeof label === "string")
    : [];
  if (!labels.includes("secret-society")) labels.unshift("secret-society");

  return {
    type: "faction",
    title: typeof data.title === "string" ? data.title : resolved.title,
    summary: typeof data.summary === "string" ? data.summary : "",
    content: typeof data.content === "string" ? data.content : "",
    lore: typeof data.lore === "string" ? data.lore : "",
    labels,
    status: "active",
  };
}
export function generateSecretSocietyLocal(
  options: SecretSocietyGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const r = resolve(options, rng);
  const leader = generatePlaceholderName(rng);
  const object = pickFrom(
    [
      "sealed reliquary",
      "singing mask",
      "black ledger",
      "star chart",
      "bone key",
    ],
    rng,
  );
  const ritual = pickFrom(
    [
      "shared dream vigils",
      "midnight accounts",
      "masked suppers",
      "silent processions",
      "coded broadcasts",
    ],
    rng,
  );
  return {
    type: "faction",
    title: r.title,
    summary: `A ${r.tone.toLowerCase()} ${r.scale.toLowerCase()} society hidden behind a ${r.publicFace.toLowerCase()}.`,
    content: `### What they believe\n${r.title} teaches that a buried truth can remake the world. Their doctrine is ${r.truthRelationship.toLowerCase()}, and that uncertainty drives every member.\n\n### What they do\nTheir signature ritual is ${ritual}. They recruit through quiet favours, then test loyalty with a vow no outsider hears.\n\n### Public face\nThey present themselves as a ${r.publicFace.toLowerCase()}, useful enough that neighbours defend them.\n\n### Secret truth\nWhat they revere is ${r.truthRelationship.toLowerCase()}; the inner circle knows only enough to fear it.\n\n### Current conflict\nTheir ${r.dangerLevel.toLowerCase()} agenda is colliding with a member who has learned too much.\n\n### Adventure hooks\nFind the missing initiate; expose the false miracle; bargain with the rival cell; decide whether the society's secret should survive.`,
    lore: `### At the Table\n- **Leader**: ${leader}, a calm founder with a private fear of the truth.\n- **Taboo**: Never speak the founding name in daylight.\n- **Recruitment**: A favour, a test, then a shared secret.\n- **Hierarchy**: Listeners, keepers, and an unseen inner circle.\n- **Sacred Object**: ${object}.\n- **Meeting Site**: A back room beneath their public institution.\n- **Signs**: A repeated knot-mark and an impossible coincidence.\n\n### Follow-Up Suggestions\nGenerate their leader, sacred site, rival sect, initiation ritual, rumours, or an adventure hook.`,
    labels: ["secret-society", "faction-generator", "imported-draft"],
    status: "active",
  };
}
