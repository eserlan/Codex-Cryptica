# Contract: `packages/entity-report-engine`

This is an internal library contract (Constitution Principle I), not a network/API boundary — `apps/web` is the only consumer. Types referenced (`ReportInput`, `ReportOptions`, `ReportDocument`, etc.) are defined in [data-model.md](../data-model.md).

## Public surface (`packages/entity-report-engine/src/index.ts`)

```ts
/**
 * Pure function: given already-scoped, already-filtered entities and
 * relationships (FR-006/FR-006a/FR-019 filtering is the CALLER's job, not
 * this function's — see data-model.md's Validation rules), produce the
 * structured report. No I/O, no vault access, no randomness, no AI.
 */
export function buildReport(
  input: ReportInput,
  options: ReportOptions,
): ReportDocument;

/**
 * ReportDocument -> Markdown, using the fixed heading grammar research.md
 * (R3) commits to purely for human readability once opened in the app's
 * standard entity view — nothing parses this back into a ReportDocument.
 * There is no reverse function: once saved, a report entity is read and
 * edited exactly like any other note (FR-013b), never through this
 * package again.
 */
export function renderReportMarkdown(document: ReportDocument): string;

/** Deterministic, synchronous, non-cryptographic hash of a report's text
 *  (FNV-1a 32-bit, hex). Shared by save() and regenerate() so "edited since
 *  generation" has exactly one definition. */
export function hashReportContent(content: string): string;

// Presentation views (FR-014's reusability requirement — each is a pure
// function from one typed input to a small, UI-framework-agnostic view
// model a Svelte component then renders; NOT a Svelte component itself,
// so a future non-Svelte consumer (e.g. a script generating a PDF) can
// call the same formatting logic):

export function renderCharacterSummary(
  entity: ReportEntityInput,
  relationships: ReportRelationshipLine[],
  affiliations: string[],
  detail: ReportOptions["detail"],
): CharacterReportView;

export function renderFactionSummary(
  entity: ReportEntityInput,
  members: ReportEntityInput[],
  relationships: ReportRelationshipLine[],
): FactionReportView;

export function renderRelationshipLine(
  rel: ReportRelationshipInput,
  titlesById: ReadonlyMap<string, string>,
): string; // e.g. "Vargas — friend → Lajos"
```

## Contract: `apps/web/src/lib/services/report-service.ts`

Mirrors `DelveDossierServiceDeps` (constructor-injected, sane production defaults, exported class + singleton — Principle VIII):

```ts
export interface ReportServiceDeps {
  getEntity: (id: string) => Entity | undefined;
  createNote: (title: string, initialData: Partial<Entity>) => Promise<string>;
  updateEntity: (id: string, updates: Partial<LocalEntity>) => Promise<boolean>;
  now: () => number;
}

export class ReportService {
  constructor(deps?: ReportServiceDeps);

  /** FR-013: turns a generated (not-yet-saved) ReportDocument into a new
   *  Note-category entity, kind: "report". Never called until the GM
   *  explicitly saves (FR-002/FR-011 — nothing is written during preview). */
  save(
    document: ReportDocument,
    options: {
      title?: string;
      provenance: Omit<ReportProvenance, "contentHash" | "generatedAt">;
    },
  ): Promise<{ entityId: string; created: true }>;

  /** FR-013d/FR-013e: regenerates an EXISTING report entity's content, using
   *  the scope and options stored in its `report` provenance. Reports
   *  `hadManualEdits` (current content hash differs from `report.contentHash`)
   *  and, when `confirmed` is false and there are manual edits, writes
   *  NOTHING and returns `{ hadManualEdits: true, applied: false }` so the UI
   *  can ask first. Fails safely (no write) for a non-report entity. */
  regenerate(
    entityId: string,
    document: ReportDocument,
    options?: { confirmed?: boolean },
  ): Promise<{ hadManualEdits: boolean; applied: boolean }>;

  /** FR-020: exports a saved report entity via ClipboardService. Format is
   *  extensible (data-model.md's export deferral) but MUST support at
   *  least "markdown" on introduction. */
  export(entityId: string, format: "markdown"): Promise<boolean>;
}

export const reportService: ReportService;
```

## Contract: canvas/graph/table entry points

Each entry point is responsible only for producing a `ReportInput` (entities + already-filtered relationships + faction membership) and handing it to the shared `ReportPanel.svelte`. None of them talk to `entity-report-engine` or `ReportService` directly except through that shared panel — this is what makes SC-007/SC-008 ("identical regardless of origin surface") a structural guarantee rather than a convention three separate implementations have to remember to follow.

```ts
// apps/web/src/lib/components/canvas/canvas-report-generation.ts
export function useCanvasReportGeneration(
  canvas: Canvas,
  nodes: FlowNode[],
  edges: FlowEdge[],
  selection: "entire" | "selected",
): {
  input: ReportInput | null;
  source: ReportSource;
  error?: "no-selection" | "no-entities";
};

// apps/web/src/lib/components/graph/graph-report-generation.ts
export function useGraphReportGeneration(
  selectedNodeIds: string[],
  getEntity: (id: string) => Entity | undefined,
): { input: ReportInput | null; source: ReportSource; error?: "no-selection" };

// apps/web/src/lib/components/table/table-report-generation.ts
export function useTableReportGeneration(
  selectedEntityIds: string[],
  getEntity: (id: string) => Entity | undefined,
): { input: ReportInput | null; source: ReportSource; error?: "no-selection" };

// apps/web/src/lib/services/report-source-resolver.ts
// Used by Regenerate: turns a saved report's provenance back into a ReportInput
// by dispatching to the three functions above.
export function resolveReportSource(
  provenance: ReportProvenance,
  deps: {
    getEntity: (id: string) => Entity | undefined;
    getCanvas: (id: string) => Canvas | undefined;
  },
): { input: ReportInput | null; error?: "source-missing" | "no-entities" };
```

Regenerate does not go through these hooks with live UI state: `ReportZenActions` rebuilds the `ReportInput` from the saved entity's `report` provenance (`origin`, `canvasId`, `selection`, `entityIds`) using the same mapper and the same underlying functions as the hooks, so a report made from a Graph or Table selection can be regenerated after that selection is gone.

All three share the FR-006a filtering rule (`entity.connections` restricted to pairs where both endpoints are in the given entity set) except the canvas path, which reads canvas edges instead (FR-006) — see research.md R2.
