import { createArtworkSnapshotFiles } from "@codex/vault-engine";
import { ArtworkSnapshotService } from "./snapshot-service";

type FileArguments = Parameters<typeof createArtworkSnapshotFiles>;

/** Assemble the private snapshot service from the current Vault's adapters. */
export function createSnapshotService(options: {
  io: FileArguments[0];
  root: FileArguments[1];
  vaultId: FileArguments[2];
  lock: FileArguments[3];
  id: () => string;
  digest: (data: ArrayBuffer) => Promise<string>;
  dimensions: (blob: Blob) => Promise<{ width: number; height: number }>;
}): ArtworkSnapshotService {
  const files = createArtworkSnapshotFiles(
    options.io,
    options.root,
    options.vaultId,
    options.lock,
  );
  return new ArtworkSnapshotService({
    id: options.id,
    digest: options.digest,
    dimensions: options.dimensions,
    writeNew: (path, blob) => files.writeNew(path, blob),
    read: (path) => files.read(path),
    remove: (path) => files.remove(path),
  });
}
