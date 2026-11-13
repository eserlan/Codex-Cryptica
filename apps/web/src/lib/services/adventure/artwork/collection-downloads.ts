import type { CollectionVariant } from "@codex/adventure-artwork-engine";

interface DownloadDependencies {
  /** Must validate actual stored bytes, not just an index entry. */
  hasValidated(variant: CollectionVariant): Promise<boolean>;
  /** Checks the combined capacity, accounting for files shared by collections. */
  preflight(missing: readonly CollectionVariant[]): Promise<boolean>;
  /** Uses the validated cache loader; a successful return does not prove storage. */
  load(variant: CollectionVariant, signal: AbortSignal): Promise<boolean>;
  /** Atomically rechecks all files and protects their collection membership. */
  install(
    variants: readonly CollectionVariant[],
    signal: AbortSignal,
  ): Promise<boolean>;
  progress?(completed: number, total: number): void;
}
type DownloadStatus =
  "installed" | "cancelled" | "incomplete" | "capacity" | "unavailable";
export interface CollectionDownloadResult {
  status: DownloadStatus;
  completed: number;
  total: number;
}

/** Explicit download with resumable validated files and no more than two consumers. */
// fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
export async function downloadCollection(
  variants: readonly CollectionVariant[],
  signal: AbortSignal,
  deps: DownloadDependencies,
): Promise<CollectionDownloadResult> {
  const unique = new Map<string, CollectionVariant>();
  for (const variant of variants) {
    const prior = unique.get(variant.url);
    if (
      prior &&
      (prior.sha256 !== variant.sha256 ||
        prior.bytes !== variant.bytes ||
        prior.width !== variant.width ||
        prior.height !== variant.height)
    )
      return { status: "unavailable", completed: 0, total: variants.length };
    unique.set(variant.url, variant);
  }
  const all = [...unique.values()];
  let completed = 0;
  const result = (status: DownloadStatus): CollectionDownloadResult => ({
    status,
    completed,
    total: all.length,
  });
  try {
    if (signal.aborted) return result("cancelled");
    const missing: CollectionVariant[] = [];
    for (const variant of all) {
      if (signal.aborted) return result("cancelled");
      if (await deps.hasValidated(variant)) completed++;
      else missing.push(variant);
    }
    deps.progress?.(completed, all.length);
    if (signal.aborted) return result("cancelled");
    if (!(await deps.preflight(missing))) return result("capacity");
    let next = 0;
    let failed = false;
    const work = async () => {
      while (!signal.aborted) {
        const index = next++;
        if (index >= missing.length) return;
        const variant = missing[index];
        try {
          if (
            !(await deps.load(variant, signal)) ||
            !(await deps.hasValidated(variant))
          ) {
            failed = true;
            continue;
          }
          completed++;
          deps.progress?.(completed, all.length);
        } catch {
          failed = true;
        }
      }
    };
    await Promise.all([work(), work()]);
    if (signal.aborted) return result("cancelled");
    if (failed || completed !== all.length) return result("incomplete");
    const installed = await deps.install(all, signal);
    if (signal.aborted && !installed) return result("cancelled");
    return result(installed ? "installed" : "incomplete");
  } catch {
    return result(signal.aborted ? "cancelled" : "unavailable");
  }
}
