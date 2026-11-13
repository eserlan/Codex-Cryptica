import type { ArtworkAssociation } from "schema";
import type { ArtworkCommand } from "@codex/adventure-artwork-engine";

export type ArtworkSubject =
  | { kind: "entity"; id: string }
  | { kind: "place" | "person" | "scene"; id: string };
export type ArtworkMutationResult =
  { ok: true; association: ArtworkAssociation } | { ok: false; reason: string };
export interface ArtworkControlContext {
  vaultId: string;
  sessionId: string;
  expectedRevision: number;
}
export interface ArtworkRepositoryPort {
  read(
    subject: ArtworkSubject,
    context: ArtworkControlContext,
  ): Promise<unknown>;
  mutate(
    subject: ArtworkSubject,
    command: ArtworkCommand,
    context: ArtworkControlContext,
  ): Promise<ArtworkMutationResult>;
}
export interface ArtworkSnapshotPort {
  preserve(
    source: Blob,
    signal: AbortSignal,
  ): Promise<
    Extract<NonNullable<ArtworkAssociation["override"]>, { kind: "snapshot" }>
  >;
  removeIfUnreferenced(path: string): Promise<void>;
}
export interface ArtworkBlobHandle {
  url: string;
  release(): void;
}
export interface ArtworkNetworkPort {
  fetch(input: RequestInfo | URL, init: RequestInit): Promise<Response>;
}
export interface ArtworkDigestPort {
  sha256(bytes: ArrayBuffer): Promise<string>;
}
export interface ArtworkLockPort {
  run<T>(key: string, action: () => Promise<T>): Promise<T>;
}
export interface ArtworkDeviceIndexPort {
  read(): Promise<unknown>;
  write(value: unknown): Promise<void>;
}
