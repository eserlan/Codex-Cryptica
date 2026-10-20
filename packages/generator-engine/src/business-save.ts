/**
 * Business / Enterprise Generator (#3627, spec 180) — the save plan (FR-010,
 * FR-015). Pure: it decides what would be created and linked, and the web app
 * applies the user's ticks. Nothing here touches the vault.
 */

import {
  renderBusinessContent,
  stripBusinessMarkdownImages,
  type BusinessDocument,
  type BusinessRelationship,
  type BusinessRelationshipLabel,
} from "./business-state";

export interface BusinessEntityDraft {
  type: "faction" | "character";
  title: string;
  content: string;
  labels: string[];
  /** An existing entity with the same title, to be flagged for rename or keep. */
  collision?: string;
}

export type BusinessPartyChoice =
  | { kind: "match"; entityId: string; ticked: boolean }
  | {
      kind: "create";
      entityType: "faction" | "character";
      draft: BusinessEntityDraft;
      ticked: boolean;
    };

export interface BusinessSavePlan {
  business: BusinessEntityDraft;
  people: Array<{
    personId: string;
    draft: BusinessEntityDraft;
    link: "owned by" | "employs";
    ticked: boolean;
    collision?: string;
  }>;
  parties: Array<{
    relationshipId: string;
    name: string;
    label: BusinessRelationshipLabel;
    choice: BusinessPartyChoice;
  }>;
  source?: {
    entityId: string;
    labelOptions: BusinessRelationshipLabel[];
    label: BusinessRelationshipLabel;
    ticked: boolean;
  };
}

export interface BuildBusinessSavePlanOptions {
  /** Existing vault titles → entity id, keyed by trimmed lower-case title. */
  existingTitles: ReadonlyMap<string, string>;
  source?: {
    entityId: string;
    entityType: "location" | "character" | "faction";
  };
}

const SOURCE_LABELS: Record<
  "location" | "character" | "faction",
  BusinessRelationshipLabel[]
> = {
  location: ["located in"],
  character: ["owned by"],
  faction: ["protected by", "contracted by"],
};

const SOURCE_DEFAULT: Record<
  "location" | "character" | "faction",
  BusinessRelationshipLabel
> = {
  location: "located in",
  character: "owned by",
  faction: "protected by",
};

function key(title: string): string {
  return title.trim().toLowerCase();
}

function collisionOf(
  title: string,
  existing: ReadonlyMap<string, string>,
): string | undefined {
  return existing.get(key(title));
}

function partyEntityType(rel: BusinessRelationship): "faction" | "character" {
  return rel.partyKind === "individual" ? "character" : "faction";
}

export function buildBusinessSavePlan(
  doc: BusinessDocument,
  options: BuildBusinessSavePlanOptions,
): BusinessSavePlan {
  const { existingTitles } = options;
  const ownerLink = doc.options.playersOwn ? "employs" : "owned by";
  const businessTitle = doc.identity.name;

  const business: BusinessEntityDraft = {
    type: "faction",
    title: businessTitle,
    content: renderBusinessContent(doc),
    labels: ["business", "business-generator"],
    collision: collisionOf(businessTitle, existingTitles),
  };

  const people = [doc.leadership, ...doc.staff].map((person) => ({
    personId: person.id,
    draft: {
      type: "character" as const,
      title: person.name,
      content: stripBusinessMarkdownImages(
        `${person.role}. ${person.goal} ${person.trait}`.trim(),
      ),
      labels: ["business-person"],
      collision: collisionOf(person.name, existingTitles),
    },
    link: (person.id === "lead" ? ownerLink : "employs") as
      "owned by" | "employs",
    ticked: true,
    collision: collisionOf(person.name, existingTitles),
  }));

  const parties = doc.relationships.map((rel) => {
    const matchId = existingTitles.get(key(rel.name));
    const choice: BusinessPartyChoice = matchId
      ? { kind: "match", entityId: matchId, ticked: true }
      : {
          kind: "create",
          entityType: partyEntityType(rel),
          draft: {
            type: partyEntityType(rel),
            title: rel.name,
            content: stripBusinessMarkdownImages(rel.reason),
            labels: ["business-party"],
          },
          ticked: false,
        };
    return { relationshipId: rel.id, name: rel.name, label: rel.label, choice };
  });

  const plan: BusinessSavePlan = { business, people, parties };
  if (options.source) {
    const type = options.source.entityType;
    plan.source = {
      entityId: options.source.entityId,
      labelOptions: SOURCE_LABELS[type],
      label: SOURCE_DEFAULT[type],
      ticked: true,
    };
  }
  return plan;
}

/**
 * The public-page handoff: the business and the ticked people as import drafts
 * for the existing ImportDraft flow. Outside parties stay in the text (R7).
 */
export function buildBusinessImportDrafts(
  doc: BusinessDocument,
  tickedPersonIds?: readonly string[],
): unknown[] {
  const ticked = new Set(
    tickedPersonIds ?? [doc.leadership.id, ...doc.staff.map((p) => p.id)],
  );
  const ownerLink = doc.options.playersOwn ? "employs" : "owned by";
  const people = [doc.leadership, ...doc.staff].filter((p) => ticked.has(p.id));
  const personLinks = people.map((p) => ({
    title: p.name,
    type: p.id === "lead" ? ownerLink : "employs",
    label: p.id === "lead" ? ownerLink : "employs",
  }));
  return [
    {
      type: "faction",
      title: doc.identity.name,
      content: renderBusinessContent(doc),
      labels: ["business", "business-generator"],
      status: "active",
      relationships: personLinks,
    },
    ...people.map((p) => ({
      type: "character",
      title: p.name,
      content: stripBusinessMarkdownImages(
        `${p.role}. ${p.goal} ${p.trait}`.trim(),
      ),
      labels: ["business-person"],
      status: "active",
    })),
  ];
}
