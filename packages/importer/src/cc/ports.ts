export interface NewEntityInput {
  type: string;
  title: string;
  content: string;
  lore?: string;
  tags: string[];
  connections?: Connection[];
  discoverySource: string;
  metadata?: Record<string, unknown>;
  parent?: string;
}

export type EntityPatch = Partial<
  Pick<
    NewEntityInput,
    | "type"
    | "title"
    | "content"
    | "lore"
    | "tags"
    | "connections"
    | "metadata"
    | "parent"
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
  updateEntity(id: string, patch: EntityPatch): Promise<void>;
  /** Appends a single connection to an entity without touching its other connections. */
  appendConnection(id: string, connection: Connection): Promise<void>;
  saveAsset(asset: AssetInput): Promise<{ ref: string }>;
}
