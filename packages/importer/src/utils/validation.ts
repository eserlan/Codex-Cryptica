const SUPPORTED_MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);
const SUPPORTED_IMPORT_EXTENSIONS = new Set([
  ".docx",
  ".json",
  ".md",
  ".markdown",
  ".pdf",
  ".txt",
]);
const SUPPORTED_TEXT_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);

export function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}

export function isSupportedImportExtension(filename: string): boolean {
  return SUPPORTED_IMPORT_EXTENSIONS.has(getFileExtension(filename));
}

export function isSupportedMarkdownImportExtension(filename: string): boolean {
  return SUPPORTED_MARKDOWN_EXTENSIONS.has(getFileExtension(filename));
}

export function isSupportedTextImportExtension(filename: string): boolean {
  return SUPPORTED_TEXT_EXTENSIONS.has(getFileExtension(filename));
}

export function validateImportFile(
  file: File,
): { success: true } | { success: false; reason: string } {
  if (file.size === 0) {
    return { success: false, reason: "Empty file" };
  }

  if (!isSupportedImportExtension(file.name)) {
    return { success: false, reason: "Unsupported file type" };
  }

  return { success: true };
}

export function validateMarkdownImportFile(
  file: File,
): { success: true } | { success: false; reason: string } {
  if (file.size === 0) {
    return { success: false, reason: "Empty file" };
  }

  if (!isSupportedMarkdownImportExtension(file.name)) {
    return { success: false, reason: "Unsupported file type" };
  }

  return { success: true };
}
