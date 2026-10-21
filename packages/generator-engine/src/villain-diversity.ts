/**
 * BBEG / Campaign Villain diversity (#2379). The staged route fixes these
 * choices before any prose is written, so the model develops a villain whose
 * power base, flaw, weak point, price of victory and inner circle were not
 * inherited from the genre's most obvious defaults. Everything here is pure.
 */

import { type Rng, defaultRng, pickFrom } from "./random-utils";

export interface VillainChoice {
  id: string;
  label: string;
  /** One line the stage prompt gives the model so it can honour the choice. */
  guidance: string;
}

const choice = (
  id: string,
  label: string,
  guidance: string,
): VillainChoice => ({
  id,
  label,
  guidance,
});

/** Kinds of organisation. Cellular networks are one option, not the default. */
export const ORGANISATION_FORMS: readonly VillainChoice[] = [
  choice(
    "public-movement",
    "public political movement",
    "an open movement with rallies, spokespeople and a membership who know what it stands for",
  ),
  choice(
    "clan",
    "family or clan hierarchy",
    "power runs through blood, marriage and inherited obligation, with elders and heirs",
  ),
  choice(
    "military",
    "military command",
    "a chain of command with ranks, orders and discipline, openly answerable to the villain",
  ),
  choice(
    "cult",
    "cult or religious hierarchy",
    "initiates, ranks of belief and a doctrine that justifies what is done",
  ),
  choice(
    "guild",
    "professional guild",
    "a licensed trade body that controls who may work, with its own rules and dues",
  ),
  choice(
    "ideological",
    "decentralised ideological movement",
    "many independent groups sharing a cause, with no single office to raid",
  ),
  choice(
    "court",
    "charismatic personal court",
    "favourites, rivals and petitioners who orbit the villain and compete for attention",
  ),
  choice(
    "bureaucracy",
    "open bureaucracy",
    "an office where everyone knows what they are doing and the forms are the weapon",
  ),
  choice(
    "coalition",
    "loose coalition of self-interested allies",
    "partners who need each other and distrust each other, held together by one shared prize",
  ),
  choice(
    "militia",
    "popular militia",
    "ordinary people under arms, loyal to the cause or the neighbourhood rather than to a rank",
  ),
  choice(
    "board",
    "corporate board or trading house",
    "directors, shareholders and partners who vote, leverage and can be outvoted",
  ),
  choice(
    "patronage",
    "patronage network",
    "favours, debts and appointments that bind people upward to the villain",
  ),
  choice(
    "academic",
    "academic or scientific network",
    "researchers, patrons and institutions sharing findings, funding and credit",
  ),
  choice(
    "machine",
    "autonomous machine hierarchy",
    "systems that issue and obey orders without a human in each link",
  ),
  choice(
    "cellular",
    "cellular, compartmentalised network",
    "small cells that do not know each other, with drops and cut-outs between them",
  ),
];

/** What each archetype's power plausibly rests on. An archetype not listed uses every form. */
const ARCHETYPE_FORMS: Record<string, readonly string[]> = {
  "Dark Lord": ["military", "cult", "court"],
  Mastermind: ["academic", "board", "guild", "coalition"],
  "Fallen Hero": ["court", "coalition", "military", "militia"],
  "Corrupt Ruler": ["bureaucracy", "patronage", "military", "clan"],
  "Cult Leader": ["cult", "court", "ideological"],
  "Ancient Evil": ["cult", "court", "military"],
  "Cosmic Entity": ["cult", "ideological", "court"],
  "Crime Lord": ["clan", "patronage", "coalition", "cellular"],
  Revolutionary: ["public-movement", "ideological", "militia", "coalition"],
  "Rival Adventurer": ["coalition", "guild", "court"],
  "Artificial Intelligence": ["machine", "bureaucracy", "board"],
  Conqueror: ["military", "militia", "clan", "court"],
  "Manipulator / Infiltrator": [
    "cellular",
    "patronage",
    "court",
    "bureaucracy",
  ],
};

/** Genres where machines and corporate hierarchies are at home. */
const TECH_GENRE = /sci|cyber|space|post-?apoc|modern|superhero|steam/i;

