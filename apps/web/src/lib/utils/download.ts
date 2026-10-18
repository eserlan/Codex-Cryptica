/**
 * Handing the user a file.
 *
 * Plain `URL.createObjectURL` + `<a download>` rather than the File System
 * Access API, for the same reason the vault archive chose it: this path works
 * on every browser, including Firefox, Safari, and Brave with the File System
 * Access API disabled.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadText(
  content: string,
  filename: string,
  mimeType: string,
): void {
  // charset is spelled out: an entry with an em dash or a name with an accent
  // is ordinary here, and a browser guessing the encoding gets those wrong.
  downloadBlob(
    new Blob([content], { type: `${mimeType};charset=utf-8` }),
    filename,
  );
}
