import { debugStore } from "../debug.svelte";

export async function removeLocalEntityFile(
  localHandle: FileSystemDirectoryHandle | undefined,
  path: string[],
): Promise<void> {
  if (!localHandle) return;
  try {
    const permission = await localHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") return;

    const fileName = path[path.length - 1];
    const dirPath = path.slice(0, -1);
    let targetDir: FileSystemDirectoryHandle | undefined = localHandle;
    for (const part of dirPath) {
      targetDir = await targetDir
        ?.getDirectoryHandle(part, { create: false })
        .catch(() => undefined);
      if (!targetDir) return;
    }
    await targetDir?.removeEntry(fileName, { recursive: true });
  } catch (error) {
    debugStore.warn(
      `[EntityMutation] Failed to delete ${path.join("/")} from local filesystem`,
      error,
    );
  }
}