export const FATAL_FLAW_KINDS: readonly VillainChoice[] = [
  choice(
    "compromise",
    "cannot tolerate compromise",
    "they will lose a winnable fight rather than accept half of what they want",
  ),
  choice(
    "legitimacy",
    "needs public legitimacy",
    "they cannot act without being seen to be in the right",
  ),
  choice(
    "symbol",
    "cannot abandon a symbolic objective",
    "one place, object or date matters more to them than the whole plan",
  ),
  choice(
    "debts",
    "compulsive need to honour debts",
    "they pay what they owe even when it ruins them",
  ),
  choice(
    "blind-spot",
    "ideological blind spot",
    "their doctrine cannot see a particular kind of threat or person",
  ),
  choice(
    "rival",
    "obsession with a specific rival",
    "they will divert the plan to settle one score",
  ),
  choice(
    "irrelevance",
    "fear of irrelevance",
    "they cannot bear being overlooked, forgotten or replaced",
  ),
  choice(
    "admiration",
    "dependence on admiration",
    "they need an audience and will play to it at the wrong moment",
  ),
  choice(
    "code",
    "inability to betray a personal code",
    "one promise or rule binds them, however useful breaking it would be",
  ),
  choice(
    "institution",
    "overconfidence in a particular institution",
    "they trust one court, church, bank or army to do what it was never built to do",
  ),
  choice(
    "protected",
    "refusal to harm a certain category of person",
    "there is a group they will not hurt, whatever the plan needs",
  ),
];

export const VULNERABILITY_KINDS: readonly VillainChoice[] = [
  choice(
    "dependency",
    "a dependency",
    "something or someone they rely on and do not control",
  ),
  choice(
    "legitimacy",
    "their legitimacy",
    "the story that makes others follow them could be broken",
  ),
  choice(
    "reputation",
    "their reputation",
    "what people believe of them matters more than what they hold",
  ),
  choice(
    "alliances",
    "an alliance",
    "a partner whose loyalty is conditional and could be bought or removed",
  ),
  choice(
    "logistics",
    "their logistics",
    "a route, supply or schedule they cannot do without",
  ),
  choice(
    "ideology",
    "their ideology",
    "the cause contains a contradiction that its followers have not faced",
  ),
  choice(
    "obligations",
    "an obligation",
    "they owe something to someone who can call it in",
  ),
  choice(
    "succession",
    "their succession",
    "who comes next is unsettled, and someone wants it settled",
  ),
  choice(
    "culture",
    "their organisational culture",
    "habits, rituals or rivalries inside the organisation can be turned on it",
  ),
  choice(
    "assumption",
    "an incorrect assumption",
    "the plan rests on a belief that is simply wrong",
  ),
  choice(
    "trust",
    "social trust",
    "the people they rely on trust them for a reason that can be undermined",
  ),
  choice(
    "conflict",
    "conflicting goals",
    "two things they want cannot both happen, and the party can force the choice",
  ),
];

/** What defeating the villain costs, in place of a default power vacuum. */
export const COMPLICATION_KINDS: readonly VillainChoice[] = [
  choice(
    "partly-right",
    "the cause is partly right",
    "the grievance behind the plan is real and survives the villain",
  ),
  choice(
    "dependants",
    "people depend on them",
    "ordinary people rely on what the villain runs, and it stops with them",
  ),
  choice(
    "third-path",
    "a third path",
    "the party can neither let the plan finish nor simply stop it, and a harder option exists",
  ),
  choice(
    "complicit",
    "an ally is complicit",
    "someone the party trusts profited from, or helped, the plan",
  ),
  choice(
    "worse-rival",
    "a worse beneficiary",
    "stopping the villain hands the prize to someone the party likes less",
  ),
  choice(
    "irreversible",
    "the harm is done",
    "part of what the villain did cannot be undone, only answered",
  ),
  choice(
    "promise",
    "a promise is at stake",
    "winning requires breaking a promise the party made",
  ),
  choice(
    "mercy",
    "mercy has a price",
    "sparing the villain or their people costs something real, and so does refusing",
  ),
];

/** What each inner-circle member does, and how they stand toward the villain. */
export const LIEUTENANT_FUNCTIONS: readonly string[] = [
  "public spokesperson",
  "recruiter",
  "keeper of doctrine or law",
  "negotiator with outsiders",
  "field commander",
  "financier",
  "scout or spy-master",
  "judge of internal discipline",
  "diplomat to a rival power",
  "quartermaster",
  "chronicler or propagandist",
  "healer or confessor",
];

export const LIEUTENANT_RELATIONS: readonly string[] = [
  "a rival who wants the villain's place",
  "an heir being groomed",
  "a family member",
  "a prisoner who serves to keep someone safe",
  "a patron whose backing the villain needs",
  "a true believer",
  "an opportunist",
  "an autonomous partner with their own agenda",
  "a former equal who was passed over",
  "an apprentice who has outgrown the teacher",
];

