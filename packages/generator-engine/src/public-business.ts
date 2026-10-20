/**
 * Business / Enterprise Generator (#3627, spec 180) — stage prompts and
 * readers. Framework-free: the AI transport is injected by the caller.
 */

import { readJsonObject, type JsonObject } from "./staged-runtime";
import { BUSINESS_TYPES, genreGroup } from "./business-tables";
import {
  BUSINESS_LABEL_FOR_KIND,
  generateBusinessLocal,
} from "./business-local";
import { businessToOutput } from "./business-state";
import {
  type BusinessDocument,
  type BusinessRelationshipLabel,
  BUSINESS_ALLOWED_LABELS,
  BUSINESS_DEPENDENCY_KINDS,
  BUSINESS_LEGITIMACY,
  BUSINESS_RELATIONSHIP_KINDS,
  BUSINESS_SCALES,
  BUSINESS_TONES,
  BUSINESS_WEALTH,
  type BusinessDependency,
  type BusinessDependencyKind,
  type BusinessManagement,
  type BusinessPerson,
  type BusinessRelationship,
  type BusinessRelationshipKind,
  type ResolvedBusinessOptions,
} from "./business-state";
import type { Rng } from "./random-utils";

export const businessConfig = {
  genres: [
    "Classic Fantasy",
    "Dark Fantasy",
    "Sci-Fi / Space Opera",
    "Cosmic Horror",
    "Cyberpunk / Corporate",
    "Post-Apocalyptic",
    "Weird West / Frontier",
    "Swashbuckling / Nautical",
    "Modern Urban",
  ],
  scales: [...BUSINESS_SCALES],
  legitimacies: [...BUSINESS_LEGITIMACY],
  wealth: [...BUSINESS_WEALTH],
  tones: [...BUSINESS_TONES],
  typesFor: (genre: string): readonly string[] =>
    BUSINESS_TYPES[genreGroup(genre)],
};

export type BusinessStage = "identity" | "connections" | "trouble";

function header(opts: ResolvedBusinessOptions): string {
  const lines = [
    `Business type: ${opts.businessType}`,
    `Genre: ${opts.genre}`,
    `Scale: ${opts.scale}`,
    `Legitimacy: ${opts.legitimacy}`,
    `Wealth: ${opts.wealth}`,
    `Tone: ${opts.tone}`,
  ];
  if (opts.location) lines.push(`Location: ${opts.location}`);
  if (opts.clientele) lines.push(`Clientele: ${opts.clientele}`);
  if (opts.campaignContext)
    lines.push(`Campaign context: ${opts.campaignContext}`);
  if (opts.playersOwn) {
    lines.push(
      "The players own this business. Leadership is a manager or steward the party employs, not an owner.",
    );
  }
  return `Write one ${opts.businessType} as a living organisation for a tabletop RPG.\n${lines.join("\n")}\nNo prices, currency or stock lists. Use new names for every person and party.`;
}

const STAGE_INSTRUCTIONS: Record<
  BusinessStage,
  (opts: ResolvedBusinessOptions) => string
