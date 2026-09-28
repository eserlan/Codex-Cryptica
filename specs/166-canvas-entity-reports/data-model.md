# Phase 1 Data Model: Canvas Entity Reports

No new persistence format and no migration — a report entity is an ordinary `schema` `Entity` of `type: "note"`, stored as the same Markdown file with YAML frontmatter as every other note. The one schema change is **additive**: a new optional `report` field on `EntitySchema` (`packages/schema/src/entity.ts`) that records where the report came from (see "Report provenance" below). Entities without it are unaffected, so no migration is needed. Everything else below is either (a) new in-memory shapes inside `packages/entity-report-engine`, used only while building a report, or (b) the specific fields this feature reads/writes on the existing `Entity`/`Connection` types.

> Why a new top-level field and not `metadata`: `Entity.metadata` is a fixed Zod object (`coordinates`, `width`, `height` only), so extra keys there would be untyped and stripped by any code path that runs `EntitySchema.parse`. A typed, optional `report` field (the same approach `statSheet` and `languageProfile` take) is validated, round-trips through `stringifyEntity`/`parseMarkdown`, and is visible to every consumer.

## Existing types this feature reads (unchanged)

- **`Entity`** (`packages/schema/src/entity.ts`): `id`, `title`, `type`, `content`, `lore`, `labels`, `aliases`, `connections`, `image`, `status`. The vault has no separate "notes" field, so the mapping into a report is explicit and deterministic (FR-005):
  - `content` before its first Markdown heading → `description`; the first paragraph of that (trimmed to one line) → `summary`.
  - `content` from its first heading onward → `notes` (the entity's extra sections).
  - `lore` → `secrets` (the vault's existing GM-only field; `GuestExporter` already strips it). Read only when `include.gmOnlySecrets` is on (FR-003). `artDirection` is never read.
- **`Connection`** (on `Entity.connections`): `{ target, type?, label?, strength? }` — the source of every relationship line (FR-006a) when the entry point is Graph/Table.
- **Canvas edges** (`@codex/canvas-engine`, via `flowEdgeToCanvasEdge`): the source of every relationship line when the entry point is a Canvas (FR-006).

## New in-memory shapes (`packages/entity-report-engine/src/types.ts`)

```ts
/** Where the report's entities come from. Field names match the saved
 *  provenance (`ReportProvenance`) so a scope can be stored and re-resolved as is. */
export type ReportScope =
  | { origin: "canvas"; canvasId: string; selection: "entire" | "selected" }
  | { origin: "graph" | "table" }; // FR-002a: no "entire" variant

/** A scope plus the concrete entity ids it resolved to when the report was made.
 *  Entry points return this alongside their `ReportInput`; the panel merges it
 *  with the chosen options to build the saved provenance. `entityIds` is omitted
 *  for canvas + "entire" (re-read from the canvas on regenerate). */
export type ReportSource = ReportScope & { entityIds?: string[] };

export interface ReportOptions {
  scope: ReportScope;
  include: {
    descriptions: boolean;
    relationships: boolean;
    factionsAffiliations: boolean;
    portraits: boolean;
    notes: boolean;
    gmOnlySecrets: boolean; // FR-003: false by default
  };
  detail: "brief" | "standard" | "detailed";
}

/** Minimal, engine-agnostic view of one entity — mapped from `schema`'s
 *  `Entity` by the caller, so this package stays framework/vault-free. */
export interface ReportEntityInput {
  id: string;
  title: string;
  type: string; // "character" | "faction" | "location" | ... (open, per FR-015)
  summary?: string; // short description (Brief detail)
  description?: string; // fuller description (Standard/Detailed)
  secrets?: string; // entity `lore`; GM-only, only read when include.gmOnlySecrets
  notes?: string; // entity `content` from its first heading onward
  portraitUrl?: string;
  labels: string[];
}

/** One explicit, directional relationship already filtered to "both
 *  endpoints included" by the caller (FR-006/FR-006a) — this package never
 *  does inclusion filtering itself, only formatting. */
export interface ReportRelationshipInput {
  sourceId: string;
  targetId: string;
  label: string; // e.g. "friend", "enemy", "protective of"
}

export interface ReportInput {
  entities: ReportEntityInput[];
  relationships: ReportRelationshipInput[];
  /** faction id -> ids of member entities present in `entities` (FR-019).
   *  Membership rule (fixed here so every entry point agrees): an in-scope
   *  relationship between a faction entity and a NON-faction entity, in either
   *  direction, whatever its label, makes that entity a member. A relationship
   *  between two factions is a faction-level relationship, not membership.
   *  Never built from a vault-wide roster. */
  factionMembership: Record<string, string[]>;
}

/** The structured output `build-report.ts` produces — consumed by both the
 *  pre-save preview (`ReportPreview.svelte`) and, via `markdown.ts`, turned
 *  into the entity's saved `content` field. */
export interface ReportDocument {
  overview: {
    entityCount: number;
    relationshipCount: number;
    factionCount: number;
  };
  sections: ReportSection[]; // one per included entity/faction, presentation-view-tagged
  relationshipSummary: ReportRelationshipLine[];
}

export type ReportSection =
  // affiliations = titles of the factions whose `factionMembership` contains
  // this entity (the inverse of the membership map) — no other source.
  | {
      kind: "character";
      entity: ReportEntityInput;
      relationships: ReportRelationshipLine[];
      affiliations: string[];
    }
  | {
      kind: "faction";
      entity: ReportEntityInput;
      members: ReportEntityInput[];
      relationships: ReportRelationshipLine[];
    }
  | { kind: "generic"; entity: ReportEntityInput }; // FR-015: other types

export interface ReportRelationshipLine {
  sourceTitle: string;
  label: string;
  targetTitle: string;
}
```

## Report provenance (new, on `Entity`)

Added to `EntitySchema` in `packages/schema/src/entity.ts` as `report: ReportProvenanceSchema.optional()`:

```ts
export const ReportProvenanceSchema = z.object({
  origin: z.enum(["canvas", "graph", "table"]),
  canvasId: z.string().optional(), // origin === "canvas"
  selection: z.enum(["entire", "selected"]).optional(), // origin === "canvas"
  /** Entities the report covered. Recorded for "selected"/graph/table scopes so
   *  Regenerate can rebuild the same input; omitted for "entire" (re-read from
   *  the canvas at regeneration time). */
  entityIds: z.array(z.string()).optional(),
  include: z.object({
    descriptions: z.boolean(),
    relationships: z.boolean(),
    factionsAffiliations: z.boolean(),
    portraits: z.boolean(),
    notes: z.boolean(),
    gmOnlySecrets: z.boolean(),
  }),
  detail: z.enum(["brief", "standard", "detailed"]),
  generatedAt: z.number(),
  /** Hash of `content` at generation time — how Regenerate detects manual edits (FR-013d). */
  contentHash: z.string(),
});
```

This is what makes Regenerate (FR-013d) possible: the original scope, the chosen options and the generated-content fingerprint all travel with the entity. If the source canvas or entities are later deleted, the saved report's own text is unaffected (spec edge case); Regenerate then reports that the source is gone and changes nothing.

## The saved entity (what `ReportService.save()` writes)

Follows `delve-dossier-service.ts`, with two deliberate differences: the body is in `content` (not `lore`), and there are no connections.

| `Entity` field | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`         | `"note"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `kind`         | `"report"` (new discriminator value alongside `"delve-dossier"`; `kind` is a free-form `z.string()` and no kind list exists, so nothing else needs registering)                                                                                                                                                                                                                                                                                                                                            |
| `title`        | GM-provided, or defaulted from the source canvas name / date (spec Assumptions)                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `content`      | The full report as Markdown with the R3 predictable heading grammar (`markdown.ts` output), starting with `## Overview` and its counts line. This is the field the standard Zen view shows as the note's main body and edits in the standard editor, so the report reads and edits like any note (FR-013b/c). `lore` is deliberately NOT used: Zen shows it only outside guest mode and under a themed "Lore" heading, which would make a report read like a lore appendix instead of the document itself. |
| `labels`       | `["report"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `connections`  | none. A per-entity link would turn every report into a hub node with N edges in Graph and Table and inflate those entities' connection counts. FR-013a needs the report to be findable (title, labels, content search) and linkable from other entities (ordinary wiki-links) — both work without connections.                                                                                                                                                                                             |
| `report`       | The provenance object above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

**Guest and public exposure**: `GuestExporter.export()` skips every `kind: "report"` entity, and drops any connection that targets one. A report can contain GM-only text once the GM opts in (FR-003), and its title and body are otherwise not stripped by the exporter, so reports never reach guest snapshots or the public world directory.

## Content hash (`packages/entity-report-engine/src/content-hash.ts`)

`hashReportContent(content: string): string` — a small synchronous, deterministic non-cryptographic string hash (FNV-1a, 32-bit, hex). It exists only to answer "did the text change since we generated it", so a cryptographic hash is unnecessary. It lives in the engine (pure, no I/O) so the save path and the regenerate path share one definition.

## Validation / state rules carried from the spec

- **FR-004 / FR-017**: `ReportInput.entities` MUST be non-empty before a preview is generated; `build-report.ts` MUST NOT be called with zero entities — the UI layer enforces this before ever constructing a `ReportInput` (not a runtime error inside the engine).
- **FR-006 / FR-006a**: `ReportRelationshipInput` is only ever constructed for pairs already known to both be in `ReportInput.entities` — the _caller_ (canvas/graph/table entry point) does this filtering; `build-report.ts` trusts its input and does no further inclusion logic, keeping the package pure and simple (Principle III).
- **FR-019**: `factionMembership[factionId]` is built by the caller from relationships/edges already present in scope — never from a full vault-wide faction roster lookup. `entity-report-engine` has no access to "the rest of the vault" at all (by type signature), which makes this rule structurally hard to violate rather than merely documented.
- **FR-013d**: `ReportService.regenerate()` compares `hashReportContent(entity.content)` with `entity.report.contentHash`. A mismatch means the GM edited the text since it was generated (`hadManualEdits: true`); the UI then asks for confirmation before the update is applied. On success it rewrites `content` and `report.generatedAt` / `report.contentHash`, and keeps `report.origin`, scope and options. Regenerate rebuilds its input from `report` alone (canvas → re-read the canvas, filtered by `selection`/`entityIds`; graph/table → `entityIds` looked up in the vault), never from anything the UI happens to have open.
- **Second report from the same source**: `save()` always creates a new entity (new id); it never looks for or overwrites an earlier report. Only `regenerate(entityId, …)` modifies an existing one.