export type LieutenantAwareness =
  "knows the whole plan" | "knows part of the plan" | "does not know the plan";

const AWARENESS: readonly LieutenantAwareness[] = [
  "knows the whole plan",
  "knows part of the plan",
  "does not know the plan",
];

export interface LieutenantSlot {
  function: string;
  relation: string;
  awareness: LieutenantAwareness;
}

/** The choices the staged route fixes before the model writes anything. */
export interface VillainAxes {
  organisation: VillainChoice;
  flaw: VillainChoice;
  vulnerability: VillainChoice;
  complication: VillainChoice;
  lieutenants: LieutenantSlot[];
}

/** Pick `count` different items. */
function pickDistinct<T>(items: readonly T[], count: number, rng: Rng): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length) {
    const i = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

function organisationPool(archetype: string, genre: string): VillainChoice[] {
  const tech =
    TECH_GENRE.test(genre) || archetype === "Artificial Intelligence";
  const fitting = ARCHETYPE_FORMS[archetype];
  const pool = ORGANISATION_FORMS.filter(
    (f) =>
      (fitting ? fitting.includes(f.id) : true) && (f.id !== "machine" || tech),
  );
  return pool.length
    ? pool
    : ORGANISATION_FORMS.filter((f) => f.id !== "machine");
}

/**
 * Choose the villain's structural choices. The organisation follows the
 * archetype's power base, the rest are independent, and the inner circle is
 * three different functions held in three different relationships, so it does
 * not collapse into a specialist, a bruiser and an insider.
 */
export function planVillainAxes(
  archetype: string,
  genre: string,
  rng: Rng = defaultRng,
): VillainAxes {
  const functions = pickDistinct(LIEUTENANT_FUNCTIONS, 3, rng);
  const relations = pickDistinct(LIEUTENANT_RELATIONS, 3, rng);
  const awareness = pickDistinct(AWARENESS, 3, rng);
  return {
    organisation: pickFrom(organisationPool(archetype, genre), rng),
    flaw: pickFrom(FATAL_FLAW_KINDS, rng),
    vulnerability: pickFrom(VULNERABILITY_KINDS, rng),
    complication: pickFrom(COMPLICATION_KINDS, rng),
    lieutenants: functions.map((fn, i) => ({
      function: fn,
      relation: relations[i],
      awareness: awareness[i],
    })),
  };
}

/** Draft problems found by the deterministic checks below. */
export interface VillainFinding {
  field: string;
  problem: string;
}

/**
 * "Cannot predict or handle emotional humans": the flaw the generator kept
 * reaching for. Soft heuristic: it reads one sentence at a time, so a flaw
 * that merely mentions emotion elsewhere is not flagged.
 */
const EMOTION_FLAW =
  /\b(?:cannot|can't|unable to|fails? to|struggles? to|incapable of)\s+(?:\w+\s+){0,3}(?:predict|understand|account for|model|handle|anticipate|process)\b[^.]*\b(?:emotion\w*|irrational\w*|unpredictable (?:human|people)|human (?:behaviour|nature|feeling)\w*)/i;

export function genericFlawProblem(flaw: string): string | null {
  return EMOTION_FLAW.test(flaw)
    ? "The fatal flaw is the usual 'cannot handle unpredictable emotional people'. Rewrite it so it follows from this villain's worldview and history."
    : null;
}

/**
 * One master object as the single point of failure. Soft heuristic: requires
 * a "single/only/master" word and a storage object in the same sentence.
 */
const MASTER_OBJECT =
  /\b(?:single|sole|only|master|one)\s+(?:\w+\s+){0,2}(?:ledger|server|keycard|key card|terminal|archive|register|database|vault|codebook|artefact|artifact)\b|\bsingle point of failure\b/i;

export function masterObjectProblem(weakness: string): string | null {
  return MASTER_OBJECT.test(weakness)
    ? "The weakness is a single master object. Ground it in the relationship, belief or obligation named for this villain instead."
    : null;
}

/** The default consequence of defeating a villain. Soft heuristic. */
const POWER_VACUUM =
  /\b(?:power vacuum|gang war|scramble for (?:power|control)|contested succession|struggle for (?:power|control))\b/i;

export function powerVacuumProblem(complication: string): string | null {
  return POWER_VACUUM.test(complication)
    ? "The moral complication is a power vacuum or gang war. Make it follow from this villain's role and the kind of complication assigned."
    : null;
}

const TECH_ROLE =
  /\b(?:hacker|technician|technical|data operator|engineer|techie|systems? (?:analyst|specialist))\b/i;
const MUSCLE_ROLE =
  /\b(?:enforcer|muscle|bruiser|thug|hitman|assassin|killer|bodyguard)\b/i;
const INSIDER_ROLE =
  /\b(?:insider|clerk|accountant|bookkeeper|medic|archivist)\b/i;

/** The recurring trio: a specialist, a bruiser and a compromised insider. */
export function lieutenantTemplateProblem(
  roles: readonly string[],
): string | null {
  const has = (re: RegExp) => roles.some((r) => re.test(r));
  return has(TECH_ROLE) && has(MUSCLE_ROLE) && has(INSIDER_ROLE)
    ? "The inner circle is the usual specialist, enforcer and compromised insider. Use the functions assigned."
    : null;
}

/** Names that kept recurring across samples. Soft: never a global ban. */
const OVERUSED_NAME_FRAGMENTS = ["ledger", "chen", "vance"];

export function overusedNameProblems(names: readonly string[]): string[] {
  const hits = new Set<string>();
  for (const name of names) {
    for (const fragment of OVERUSED_NAME_FRAGMENTS) {
      if (new RegExp(`\\b${fragment}\\b`, "i").test(name)) hits.add(fragment);
    }
  }
  return [...hits].map(
    (h) =>
      `"${h}" has appeared in many earlier villains. Choose a different name or nickname.`,
  );
}

/** Surnames shared between different people, unless the text says they are kin. */
export function sharedSurnameFindings(
  people: ReadonlyArray<{ name: string; relationship: string }>,
): string[] {
  const kin =
    /\b(?:family|brother|sister|sibling|cousin|son|daughter|father|mother|uncle|aunt|nephew|niece|spouse|husband|wife|heir|kin|related)\b/i;
  const bySurname = new Map<string, typeof people>();
  for (const person of people) {
    const parts = person.name.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const surname = parts[parts.length - 1].toLowerCase();
    bySurname.set(surname, [...(bySurname.get(surname) ?? []), person]);
  }
  return [...bySurname.values()]
    .filter(
      (group) =>
        group.length > 1 && !group.some((p) => kin.test(p.relationship)),
    )
    .map(
      (group) =>
        `${group.map((p) => p.name).join(" and ")} share a surname. Say they are related, or give them different surnames.`,
    );
}

const STOP_WORDS = new Set([
  "about",
  "also",
  "been",
  "does",
  "each",
  "even",
  "ever",
  "just",
  "like",
  "made",
  "make",
  "many",
  "more",
  "most",
  "much",
  "must",
  "never",
  "only",
  "some",
  "such",
  "than",
  "them",
  "then",
  "very",
  "well",
  "whom",
  "after",
  "again",
  "against",
  "because",
  "before",
  "being",
  "between",
  "could",
  "every",
  "from",
  "have",
  "into",
  "other",
  "over",
  "should",
  "still",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "through",
  "under",
  "until",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "will",
  "with",
  "without",
  "would",
  "villain",
  "party",
]);

/** A plural and its singular count as the same word ("toll", "tolls"). */
const stem = (word: string): string =>
  word.length > 4 && word.endsWith("s") && !word.endsWith("ss")
    ? word.slice(0, -1)
    : word;

const contentWords = (text: string): Set<string> =>
  new Set(
    (text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? [])
      .filter((w) => !STOP_WORDS.has(w))
      .map(stem),
  );

/** Whether two passages share a distinctive word. A crude test of "talks about the same thing". */
export function sharesTerm(a: string, b: string): boolean {
  const words = contentWords(a);
  for (const w of contentWords(b)) if (words.has(w)) return true;
  return false;
}

/** The chain must have one short step per required plan stage. */
export function dependencyChainProblems(
  chain: readonly string[],
  requiredCount: number,
): string[] {
  const problems: string[] = [];
  if (chain.length !== requiredCount) {
    problems.push(
      `dependencyChain has ${chain.length} steps but the plan has ${requiredCount} required stages. Give one short step per required stage, in order, and leave conditional stages out.`,
    );
  }
  if (new Set(chain.map((s) => s.trim().toLowerCase())).size < chain.length) {
    problems.push(
      "dependencyChain repeats a step. Each step must name what that stage achieves.",
    );
  }
  return problems;
}
