/**
 * The single value a user copies to recover a vault.
 *
 * Restoring needs two things: which backup, and proof of ownership. Showing
 * the user only the ownership code left them unable to restore at all, and
 * showing two separate fields makes them carry two strings and paste them into
 * the right boxes. So both travel together as one key.
 *
 * The backup id is not a secret — it identifies, it does not authorise — so
 * carrying it alongside the code costs nothing. What matters is that the
 * server still looks a backup up by id: finding one from a code alone would
 * mean scanning, which is the bulk enumeration FR-014 and FR-016 exist to
 * prevent.
 */

const SEPARATOR = ":";

export function formatRecoveryKey(backupId: string, ownerCode: string): string {
  return `${backupId}${SEPARATOR}${ownerCode}`;
}

/**
 * Reads a key back, tolerating how people actually paste.
 *
 * A key that has been through an email, a chat message or a text file arrives
 * wrapped in whitespace or broken across a line, and someone who kept the two
 * values separately may type them with a space between. All of that resolves
 * to the same pair rather than to an error the user cannot act on.
 */
export function parseRecoveryKey(
  input: string,
): { backupId: string; ownerCode: string } | null {
  const cleaned = (input ?? "").trim();
  if (!cleaned) return null;

  const parts = cleaned
    .split(/[\s:]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;

  const [backupId, ownerCode] = parts;
  // Both halves are generated, fixed-shape values; anything else is a
  // mistyped key rather than a credential worth sending to the server.
  if (!/^[0-9a-fA-F-]{8,}$/.test(backupId)) return null;
  if (!/^[0-9a-fA-F]{16,}$/.test(ownerCode)) return null;
  return { backupId, ownerCode: ownerCode.toLowerCase() };
}
