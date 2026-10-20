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
    `Return JSON: {"identity":{"name","type","description","reputationLine","distinctive"},"operations":{"provides","payers","whyHere","mainIncome"},"leadership":{"name","goal","style","trait","pressure"},"staff":[{"name","role","goal","trait"}],"clientele":{"typical","valuable","undesirable","excluded"}}. Staff count must fit the scale.`,
  connections: () =>
    `Return JSON: {"dependencies":[{"input","kind","ifItFails"}],"relationships":[{"name","kind","partyKind","reason"}],"reputation":{"perception","consequence"}}. kind for dependencies is one of materials, labour, transport, licence, magic, data, protection, finance. kind for relationships is one of competitor, supplier, patron, regulator, criminal, neighbour, faction. partyKind is organisation or individual.`,
  trouble: (opts) =>
    `Return JSON: {"pressure","asset","secret","opportunity","complication","hooks":["2 or 3 hooks, each naming a person, party or dependency above"]${opts.playersOwn ? `,"management":{"strengths":[2 to 3 items],"liabilities":[2 to 3 items],"upgrades":[1 or more],"obligations":[1 or more, named only, never costed],"successAttracts":[1 or more]}` : ""}}. ${opts.legitimacy === "legitimate" ? "The secret must not reveal criminal activity." : "The secret may be criminal."}`,
};

/** The user message for one stage of a staged business run. */
export function businessStageMessage(
  stage: BusinessStage,
  opts: ResolvedBusinessOptions,
): string {
  const step =
    stage === "identity"
      ? "step one"
      : stage === "connections"
        ? "step two"
        : "step three";
  return `${header(opts)}\n\nThis is ${step} of three. ${STAGE_INSTRUCTIONS[stage](opts)}`;
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

/** Reads step one. Returns null unless every required field is present. */
export function parseBusinessIdentity(
  reply: string,
): BusinessIdentityStage | null {
  const data = readJsonObject(reply);
  const identity = obj(data, "identity");
  const operations = obj(data, "operations");
  const leader = obj(data, "leadership");
  const clientele = obj(data, "clientele");
  if (!identity || !operations || !leader || !clientele) return null;
  const idFields = [
    "name",
    "type",
    "description",
    "reputationLine",
    "distinctive",
  ] as const;
  const opFields = ["provides", "payers", "whyHere", "mainIncome"] as const;
  if (idFields.some((k) => !str(identity, k))) return null;
  if (opFields.some((k) => !str(operations, k))) return null;
  const leadership = person(
    {
      ...leader,
      role: leader && str(leader, "role") ? str(leader, "role") : "owner",
    },
    "lead",
  );
  if (!leadership) return null;
  const excluded = str(clientele, "excluded");
  const parsed = {
    identity: Object.fromEntries(
      idFields.map((k) => [k, str(identity, k)]),
    ) as BusinessIdentityStage["identity"],
    operations: Object.fromEntries(
      opFields.map((k) => [k, str(operations, k)]),
    ) as BusinessIdentityStage["operations"],
    leadership,
    staff: arr(data, "staff")
      .map((p, i) => person(p, `staff-${i + 1}`))
      .filter((p): p is BusinessPerson => p !== null),
    clientele: {
      typical: str(clientele, "typical"),
      valuable: str(clientele, "valuable"),
      undesirable: str(clientele, "undesirable"),
      ...(excluded ? { excluded } : {}),
    },
  };
  if (
    !parsed.clientele.typical ||
    !parsed.clientele.valuable ||
    !parsed.clientele.undesirable
  )
    return null;
  return parsed;
}

export interface BusinessConnectionsStage {
  dependencies: BusinessDependency[];
  relationships: BusinessRelationship[];
  reputation: { perception: string; consequence: string };
}

/** Reads step two. Returns null for an unknown kind or any missing field. */
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
  const dependencies: BusinessDependency[] = [];
  for (const [i, d] of deps.entries()) {
    const input = str(d, "input");
    const kind = str(d, "kind") as BusinessDependencyKind;
    const ifItFails = str(d, "ifItFails");
    if (!input || !ifItFails || !BUSINESS_DEPENDENCY_KINDS.includes(kind))
      return null;
    dependencies.push({ id: `dep-${i + 1}`, input, kind, ifItFails });
  }
  const relationships: BusinessRelationship[] = [];
  for (const [i, r] of rels.entries()) {
    const name = str(r, "name");
    const kind = str(r, "kind") as BusinessRelationshipKind;
    const partyKind = str(r, "partyKind");
    const reason = str(r, "reason");
    if (!name || !reason || !BUSINESS_RELATIONSHIP_KINDS.includes(kind))
      return null;
    if (partyKind !== "organisation" && partyKind !== "individual") return null;
    relationships.push({
      id: `rel-${i + 1}`,
      name,
      kind,
      label: BUSINESS_LABEL_FOR_KIND[kind],
      reason,
      partyKind,
    });
  }
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
