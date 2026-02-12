import {
  createVaultDir,
  walkOpfsDirectory,
  writeOpfsFile,
  getOpfsRoot,
} from "../../utils/opfs";

export { getOpfsRoot };
import {
  getPersistedHandle,
  clearPersistedHandle,
  getDB,
} from "../../utils/idb";
import { debugStore } from "../debug.svelte";
import { walkDirectory } from "../../utils/fs";

export async function migrateStructure(opfsRoot: FileSystemDirectoryHandle) {
  if (!opfsRoot) return;
  try {
    try {
      await opfsRoot.getDirectoryHandle("vaults");
      return;
    } catch {
      /* Initial run or vaults dir missing - proceed to migration */
    }

    const rootFiles: { handle: FileSystemFileHandle; name: string }[] = [];
    let hasImages = false;

    for await (const [name, handle] of opfsRoot.entries()) {
      if (handle.kind === "file" && name.endsWith(".md")) {
        rootFiles.push({ handle: handle as FileSystemFileHandle, name });
      } else if (handle.kind === "directory" && name === "images") {
        hasImages = true;
      }
    }

    if (rootFiles.length === 0 && !hasImages) return;

    debugStore.log("Migrating root files to vaults/default...");
    const defaultVaultDir = await createVaultDir(opfsRoot, "default");

    for (const file of rootFiles) {
      const content = await file.handle.getFile().then((f) => f.text());
      await writeOpfsFile([file.name], content, defaultVaultDir);
      await opfsRoot.removeEntry(file.name);
    }

    if (hasImages) {
      const rootImagesDir = await opfsRoot.getDirectoryHandle("images");
      const targetImagesDir = await defaultVaultDir.getDirectoryHandle(
        "images",
        { create: true },
      );

      const imageFiles = await walkOpfsDirectory(rootImagesDir);
      for (const img of imageFiles) {
        const blob = await img.handle.getFile();
        await writeOpfsFile(img.path, blob, targetImagesDir);
      }
      await opfsRoot.removeEntry("images", { recursive: true });
    }

    const db = await getDB();
    await db.put("vaults", {
      id: "default",
      name: "Default Vault",
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      entityCount: rootFiles.length,
    });
    await db.put("settings", "default", "activeVaultId");
    debugStore.log("Migration to vaults/default complete.");
  } catch (e) {
    console.error("Structure migration failed", e);
  }
}

export async function checkForMigration(): Promise<{
  required: boolean;
  handle?: FileSystemDirectoryHandle;
}> {
  const db = await getDB();
  const migrationFlag = await db.get("settings", "opfsMigrationComplete");
  if (migrationFlag) return { required: false };

  const persisted = await getPersistedHandle();
  if (persisted) {
    return { required: true, handle: persisted };
  }
  return { required: false };
}

export async function runMigration(
  opfsRoot: FileSystemDirectoryHandle,
  legacyHandle: FileSystemDirectoryHandle,
  silent = false,
  onComplete: () => Promise<void>,
  updateStatus: (status: "loading" | "error" | "idle", error?: string) => void,
) {
  if (!legacyHandle || !opfsRoot) return;

  if (silent) {
    const permission = await legacyHandle.queryPermission({
      mode: "read",
    });
    if (permission !== "granted") {
      debugStore.log(
        "Auto-migration paused: Waiting for user permission gesture.",
      );
      return;
    }
  }

  updateStatus("loading");
  debugStore.log("Starting migration from File System Access API to OPFS...");

  try {
    try {
      const permission = await legacyHandle.queryPermission({
        mode: "read",
      });
      if (permission !== "granted" && !silent) {
        await legacyHandle.requestPermission({ mode: "read" });
      }
    } catch (permErr) {
      debugStore.warn(
        "Failed to query/request permission, attempting re-resolve.",
        permErr,
      );
    }

    const files = await walkDirectory(legacyHandle);
    debugStore.log(`Migration: Found ${files.length} files to copy.`);

    for (const fileEntry of files) {
      try {
        debugStore.log(`Migrating file: /${fileEntry.path.join("/")}`);
        const content = await fileEntry.handle.getFile().then((f) => f.text());
        await writeOpfsFile(fileEntry.path, content, opfsRoot);
      } catch (fileErr: any) {
        debugStore.error(
          `Failed to migrate file /${fileEntry.path.join("/")}: ${fileErr.name} - ${fileErr.message}`,
        );
        throw fileErr;
      }
    }

    // Migrate images directory
    try {
      const imagesDir = await legacyHandle.getDirectoryHandle("images");
      const opfsImagesDir = await opfsRoot.getDirectoryHandle("images", {
        create: true,
      });
      for await (const handle of imagesDir.values()) {
        if (handle.kind === "file") {
          const file = await (handle as any).getFile();
          await writeOpfsFile([file.name], file, opfsImagesDir);
        }
      }
    } catch (e) {
      debugStore.warn("No images directory to migrate or migration failed.", e);
    }

    const db = await getDB();
    await db.put("settings", true, "opfsMigrationComplete");
    await clearPersistedHandle();

    debugStore.log("Migration complete. Loading files from OPFS.");
    await onComplete();
  } catch (err: any) {
    console.error("Migration failed", err);
    const errorName = err?.name || "Error";
    const errorMessage = err?.message || "Unknown error";
    debugStore.error(
      `Migration to OPFS failed! [${errorName}] ${errorMessage}`,
    );

    if (!silent) {
      updateStatus(
        "error",
        `Failed to migrate your old vault: ${errorMessage}`,
      );
    }
  }
}
