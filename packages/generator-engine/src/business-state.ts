/**
 * Business / Enterprise Generator (#3627, spec 180) — document types and
 * rendering. A business is one organisation with people, dependencies,
 * rivals, pressure and hooks; it is not a shop inventory.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";

export type BusinessScale =
  "tiny" | "small" | "established" | "regional" | "major";
export type BusinessLegitimacy = "legitimate" | "grey" | "front" | "mixed";
export type BusinessWealth = "struggling" | "modest" | "comfortable" | "rich";
export type BusinessTone =
  "grounded" | "gritty" | "whimsical" | "dark" | "heroic";

export const BUSINESS_SCALES: readonly BusinessScale[] = [
  "tiny",
  "small",
  "established",
  "regional",
  "major",
];
export const BUSINESS_LEGITIMACY: readonly BusinessLegitimacy[] = [
  "legitimate",
  "grey",
  "front",
  "mixed",
];
export const BUSINESS_WEALTH: readonly BusinessWealth[] = [
  "struggling",
  "modest",
  "comfortable",
  "rich",
];
export const BUSINESS_TONES: readonly BusinessTone[] = [
  "grounded",
  "gritty",
  "whimsical",
  "dark",
  "heroic",
];

export interface BusinessGeneratorOptions {
  genre?: string;
  businessType?: string;
  scale?: BusinessScale;
  legitimacy?: BusinessLegitimacy;
  wealth?: BusinessWealth;
  clientele?: string;
  location?: string;
  tone?: BusinessTone;
  campaignContext?: string;
  playersOwn?: boolean;
}

export interface ResolvedBusinessOptions {
  genre: string;
  businessType: string;
  scale: BusinessScale;
  legitimacy: BusinessLegitimacy;
  wealth: BusinessWealth;
  clientele: string;
  location: string;
  tone: BusinessTone;
  campaignContext: string;
  playersOwn: boolean;
}

export interface BusinessPerson {
  id: string;
  name: string;
  role: string;
  goal: string;
  style?: string;
  trait: string;
  pressure?: string;
}

/** The closed list of dependency kinds; the type is derived from it. */
export const BUSINESS_DEPENDENCY_KINDS = [
  "materials",
  "labour",
  "transport",
  "licence",
  "magic",
  "data",
  "protection",
  "finance",
] as const;
export type BusinessDependencyKind = (typeof BUSINESS_DEPENDENCY_KINDS)[number];

export interface BusinessDependency {
  id: string;
  input: string;
  kind: BusinessDependencyKind;
  ifItFails: string;
}

export type BusinessRelationshipLabel =
  | "owned by"
  | "employs"
  | "supplied by"
  | "serves"
  | "competes with"
  | "regulated by"
  | "owes"
  | "protected by"
  | "located in"
  | "contracted by";

/** The closed list of relationship kinds; the type is derived from it. */
export const BUSINESS_RELATIONSHIP_KINDS = [
  "competitor",
  "supplier",
  "patron",
  "regulator",
  "criminal",
  "neighbour",
  "faction",
] as const;
export type BusinessRelationshipKind =
  (typeof BUSINESS_RELATIONSHIP_KINDS)[number];

/**
 * The graph labels that honestly describe each kind of party (FR-011). A label
 * outside this list for its kind is a mismatch and is rejected.
 */
export const BUSINESS_ALLOWED_LABELS: Record<
  BusinessRelationshipKind,
  readonly BusinessRelationshipLabel[]
> = {
  competitor: ["competes with"],
  supplier: ["supplied by"],
  patron: ["contracted by", "protected by", "owes"],
  regulator: ["regulated by"],
  criminal: ["owes", "protected by", "supplied by", "serves"],
  neighbour: ["competes with", "serves", "supplied by", "contracted by"],
  faction: ["protected by", "contracted by", "regulated by", "owes", "serves"],
};

export interface BusinessRelationship {
  id: string;
  name: string;
  kind: BusinessRelationshipKind;
  label: BusinessRelationshipLabel;
  reason: string;
  partyKind: "organisation" | "individual";
}

export interface BusinessManagement {
  strengths: string[];
  liabilities: string[];
  upgrades: string[];
  obligations: string[];
  successAttracts: string[];
}

export type BusinessSectionId =
  | "identity"
  | "operations"
  | "leadership"
  | `staff:${string}`
  | "clientele"
  | "dependencies"
  | "relationships"
  | "reputation"
  | "pressure"
  | "asset"
  | "secret"
  | "opportunity"
  | "complication"
  | "hooks"
  | "management";

export interface BusinessDocument {
  version: 1;
  options: ResolvedBusinessOptions;
  identity: {
    name: string;
    type: string;
    description: string;
    reputationLine: string;
    distinctive: string;
  };
  operations: {
    provides: string;
    payers: string;
    whyHere: string;
    mainIncome: string;
    /** How this kind of business actually earns, and what it owns versus carries for others. */
    model: string;
    /** How big it is in plain words: premises, people, vehicles or stock. */
    size: string;
    /** How it is doing right now, financially. */
    position: string;
  };
  leadership: BusinessPerson;
  staff: BusinessPerson[];
  clientele: {
    typical: string;
    valuable: string;
    undesirable: string;
    excluded?: string;
  };
  dependencies: BusinessDependency[];
  relationships: BusinessRelationship[];
  reputation: { perception: string; consequence: string };
  pressure: string;
  asset: string;
  secret: string;
  opportunity: string;
  complication: string;
  hooks: string[];
  management?: BusinessManagement;
  fallbackSections: BusinessSectionId[];
  /** Names that appear in the text without being introduced as a person or party. */
  warnings?: string[];
}

