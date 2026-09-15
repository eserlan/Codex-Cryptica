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

// Genre-specific twist archetypes used to steer both the LLM prompt and the
// local fallback generator away from generic fantasy/scifi twists with
// renamed nouns. Superhero fiction is called out in the epic (#2288) as
// "particularly well suited" to this generator; keyed by genre label so a
// future genre can add its own pool the same way without touching the
// default path. See #3106.
const SUPERHERO_GENRE = "Superhero / Comic Book";

export const SUPERHERO_TWIST_ARCHETYPES: readonly {
  label: string;
  hint: string;
}[] = [
  {
    label: "Secret identity revelation",
    hint: "a civilian identity is exposed to someone who now has leverage over it",
  },
  {
    label: "Mentor betrayal",
    hint: "the mentor who trained the protagonists has been serving the antagonist's cause, deliberately or without realising it",
  },
  {
    label: "False villain",
    hint: "the apparent villain is a decoy, patsy, or scapegoat, and the real architect has stayed unseen",
  },
  {
    label: "Clone / duplicate",
    hint: "a trusted hero, ally, or villain is a duplicate or impostor, and the original is missing, replaced, or compromised",
  },
  {
    label: "Legacy revelation",
    hint: "a character learns they are the heir, successor, or continuation of a hero or villain lineage they never knew about",
  },
  {
    label: "Manipulated origin",
    hint: "the event that granted a hero's powers, or shaped their worldview, was engineered by someone with a hidden agenda",
  },
  {
    label: "Hidden cosmic stakes",
    hint: "a street-level, personal conflict is secretly the visible symptom of a far larger cosmic or multiversal threat",
  },
  {
    label: "The villain was protecting us from something worse",
    hint: "the villain's cruelty or overreach was containing a greater threat that is now free to act",
  },
  {
    label: "Alternate-timeline consequences",
    hint: "an action taken, or avoided, ripples in from an alternate timeline and undoes what everyone believed was settled",
  },
] as const;

// Maps each concrete (non-Random) twist type onto the superhero archetype it
// most naturally expresses, so a user who asks for a specific twist type
// still gets superhero-flavoured content rather than the generic template.
const SUPERHERO_TWIST_BY_TYPE: Record<
  string,
  { reveal: string; believedAssumption: string; rationale: string }
