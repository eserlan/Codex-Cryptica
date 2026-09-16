import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { parseFencedJson } from "./llm-response-utils";
import { defaultRng, pickFrom, type Rng } from "./random-utils";
import { themeIdToLabel } from "./public-faction-constants";

export const PLOT_TWIST_TYPES = [
  "Random",
  "Betrayal",
  "Revelation",
  "Hidden motive",
  "Reversal",
  "Escalation",
  "False assumption",
  "Moral dilemma",
  "Trap / manipulation",
  "Enemy is not the real threat",
  "Ally is helping for the wrong reason",
] as const;

export const PLOT_TWIST_IMPACTS = [
  "Subtle",
  "Significant",
  "Campaign-changing",
] as const;

export const PLOT_TWIST_TIMINGS = [
  "Early",
  "Midpoint",
  "Climax",
  "Aftermath",
  "Any",
] as const;

export const PLOT_TWIST_FORESHADOWING = [
  "Surprise me",
  "Foreshadowable",
  "Already hinted",
] as const;

const PLOT_TWIST_TITLE_PREFIXES = [
  "The Cost of Being Right",
  "The Price of the Obvious Answer",
  "What the Evidence Hides",
  "The Choice Beneath the Choice",
  "A Truth with Terms",
] as const;

const REQUIRED_HEADINGS = [
  "## The Reveal",
  "## What Everyone Believed",
  "## Why It Makes Sense",
  "## Foreshadowing",
  "## Immediate Consequences",
  "## New Choices",
] as const;

export interface PlotTwistGeneratorOptions {
  premise?: string;
  themeId?: string;
  genre?: string;
  twistType?: string;
  impact?: string;
  timing?: string;
  foreshadowing?: string;
  constraints?: string;
  campaignContext?: string;
  avoidNames?: string[];
}

export interface ResolvedPlotTwist {
  premise: string;
  themeId: string;
  genre: string;
  twistType: string;
  impact: string;
  timing: string;
  foreshadowing: string;
  constraints: string;
  campaignContext: string;
}

export interface PlotTwistPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedPlotTwist;
}

const REQUIRED_FIELDS = [
  "reveal",
  "believedAssumption",
  "rationale",
  "foreshadowing",
  "immediateConsequences",
  "newChoices",
] as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) {
    // ⚡ Bolt Optimization: Replace chained .map().filter() with a single imperative loop
    const result: string[] = [];
    for (const v of value) {
      const t = text(v);
      if (t) result.push(t);
    }
    return result;
  }
  const single = text(value);
  return single ? [single] : [];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function resolvePlotTwist(
  options: PlotTwistGeneratorOptions = {},
): ResolvedPlotTwist {
  const themeId = options.themeId || "workspace";
  const genre = options.genre || themeIdToLabel[themeId] || "Classic Fantasy";
  const premise =
    text(options.premise) ||
    "An established situation under mounting pressure.";
  const twistType = PLOT_TWIST_TYPES.includes(options.twistType as never)
    ? options.twistType!
    : "Random";
  const impact = PLOT_TWIST_IMPACTS.includes(options.impact as never)
    ? options.impact!
    : "Significant";
  const timing = PLOT_TWIST_TIMINGS.includes(options.timing as never)
    ? options.timing!
    : "Any";
  const foreshadowing = PLOT_TWIST_FORESHADOWING.includes(
    options.foreshadowing as never,
  )
    ? options.foreshadowing!
    : "Surprise me";

  return {
    premise,
    themeId,
    genre,
    twistType,
    impact,
    timing,
    foreshadowing,
    constraints: text(options.constraints),
    campaignContext: text(options.campaignContext),
  };
}

function renderOutput(
  resolved: ResolvedPlotTwist,
  fields: {
    title: string;
    summary: string;
    reveal: string;
    believedAssumption: string;
    rationale: string;
    foreshadowing: string[];
    immediateConsequences: string[];
    newChoices: string[];
    content?: string;
    lore?: string;
    labels?: string[];
  },
): PublicGeneratorOutput {
  const generatedContent = [
    "## The Reveal",
    fields.reveal,
    "",
    "## What Everyone Believed",
    fields.believedAssumption,
    "",
    "## Why It Makes Sense",
    fields.rationale,
    "",
    "## Foreshadowing",
    bullets(fields.foreshadowing),
    "",
    "## Immediate Consequences",
    bullets(fields.immediateConsequences),
    "",
    "## New Choices",
    bullets(fields.newChoices),
  ].join("\n");
  const content = fields.content?.trim() || generatedContent;

  return {
    type: "note",
    kind: "plot-twist",
    title: fields.title,
    summary: fields.summary,
    content,
    lore:
      fields.lore ||
      `### Generator Brief\n- Theme: ${resolved.genre}\n- Impact: ${resolved.impact}\n- Timing: ${resolved.timing}`,
    labels: [
      "plot-twist",
      "complication",
      slug(resolved.genre),
      ...(fields.labels ?? []),
    ],
    status: "active",
  };
}