> = {
  identity: () =>
    `Return JSON: {"identity":{"name","type","description","reputationLine","distinctive"},"operations":{"provides","payers","whyHere","mainIncome","model","size","position"},"leadership":{"name","goal","style","trait","pressure"},"staff":[{"name","role","goal","trait"}],"clientele":{"typical","valuable","undesirable","excluded"}}. Staff count must fit the scale. Make the operations specific to this kind of business: "provides" names the main goods or services in concrete terms, "model" says how it earns and whether it owns what it handles or only carries or arranges it for others (for example a trading house is a commission broker, a wholesaler or a carrier; a tavern earns from rooms and covers; a moneylender from loans and exposure), "size" gives premises, people, vehicles or stock in plain words and must agree with the staff you list (if you list no staff, say the owner works alone or with casual labour), and "position" says how it is doing financially right now. Write every field for this genre and business type: do not fall back on village-shop or merchant-house wording (families who come every season, the bigger houses) unless it fits. A staff trait must fit the person's role and must not contradict itself. Staff share a surname only if they are related, and then a trait says so. Do not use generic filler.`,
  connections: () =>
    `Return JSON: {"dependencies":[{"input","kind","ifItFails"}],"relationships":[{"name","kind","partyKind","label","reason"}],"reputation":{"perception","consequence"}}. kind for dependencies is one of materials, labour, transport, licence, magic, data, protection, finance. kind for relationships is one of competitor, supplier, patron, regulator, criminal, neighbour, faction. partyKind is organisation or individual. label must truly describe the party and be one of: competitor: "competes with"; supplier: "supplied by"; patron: "contracted by", "protected by" or "owes"; regulator: "regulated by"; criminal: "owes", "protected by", "supplied by" or "serves"; neighbour: "competes with", "serves", "supplied by" or "contracted by"; faction: "protected by", "contracted by", "regulated by", "owes" or "serves". Only describe a party as protecting the business if it really does.`,
  trouble: (opts) =>
    `Use only the people and parties listed under Established facts; do not invent new named people. The unusual asset must develop the distinctive feature in the Established facts (why it works, who made or installed it, who knows about it); a second asset may be added, but never replace it. Write each hook for the player characters, not for the business's own people: say who approaches or hires them, what they must do, what stands in their way and, if possible, a deadline. Keep the complication a different problem from the pressure. Do not default to debt, a rival and an inspection: choose the trouble that fits the business's wealth and legitimacy, which may be the problems of success, growth, reputation or succession. Return JSON: {"pressure","asset","secret","opportunity","complication","hooks":["2 or 3 hooks, each naming a person, party or dependency above"]${opts.playersOwn ? `,"management":{"strengths":[2 to 3 items],"liabilities":[2 to 3 items],"upgrades":[1 or more],"obligations":[1 or more, named only, never costed],"successAttracts":[1 or more]}` : ""}}. ${opts.legitimacy === "legitimate" ? "The secret must not reveal criminal activity." : "The secret may be criminal."}`,
};

/**
 * The facts every later stage must keep: the business, its people and, once
 * known, its parties. Built from the document as it stands, so a stage that fell
 * back to the tables is described by what is actually in the document.
 */
export function establishedFacts(doc: BusinessDocument): string {
  const staff = doc.staff.length
    ? doc.staff.map((p) => `${p.name} (${p.role})`).join("; ")
    : "none";
  const lines = [
    `Business: ${doc.identity.name}, a ${doc.identity.type}${doc.options.location ? ` in ${doc.options.location}` : ""}.`,
    `${doc.leadership.role === "manager" ? "Manager" : "Owner"}: ${doc.leadership.name}. Goal: ${doc.leadership.goal}`,
    `Staff: ${staff}.`,
    `What it does: ${doc.operations.provides} ${doc.operations.model}`,
    `Distinctive: ${doc.identity.distinctive}`,
  ];
  return lines.join("\n");
}

/** The parties a business has, once the connections stage has set them. */
function establishedParties(doc: BusinessDocument): string {
  return doc.relationships.length
    ? `Parties: ${doc.relationships.map((r) => `${r.name} (${r.kind}, ${r.label})`).join("; ")}.`
    : "";
}

/** The user message for one stage of a staged business run. */
export function businessStageMessage(
  stage: BusinessStage,
  opts: ResolvedBusinessOptions,
  established?: BusinessDocument,
): string {
  const step =
    stage === "identity"
      ? "step one"
      : stage === "connections"
        ? "step two"
        : "step three";
  const facts = established
    ? `\n\nEstablished facts (fixed: do not rename, replace or contradict them):\n${establishedFacts(established)}${stage === "trouble" ? `\n${establishedParties(established)}` : ""}`
    : "";
  return `${header(opts)}${facts}\n\nThis is ${step} of three. ${STAGE_INSTRUCTIONS[stage](opts)}`;
}

function str(o: JsonObject | null | undefined, key: string): string {
  const v = o?.[key];
  return typeof v === "string" ? v.trim() : "";
}

function obj(o: JsonObject | null | undefined, key: string): JsonObject | null {
  const v = o?.[key];
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as JsonObject)
    : null;
}

function arr(o: JsonObject | null | undefined, key: string): JsonObject[] {
  const v = o?.[key];
  return Array.isArray(v)
    ? v.filter((x): x is JsonObject => !!x && typeof x === "object")
    : [];
}

