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

export interface AssetInput {
  bytes: Blob | Uint8Array;
  originalName: string;
  mimeType: string;
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
  /** Appends a single connection to an entity without touching its other connections. */
  appendConnection(id: string, connection: Connection): Promise<void>;
  associateDrafts?(drafts: AssociatedDraft[]): void;
  saveAsset(asset: AssetInput): Promise<{ ref: string }>;
}
