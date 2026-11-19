/** Reject paths that could escape the destination Vault or name a remote resource. */
export function isSafeRestoredAssetPath(path: unknown): path is string {
  if (
    typeof path !== "string" ||
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    /^[a-z]+:/i.test(path)
  )
    return false;
  if (
    Array.from(path).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return false;
  return path
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