/** Removes image syntax from untrusted text before it is stored as Markdown. */
export function stripBusinessMarkdownImages(text: string): string {
  return text
    .replace(/!\[([^\]]*)\](?:\([^)]*\)|\[[^\]]*\])?/g, "$1")
    .replace(/<img\b[^>]*>/gi, "");
}

/** Lowercase names of sections, for user-facing notes. */
export const BUSINESS_SECTION_LABELS: Record<string, string> = {
  identity: "identity",
  operations: "what it does",
  leadership: "leadership",
  clientele: "clientele",
  dependencies: "dependencies",
  relationships: "relationships",
  reputation: "reputation",
  pressure: "current pressure",
  asset: "unusual asset",
  secret: "secret",
  opportunity: "opportunity",
  complication: "complication",
  hooks: "adventure hooks",
  management: "management",
};

export function businessSectionLabel(section: BusinessSectionId): string {
  if (section.startsWith("staff:")) return "key staff";
  return BUSINESS_SECTION_LABELS[section] ?? section;
}

/** Renders the business as GM-facing markdown (vault content). */
export function renderBusinessContent(doc: BusinessDocument): string {
  const { identity, operations, leadership, staff, clientele } = doc;
  const lines: string[] = [
    "## Identity",
    `**${identity.name}** — ${identity.type}`,
    identity.description,
    `Reputation: ${identity.reputationLine}`,
    `What makes it distinctive: ${identity.distinctive}`,
    "",
    "## What It Does",
    operations.provides,
    `Who pays: ${operations.payers}`,
    `Why here: ${operations.whyHere}`,
    `Main income: ${operations.mainIncome}`,
    `How it earns: ${operations.model}`,
    `Size: ${operations.size}`,
    `Right now: ${operations.position}`,
    "",
    "## Leadership",
    `**${leadership.name}** (${leadership.role}) — ${leadership.goal}`,
    leadership.style ? `Style: ${leadership.style}` : "",
    `Trait: ${leadership.trait}`,
    leadership.pressure ? `Pressure: ${leadership.pressure}` : "",
    "",
    "## Key Staff",
    ...(staff.length
      ? staff.map((p) => `- **${p.name}**, ${p.role} — ${p.trait}`)
      : ["No regular staff."]),
    "",
    "## Clientele",
    `Typical: ${clientele.typical}`,
    `Valuable: ${clientele.valuable}`,
    `Undesirable: ${clientele.undesirable}`,
    clientele.excluded ? `Excluded: ${clientele.excluded}` : "",
    "",
    "## Suppliers and Dependencies",
    ...doc.dependencies.map(
      (d) => `- ${d.input} (${d.kind}). If it fails: ${d.ifItFails}`,
    ),
    "",
    "## Competitors and Relationships",
    ...doc.relationships.map(
      (r) => `- **${r.name}** — ${r.label}. ${r.reason}`,
    ),
    "",
    "## Reputation",
    doc.reputation.perception,
    `Consequence: ${doc.reputation.consequence}`,
    "",
    "## Current Pressure",
    doc.pressure,
    "",
    "## Unusual Asset",
    doc.asset,
    "",
    "## Secret",
    doc.secret,
    "",
    "## Opportunity",
    doc.opportunity,
    "",
    "## Complication",
    doc.complication,
    "",
    "## Adventure Hooks",
    ...doc.hooks.map((h) => `- ${h}`),
  ];
  if (doc.management) {
    const m = doc.management;
    lines.push(
      "",
      "## Management",
      "**Starting strengths**",
      ...m.strengths.map((x) => `- ${x}`),
      "**Weaknesses and liabilities**",
      ...m.liabilities.map((x) => `- ${x}`),
      "**Upgrade paths**",
      ...m.upgrades.map((x) => `- ${x}`),
      "**Recurring obligations**",
      ...m.obligations.map((x) => `- ${x}`),
      "**What success attracts**",
      ...m.successAttracts.map((x) => `- ${x}`),
    );
  }
  return stripBusinessMarkdownImages(
    lines
      .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
      .join("\n")
      .trim(),
  );
}

/** The public / campaign output shape for a business document. */
export function businessToOutput(
  doc: BusinessDocument,
): PublicGeneratorOutput & {
  business: BusinessDocument;
} {
  const genreLabel = doc.options.genre.toLowerCase().replace(/\s+/g, "-");
  return {
    type: "faction",
    title: doc.identity.name,
    summary: doc.identity.description,
    content: renderBusinessContent(doc),
    lore: "",
    labels: ["business", "business-generator", genreLabel],
    status: "active",
    business: doc,
  };
}
