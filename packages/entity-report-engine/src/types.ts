export type ReportScope =
  | { origin: "canvas"; canvasId: string; selection: "entire" | "selected" }
  | { origin: "graph" | "table" };

export type ReportSource = ReportScope & { entityIds?: string[] };

export interface ReportInclude {
  descriptions: boolean;
  relationships: boolean;
  factionsAffiliations: boolean;
  portraits: boolean;
  notes: boolean;
  gmOnlySecrets: boolean;
}

export type ReportDetail = "brief" | "standard";

export interface ReportOptions {
  scope: ReportScope;
  include: ReportInclude;
  detail: ReportDetail;
}

export interface ReportEntityInput {
  id: string;
  title: string;
  type: string;
  summary?: string;
  description?: string;
  secrets?: string;
  notes?: string;
  portraitUrl?: string;
  /** Explicit silhouette id, used for the preview fallback when there is no portrait. */
  silhouette?: string;
  labels: string[];
}

export interface ReportRelationshipInput {
  sourceId: string;
  targetId: string;
  label: string;
}

export interface ReportInput {
  entities: ReportEntityInput[];
  relationships: ReportRelationshipInput[];
  factionMembership: Record<string, string[]>;
}

export interface ReportRelationshipLine {
  sourceTitle: string;
  label: string;
  targetTitle: string;
}

export interface CharacterReportView {
  title: string;
  type: string;
  portraitUrl?: string;
  summary?: string;
  description?: string;
  notes?: string;
  secrets?: string;
  relationships: string[];
  affiliations: string[];
}

export interface FactionReportView {
  title: string;
  portraitUrl?: string;
  summary?: string;
  description?: string;
  notes?: string;
  secrets?: string;
  members: string[];
  relationships: string[];
}

export type ReportSection =
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
  | { kind: "generic"; entity: ReportEntityInput };

export interface ReportDocument {
  overview: {
    entityCount: number;
    relationshipCount: number;
    factionCount: number;
  };
  detail: ReportDetail;
  /** Whether visuals (portraits, or silhouettes as a fallback) are included. */
  includePortraits: boolean;
  sections: ReportSection[];
  relationshipSummary: ReportRelationshipLine[];
}
