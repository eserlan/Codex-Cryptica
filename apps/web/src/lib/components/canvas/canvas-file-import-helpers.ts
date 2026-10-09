import type { FileImportFailureReason } from "@codex/vault-engine";

export function formatFileFailure(file: File, reason: FileImportFailureReason) {
  const descriptions: Record<FileImportFailureReason, string> = {
    empty: "is empty",
    too_large: "is larger than 10 MB",
    vault_unavailable: "could not be saved because the vault is unavailable",
    write_failed: "could not be saved to the vault",
  };
  return `${file.name || "A file"} ${descriptions[reason] || "could not be added"}.`;
}

export function imageFileFromBlob(blob: Blob, mimeType: string) {
  const extension = mimeType.split("/")[1]?.split("+")[0] || "png";
  return new File([blob], `pasted-image-${Date.now()}.${extension}`, {
    type: mimeType,
  });
}

export function extractImageFilesFromClipboardData(
  clipboardData: DataTransfer | null,
) {
  if (!clipboardData) return [];
  const fromFiles = Array.from(clipboardData.files).filter((file) =>
    file.type.startsWith("image/"),
  );
  if (fromFiles.length > 0) return fromFiles;
  // Some browsers only populate `items` (with getAsFile()) for pasted
  // images, leaving `files` empty.
  return Array.from(clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

export async function extractImageFilesFromClipboardItems(
  items: ClipboardItem[],
) {
  const files: File[] = [];
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (!imageType) continue;
    const blob = await item.getType(imageType);
    files.push(imageFileFromBlob(blob, imageType));
  }
  return files;
}

export function centerScreenPosition() {
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}
