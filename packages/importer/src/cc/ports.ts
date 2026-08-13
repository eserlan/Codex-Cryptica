export interface AssociatedDraft {
  sourceRef: string;
  title: string;
}

export interface EntityDate {
  year: number;
  month?: number;
  day?: number;
}

export interface NewEntityInput {
  type: string;
  title: string;
  content: string;
  lore?: string;
  tags: string[];
  labels?: string[];
  aliases?: string[];
  image?: string;
  thumbnail?: string;
  connections?: Connection[];
  discoverySource: string;
  metadata?: Record<string, unknown>;
  parent?: string;
  startDate?: EntityDate;
  endDate?: EntityDate;
}

export type EntityPatch = Partial<
  Pick<
    NewEntityInput,
    | "type"
    | "title"
    | "content"
    | "lore"
    | "tags"
    | "labels"
    | "aliases"
    | "image"
    | "thumbnail"
    | "connections"
    | "metadata"
    | "parent"
    | "startDate"
    | "endDate"
  >
>;

/** Current comparable vault fields for a matched entity — powers the review diff and "cif" update policy's union merges. */
export interface ExistingEntityFields {
  title: string;
  content: string;
  lore?: string;
  labels?: string[];
  aliases?: string[];
  type: string;
  parent?: string;
  startDate?: EntityDate;
  endDate?: EntityDate;
}

export interface AssetInput {
  bytes: Blob | Uint8Array;
  originalName: string;
  mimeType: string;
  /** Vault entity to attach this asset to (resolved from the draft's placementRef). */
  entityId?: string;
  /** Verified content digest; enables deterministic, deduped storage names. */
  contentHash?: string;
}

export interface Connection {
  target: string;
  type: string;
  label?: string;
}

export interface VaultWriter {
  findBySourceRef(sourceRef: string): Promise<{ id: string } | null>;
  createEntity(entity: NewEntityInput): Promise<{ id: string }>;
  batchCreateEntities?(
    entities: NewEntityInput[],
  ): Promise<Array<{ id: string }>>;
  updateEntity(id: string, patch: EntityPatch): Promise<void>;
  /** Appends a single connection to an entity without touching its other connections. `created: false` means an identical link was already present (FR-013). */
  appendConnection(
    id: string,
    connection: Connection,
  ): Promise<{ created: boolean }>;
  /** Current comparable fields for a matched entity, powering the review diff and "cif" update policy's union merges. Optional — writers that don't implement it simply get no snapshot. */
  getEntityFields?(id: string): Promise<ExistingEntityFields | null>;
  associateDrafts?(drafts: AssociatedDraft[]): void;
  saveAsset(asset: AssetInput): Promise<{ ref: string }>;
}