export function generatePlotTwistLocal(
  options: PlotTwistGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolvePlotTwist(options);
  const subject = resolved.premise.replace(/[.!?]+$/, "");
  const type =
    resolved.twistType === "Random"
      ? pickFrom(PLOT_TWIST_TYPES.slice(1), rng)
      : resolved.twistType;
  const reveal = `The situation is exactly as witnessed, but its most important meaning has been misunderstood: the pressure around ${subject.toLowerCase()} is being used to force a choice that benefits someone who cannot act openly.`;
  return renderOutput(resolved, {
    title: `${pickFrom(PLOT_TWIST_TITLE_PREFIXES, rng)}: ${type}`,
    summary: `${type} complication for: ${resolved.premise}`,
    reveal,
    believedAssumption: `Everyone assumes the visible conflict has one obvious cause and that resolving it will restore the old balance.`,
    rationale: `The established facts remain true; the reversal comes from the motive and leverage behind them. A ${type.toLowerCase()} fits the ${resolved.genre} tone at ${resolved.impact.toLowerCase()} impact and can land ${resolved.timing.toLowerCase()}.`,
    foreshadowing: [
      "A witness remembers a detail that does not fit the accepted explanation.",
      "A seemingly helpful action creates a cost for the people the players meant to protect.",
      "The obvious beneficiary avoids claiming credit when the opportunity appears.",
    ],
    immediateConsequences: [
      "The players must reassess who has leverage before committing to the obvious solution.",
      "An existing ally, resource, or deadline becomes conditional rather than reliable.",
    ],
    newChoices: [
      "Pursue the immediate objective while accepting that the hidden beneficiary gains ground.",
      "Expose the underlying motive and risk delaying the people who need help now.",
      "Use the misunderstanding as leverage and negotiate a third outcome.",
    ],
    lore: resolved.constraints
      ? `### Constraints Honoured\n${resolved.constraints}`
      : undefined,
  });
}

export function buildPlotTwistPrompt(
  options: PlotTwistGeneratorOptions = {},
): PlotTwistPrompt {
  const resolved = resolvePlotTwist(options);
  const systemInstruction = `You are a thoughtful tabletop RPG story designer creating a ${resolved.genre} plot twist or complication. Reinterpret established facts; do not invalidate witnessed events or replace the premise with unrelated lore. Avoid cheap secret-villain, secret-relative, arbitrary resurrection, and "it was all a dream" reveals unless explicitly requested. The result must create meaningful player choices, trade-offs, or opportunities, not just surprise. Return only valid JSON with the requested fields.`;
  const userMessage = [
    `Current situation / premise: ${resolved.premise}`,
    `Theme: ${resolved.genre}`,
    `Twist type: ${resolved.twistType}`,
    `Impact: ${resolved.impact}`,
    `When it hits: ${resolved.timing}`,
    `Foreshadowing preference: ${resolved.foreshadowing}`,
    resolved.constraints ? `Avoid / constraints: ${resolved.constraints}` : "",
    resolved.campaignContext
      ? `Campaign context (authoritative grounding):\n${resolved.campaignContext}`
      : "",
    "",
    "Find an assumption within the established situation that can be overturned without contradicting known facts.",
    "Return JSON with title, summary, content, lore, labels, and connections. The content field MUST contain the complete markdown sections ## The Reveal, ## What Everyone Believed, ## Why It Makes Sense, ## Foreshadowing, ## Immediate Consequences, and ## New Choices. Include 2-4 foreshadowing clues and at least 2 actionable player decisions in those sections. Reserve lore for brief GM notes or an at-a-glance summary. You may also provide reveal, believedAssumption, rationale, foreshadowing, immediateConsequences, and newChoices as structured fields.",
  ]
    .filter(Boolean)
    .join("\n");
  return { systemInstruction, userMessage, resolved };
}

export function parsePlotTwistResponse(
  rawText: string,
  options: PlotTwistGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  try {
    const parsed = parseFencedJson<Record<string, unknown>>(rawText);
    const parsedContent = text(parsed.content);
    const hasCompleteContent = REQUIRED_HEADINGS.every((heading) =>
      parsedContent.includes(heading),
    );
    if (
      !hasCompleteContent &&
      REQUIRED_FIELDS.some(
        (field) => !text(parsed[field]) && !list(parsed[field]).length,
      )
    ) {
      throw new Error("missing required plot twist field");
    }
    const resolved = resolvePlotTwist(options);
    return renderOutput(resolved, {
      title: text(parsed.title) || "A Complication in Plain Sight",
      summary: text(parsed.summary) || resolved.premise,
      reveal: text(parsed.reveal),
      believedAssumption: text(parsed.believedAssumption),
      rationale: text(parsed.rationale),
      foreshadowing: list(parsed.foreshadowing),
      immediateConsequences: list(parsed.immediateConsequences),
      newChoices: list(parsed.newChoices),
      content: hasCompleteContent ? parsedContent : undefined,
      lore: text(parsed.lore),
      labels: list(parsed.labels),
    });
  } catch {
    return generatePlotTwistLocal(options, rng);
  }
}

export const plotTwistConfig = {
  twistTypes: [...PLOT_TWIST_TYPES],
  impacts: [...PLOT_TWIST_IMPACTS],
  timings: [...PLOT_TWIST_TIMINGS],
  foreshadowing: [...PLOT_TWIST_FORESHADOWING],
};