function strings(o: JsonObject | null | undefined, key: string): string[] {
  const v = o?.[key];
  return Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string" && x.trim() !== "")
        .map((x) => x.trim())
    : [];
}

function person(raw: JsonObject, id: string): BusinessPerson | null {
  const name = str(raw, "name");
  const trait = str(raw, "trait");
  if (!name || !trait) return null;
  return {
    id,
    name,
    role: str(raw, "role") || "staff",
    goal: str(raw, "goal") || "Keep the job and do it well.",
    trait,
  };
}

/** Step one: the identity, operations, leadership, staff and clientele fields of the document. */
export type BusinessIdentityStage = Pick<
  BusinessDocument,
  "identity" | "operations" | "leadership" | "staff" | "clientele"
>;

const ID_FIELDS = [
  "name",
  "type",
  "description",
  "reputationLine",
  "distinctive",
] as const;
const OP_FIELDS = [
  "provides",
  "payers",
  "whyHere",
  "mainIncome",
  "model",
  "size",
  "position",
] as const;
const CLIENTELE_FIELDS = ["typical", "valuable", "undesirable"] as const;

/**
 * Reads each field from the reply. A field the reply lacks comes from `base`
 * (and `filled` is set); without a base, a missing field fails the read.
 */
function readFields<K extends string>(
  src: JsonObject | null,
  keys: readonly K[],
  base?: Record<K, string>,
): { values: Record<K, string>; filled: boolean } | null {
  const values = {} as Record<K, string>;
  let filled = false;
  for (const k of keys) {
    const v = str(src, k);
    if (v) values[k] = v;
    else if (base?.[k]) {
      values[k] = base[k];
      filled = true;
    } else return null;
  }
  return { values, filled };
}

/** Which parts of step one were filled from the base because the reply lacked them. */
export type IdentityFilled = Array<"identity" | "operations" | "clientele">;

/**
 * Reads step one. With a `base` (the local document), a reply that has the
 * business, its leader and a description keeps everything it wrote and takes only
 * the missing fields from the base; without one, every field is required.
 */
export function parseBusinessIdentityFilled(
  reply: string,
  base?: BusinessIdentityStage,
): { stage: BusinessIdentityStage; filled: IdentityFilled } | null {
  const data = readJsonObject(reply);
  const identity = obj(data, "identity");
  const leader = obj(data, "leadership");
  if (!identity || !leader) return null;
  if (base && (!str(identity, "name") || !str(identity, "description")))
    return null;
  const id = readFields(identity, ID_FIELDS, base?.identity);
  const ops = readFields(obj(data, "operations"), OP_FIELDS, base?.operations);
  const cl = readFields(
    obj(data, "clientele"),
    CLIENTELE_FIELDS,
    base?.clientele,
  );
  const leadership = person(
    {
      ...leader,
      role: str(leader, "role") || "owner",
    },
    "lead",
  );
  if (!id || !ops || !cl || !leadership) return null;
  const excluded = str(obj(data, "clientele"), "excluded");
  const filled: IdentityFilled = [];
  if (id.filled) filled.push("identity");
  if (ops.filled) filled.push("operations");
  if (cl.filled) filled.push("clientele");
  return {
    stage: {
      identity: id.values as BusinessIdentityStage["identity"],
      operations: ops.values as BusinessIdentityStage["operations"],
      leadership,
      staff: arr(data, "staff")
        .map((p, i) => person(p, `staff-${i + 1}`))
        .filter((p): p is BusinessPerson => p !== null),
      clientele: { ...cl.values, ...(excluded ? { excluded } : {}) },
    },
    filled,
  };
}

/** Reads step one. Returns null unless every required field is present. */
export function parseBusinessIdentity(
  reply: string,
): BusinessIdentityStage | null {
  return parseBusinessIdentityFilled(reply)?.stage ?? null;
}

export interface BusinessConnectionsStage {
  dependencies: BusinessDependency[];
  relationships: BusinessRelationship[];
  reputation: { perception: string; consequence: string };
}

