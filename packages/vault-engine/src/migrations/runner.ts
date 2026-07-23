import { MigrationStore } from "./store";
import { type Clock, type IdGenerator, systemClock, systemIdGenerator } from "../runtime";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function copyDirectoryContents(
  source: FileSystemDirectoryHandle,
  target: FileSystemDirectoryHandle,
): Promise<void> {
  for await (const [name, handle] of source.entries()) {
    if (name === "snapshots") continue;

    if (handle.kind === "file") {
      const sourceFile = await (handle as FileSystemFileHandle).getFile();
      const targetFileHandle = await target.getFileHandle(name, {
        create: true,
      });
      const writable = await targetFileHandle.createWritable({
        keepExistingData: false,
      });
      await writable.write(sourceFile);
      await writable.close();
      continue;
    }

    const targetDirectory = await target.getDirectoryHandle(name, {
      create: true,
    });
    await copyDirectoryContents(
      handle as FileSystemDirectoryHandle,
      targetDirectory,
    );
  }
}

function createSnapshotName(
  targetVersion: number,
  clock: Clock = systemClock,
  idGenerator: IdGenerator = systemIdGenerator,
): string {
  const activeClock = clock ?? systemClock;
  const activeIdGen = idGenerator ?? systemIdGenerator;
  const timestamp = new Date(activeClock.now()).toISOString().replace(/[:.]/g, "-");
  const nonce = activeIdGen.uuid();

  return `v${targetVersion - 1}_before_v${targetVersion}_${timestamp}_${nonce}`;
}

async function createMigrationSnapshot(
  opfsRoot: FileSystemDirectoryHandle,
  targetVersion: number,
  clock: Clock = systemClock,
  idGenerator: IdGenerator = systemIdGenerator,
): Promise<string> {
  const snapshotName = createSnapshotName(targetVersion, clock, idGenerator);
  const snapshotsDir = await opfsRoot.getDirectoryHandle("snapshots", {
    create: true,
  });

  const snapshotDir = await snapshotsDir.getDirectoryHandle(snapshotName, {
    create: true,
  });
  await copyDirectoryContents(opfsRoot, snapshotDir);

  return `snapshots/${snapshotName}`;
}

export async function runMigration(
  opfsRoot: FileSystemDirectoryHandle,
  store: MigrationStore,
  targetVersion: number,
  migrationTask: () => Promise<void>,
  clock: Clock = systemClock,
  idGenerator: IdGenerator = systemIdGenerator,
): Promise<void> {
  let rollbackSnapshotId: string;
  try {
    rollbackSnapshotId = await createMigrationSnapshot(
      opfsRoot,
      targetVersion,
      clock,
      idGenerator,
    );
  } catch (error) {
    const message = getErrorMessage(error);
    await store.addEntry({
      version: targetVersion,
      timestamp: clock.now(),
      status: "failed",
      error: `Pre-migration snapshot failed. ${message}`,
    });
    throw new Error(
      `Migration aborted: Pre-migration snapshot failed. ${message}`,
      {
        cause: error,
      },
    );
  }

  try {
    await migrationTask();

    await store.addEntry({
      version: targetVersion,
      timestamp: clock.now(),
      status: "success",
      rollbackSnapshotId,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    await store.addEntry({
      version: targetVersion,
      timestamp: clock.now(),
      status: "failed",
      error: `Migration task failed. ${message}`,
      rollbackSnapshotId,
    });
    throw error;
  }
}
