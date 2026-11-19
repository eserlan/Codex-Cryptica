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

function variantsConflict(a: CollectionVariant, b: CollectionVariant): boolean {
  return (
    a.sha256 !== b.sha256 ||
    a.bytes !== b.bytes ||
    a.width !== b.width ||
    a.height !== b.height
  );
}

function dedupeVariants(
  variants: readonly CollectionVariant[],
): CollectionVariant[] | null {
  const unique = new Map<string, CollectionVariant>();
  for (const variant of variants) {
    const prior = unique.get(variant.url);
    if (prior && variantsConflict(prior, variant)) return null;
    unique.set(variant.url, variant);
  }
  return [...unique.values()];
}

async function partitionMissing(
  all: readonly CollectionVariant[],
  signal: AbortSignal,
  deps: DownloadDependencies,
): Promise<{
  aborted: boolean;
  completed: number;
  missing: CollectionVariant[];
}> {
  const missing: CollectionVariant[] = [];
  let completed = 0;
  for (const variant of all) {
    if (signal.aborted) return { aborted: true, completed, missing };
    if (await deps.hasValidated(variant)) completed++;
    else missing.push(variant);
  }
  return { aborted: false, completed, missing };
}

async function downloadOne(
  variant: CollectionVariant,
  signal: AbortSignal,
  deps: DownloadDependencies,
): Promise<boolean> {
  try {
    if (!(await deps.load(variant, signal))) return false;
    return await deps.hasValidated(variant);
  } catch {
    return false;
  }
}

async function downloadMissing(
  missing: readonly CollectionVariant[],
  total: number,
  initialCompleted: number,
  signal: AbortSignal,
  deps: DownloadDependencies,
): Promise<{ completed: number; failed: boolean }> {
  let next = 0;
  let completed = initialCompleted;
  let failed = false;
  const work = async () => {
    while (!signal.aborted) {
      const index = next++;
      if (index >= missing.length) return;
      if (await downloadOne(missing[index], signal, deps)) {
        completed++;
        deps.progress?.(completed, total);
      } else {
        failed = true;
      }
    }
  };
  await Promise.all([work(), work()]);
  return { completed, failed };
}

async function finalizeInstall(
  all: readonly CollectionVariant[],
  signal: AbortSignal,
  deps: DownloadDependencies,
  result: (status: DownloadStatus) => CollectionDownloadResult,
): Promise<CollectionDownloadResult> {
  const installed = await deps.install(all, signal);
  if (signal.aborted && !installed) return result("cancelled");
  return result(installed ? "installed" : "incomplete");
}

async function runDownloadPipeline(
  all: readonly CollectionVariant[],
  signal: AbortSignal,
  deps: DownloadDependencies,
  setCompleted: (value: number) => void,
  result: (status: DownloadStatus) => CollectionDownloadResult,
): Promise<CollectionDownloadResult> {
  if (signal.aborted) return result("cancelled");
  const partition = await partitionMissing(all, signal, deps);
  setCompleted(partition.completed);
  if (partition.aborted) return result("cancelled");
  deps.progress?.(partition.completed, all.length);
  return await continueAfterPreflight(
    all,
    partition.missing,
    partition.completed,
    signal,
    deps,
    setCompleted,
    result,
  );
}

async function runDownloadAndInstall(
  all: readonly CollectionVariant[],
  missing: readonly CollectionVariant[],
  initialCompleted: number,
  signal: AbortSignal,
  deps: DownloadDependencies,
  setCompleted: (value: number) => void,
  result: (status: DownloadStatus) => CollectionDownloadResult,
): Promise<CollectionDownloadResult> {
  const run = await downloadMissing(
    missing,
    all.length,
    initialCompleted,
    signal,
    deps,
  );
  setCompleted(run.completed);
  if (signal.aborted) return result("cancelled");
  if (run.failed || run.completed !== all.length) return result("incomplete");
  return await finalizeInstall(all, signal, deps, result);
}

async function continueAfterPreflight(
  all: readonly CollectionVariant[],
  missing: readonly CollectionVariant[],
  initialCompleted: number,
  signal: AbortSignal,
  deps: DownloadDependencies,
  setCompleted: (value: number) => void,
  result: (status: DownloadStatus) => CollectionDownloadResult,
): Promise<CollectionDownloadResult> {
  if (signal.aborted) return result("cancelled");
  if (!(await deps.preflight(missing))) return result("capacity");
  return await runDownloadAndInstall(
    all,
    missing,
    initialCompleted,
    signal,
    deps,
    setCompleted,
    result,
  );
}

/** Explicit download with resumable validated files and no more than two consumers. */
// fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
export async function downloadCollection(
  variants: readonly CollectionVariant[],
  signal: AbortSignal,
  deps: DownloadDependencies,
): Promise<CollectionDownloadResult> {
  const all = dedupeVariants(variants);
  if (!all)
    return { status: "unavailable", completed: 0, total: variants.length };
  let completed = 0;
  const result = (status: DownloadStatus): CollectionDownloadResult => ({
    status,
    completed,
    total: all.length,
  });
  try {
    return await runDownloadPipeline(
      all,
      signal,
      deps,
      (value) => {
        completed = value;
      },
      result,
    );
  } catch {
    return result(signal.aborted ? "cancelled" : "unavailable");
  }
}