> = {
  Betrayal: {
    reveal:
      "The mentor who trained the people at the heart of {subject} has been quietly serving the other side's cause for years, whether they meant to or not.",
    believedAssumption:
      "Everyone assumes the mentor's guidance has been trustworthy simply because it has always been available.",
    rationale:
      "The mentor's advice was never wrong on its face; it was aimed at an outcome that only ever benefited the people they claimed to be fighting.",
  },
  Revelation: {
    reveal:
      "The pressure around {subject} exposes a civilian identity to someone who now has real leverage over the hero behind the mask.",
    believedAssumption:
      "Everyone assumes secret identities stay cleanly separated from civilian lives as long as nobody slips up in the field.",
    rationale:
      "The public record of what happened does not change; what changes is who can now connect the mask to the face, and what they choose to do with that.",
  },
  "Hidden motive": {
    reveal:
      "The origin story behind {subject} was engineered from the start by someone who needed a hero — or a villain — to exist, and shaped events accordingly.",
    believedAssumption:
      "Everyone assumes the origin was an accident of circumstance rather than a deliberate design.",
    rationale:
      "Every documented step of the origin remains true; only the hand quietly arranging the circumstances behind it was never visible until now.",
  },
  Reversal: {
    reveal:
      "The figure blamed for {subject} is a decoy, patsy, or scapegoat; the real architect has never been in the room and has stayed unseen throughout.",
    believedAssumption:
      "Everyone assumes the visible antagonist is the one making the decisions.",
    rationale:
      "The decoy's actions and motive are genuine enough to hold up under scrutiny, which is exactly why they were chosen to take the blame.",
  },
  Escalation: {
    reveal:
      "What looked like a street-level, personal conflict tied to {subject} is the visible symptom of a far larger cosmic or multiversal threat pressing in at the edges.",
    believedAssumption:
      "Everyone assumes the stakes are limited to the people directly involved and the city around them.",
    rationale:
      "The local conflict is real and worth resolving on its own terms; it is also the only visible piece of something far too large to see all at once.",
  },
  "False assumption": {
    reveal:
      "The version of events everyone accepts around {subject} belongs to a timeline that has already been altered, and the consequences of that change are only now arriving.",
    believedAssumption:
      "Everyone assumes the current situation has always unfolded exactly this way.",
    rationale:
      "Every memory and record anyone can check agrees with the current timeline; there is no way to prove the change happened except by its effects.",
  },
  "Moral dilemma": {
    reveal:
      "The villain behind {subject} was holding back something considerably worse, and removing them stops being a clean win the moment that threat is loose.",
    believedAssumption:
      "Everyone assumes the villain is simply the obstacle standing between the situation and a safe resolution.",
    rationale:
      "The villain's methods were never acceptable; the effect of those methods, inconveniently, was containment that no one else was providing.",
  },
  "Trap / manipulation": {
    reveal:
      "The hero or ally central to {subject} is a duplicate, and the original has been missing, replaced, or compromised since before anyone thought to check.",
    believedAssumption:
      "Everyone assumes the person acting in front of them is who they have always been.",
    rationale:
      "The duplicate's memories, powers, and behaviour are convincing by design; only small, deliberate deviations give the substitution away.",
  },
  "Enemy is not the real threat": {
    reveal:
      "The villain everyone is chasing over {subject} is a decoy; the true architect has let the chase happen because it keeps attention away from the real operation.",
    believedAssumption:
      "Everyone assumes stopping the named villain resolves the situation.",
    rationale:
      "Stopping the decoy still matters and still helps people; it simply does not touch the actual plan running underneath it.",
  },
  "Ally is helping for the wrong reason": {
    reveal:
      "The ally who stepped up around {subject} is the heir or successor to a hero or villain lineage they never knew about, and their help traces back to that legacy rather than to the cause at hand.",
    believedAssumption:
      "Everyone assumes the ally's help is motivated purely by the immediate situation.",
    rationale:
      "The help given is genuine and effective; the reason behind it belongs to an inheritance the ally is only beginning to understand.",
  },
};

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
  const superheroContent =
    resolved.genre === SUPERHERO_GENRE
      ? SUPERHERO_TWIST_BY_TYPE[type]
      : undefined;
  const reveal = superheroContent
    ? superheroContent.reveal.replace("{subject}", subject.toLowerCase())
    : `The situation is exactly as witnessed, but its most important meaning has been misunderstood: the pressure around ${subject.toLowerCase()} is being used to force a choice that benefits someone who cannot act openly.`;
  return renderOutput(resolved, {
    title: `${pickFrom(PLOT_TWIST_TITLE_PREFIXES, rng)}: ${type}`,
    summary: `${type} complication for: ${resolved.premise}`,
    reveal,
    believedAssumption:
      superheroContent?.believedAssumption ??
      `Everyone assumes the visible conflict has one obvious cause and that resolving it will restore the old balance.`,
    rationale:
      superheroContent?.rationale ??
      `The established facts remain true; the reversal comes from the motive and leverage behind them. A ${type.toLowerCase()} fits the ${resolved.genre} tone at ${resolved.impact.toLowerCase()} impact and can land ${resolved.timing.toLowerCase()}.`,
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
  const genreArchetypeHint =
    resolved.genre === SUPERHERO_GENRE
      ? `Genre-specific twist archetypes to draw from — pick or blend one rather than defaulting to a generic fantasy/scifi twist with renamed nouns:\n${bullets(
          SUPERHERO_TWIST_ARCHETYPES.map((a) => `${a.label}: ${a.hint}`),
        )}`
      : "";
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
    genreArchetypeHint,
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