function readDependencies(raw: JsonObject[]): BusinessDependency[] | null {
  const out: BusinessDependency[] = [];
  for (const [i, d] of raw.entries()) {
    const input = str(d, "input");
    const kind = str(d, "kind") as BusinessDependencyKind;
    const ifItFails = str(d, "ifItFails");
    if (!input || !ifItFails || !BUSINESS_DEPENDENCY_KINDS.includes(kind)) {
      return null;
    }
    out.push({ id: `dep-${i + 1}`, input, kind, ifItFails });
  }
  return out;
}

/** A stated label must truly describe the party; an unstated one takes the kind's default. */
function readRelationshipLabel(
  raw: JsonObject,
  kind: BusinessRelationshipKind,
): BusinessRelationshipLabel | null {
  const stated = str(raw, "label") as BusinessRelationshipLabel;
  if (!stated) return BUSINESS_LABEL_FOR_KIND[kind];
  return BUSINESS_ALLOWED_LABELS[kind].includes(stated) ? stated : null;
}

function readRelationships(raw: JsonObject[]): BusinessRelationship[] | null {
  const out: BusinessRelationship[] = [];
  for (const [i, r] of raw.entries()) {
    const name = str(r, "name");
    const kind = str(r, "kind") as BusinessRelationshipKind;
    const partyKind = str(r, "partyKind");
    const reason = str(r, "reason");
    if (!name || !reason || !BUSINESS_RELATIONSHIP_KINDS.includes(kind)) {
      return null;
    }
    if (partyKind !== "organisation" && partyKind !== "individual") return null;
    const label = readRelationshipLabel(r, kind);
    if (!label) return null;
    out.push({ id: `rel-${i + 1}`, name, kind, label, reason, partyKind });
  }
  return out;
}

/** Reads step two. Returns null for an unknown kind, a label that does not fit, or any missing field. */
export function parseBusinessConnections(
  reply: string,
): BusinessConnectionsStage | null {
  const data = readJsonObject(reply);
  const deps = arr(data, "dependencies");
  const rels = arr(data, "relationships");
  const rep = obj(data, "reputation");
  if (deps.length < 1 || rels.length < 1 || !rep) return null;
  const perception = str(rep, "perception");
  const consequence = str(rep, "consequence");
  if (!perception || !consequence) return null;
  const dependencies = readDependencies(deps);
  const relationships = readRelationships(rels);
  if (!dependencies || !relationships) return null;
  return {
    dependencies,
    relationships,
    reputation: { perception, consequence },
  };
}

export interface BusinessTroubleStage {
  pressure: string;
  asset: string;
  secret: string;
  opportunity: string;
  complication: string;
  hooks: string[];
  management?: BusinessManagement;
}

/** Reads step three. Requires 2 to 3 hooks, and management when the players own the business. */
export function parseBusinessTrouble(
  reply: string,
  playersOwn: boolean,
): BusinessTroubleStage | null {
  const data = readJsonObject(reply);
  const fields = [
    "pressure",
    "asset",
    "secret",
    "opportunity",
    "complication",
  ] as const;
  if (fields.some((k) => !str(data, k))) return null;
  const hooks = strings(data, "hooks");
  if (hooks.length < 2 || hooks.length > 3) return null;
  const base = Object.fromEntries(fields.map((k) => [k, str(data, k)])) as Pick<
    BusinessTroubleStage,
    (typeof fields)[number]
  >;
  if (!playersOwn) return { ...base, hooks };
  const m = obj(data, "management");
  if (!m) return null;
  const management: BusinessManagement = {
    strengths: strings(m, "strengths"),
    liabilities: strings(m, "liabilities"),
    upgrades: strings(m, "upgrades"),
    obligations: strings(m, "obligations"),
    successAttracts: strings(m, "successAttracts"),
  };
  const sized =
    management.strengths.length >= 2 &&
    management.strengths.length <= 3 &&
    management.liabilities.length >= 2 &&
    management.liabilities.length <= 3 &&
    management.upgrades.length >= 1 &&
    management.obligations.length >= 1 &&
    management.successAttracts.length >= 1;
  if (!sized) return null;
  return { ...base, hooks, management };
}

/** A complete offline business as a public output; the no-AI path. */
export function generateBusinessOutput(
  options: Parameters<typeof generateBusinessLocal>[0],
  rng?: Rng,
) {
  return businessToOutput(generateBusinessLocal(options, rng));
}
