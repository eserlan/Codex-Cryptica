import type { PendingImportResult } from "#lib/services/seo/import-handler.js";

export type PublicImportHandoff = "pending" | { rootId: string } | null;

/** Keep first-run guidance blocked while a failed public import remains retryable. */
export function handoffAfterPublicImport(
  result: PendingImportResult,
): PublicImportHandoff {
  if (result.status === "failed") return "pending";
  if (result.status === "imported") return { rootId: result.rootId };
  return null;
}
