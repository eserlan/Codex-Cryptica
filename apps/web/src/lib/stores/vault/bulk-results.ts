export type BulkMutationItemStatus =
  "success" | "failed" | "skipped" | "cancelled";

export interface BulkMutationItemResult {
  id: string;
  status: BulkMutationItemStatus;
  error?: unknown;
}

export interface BulkMutationResult {
  requested: number;
  items: BulkMutationItemResult[];
  succeededIds: string[];
  failedIds: string[];
  skippedIds: string[];
  cancelledIds: string[];
}

export function summarizeBulkMutation(
  requestedIds: string[],
  items: BulkMutationItemResult[],
): BulkMutationResult {
  const byId = new Map(items.map((item) => [item.id, item]));
  const normalized = requestedIds.map(
    (id) =>
      byId.get(id) ?? {
        id,
        status: "skipped" as const,
      },
  );

  // ⚡ Bolt Optimization: Replace chained .filter().map() with a single imperative loop
  const succeededIds: string[] = [];
  const failedIds: string[] = [];
  const skippedIds: string[] = [];
  const cancelledIds: string[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const item = normalized[i];
    if (item.status === "success") succeededIds.push(item.id);
    else if (item.status === "failed") failedIds.push(item.id);
    else if (item.status === "skipped") skippedIds.push(item.id);
    else if (item.status === "cancelled") cancelledIds.push(item.id);
  }

  return {
    requested: requestedIds.length,
    items: normalized,
    succeededIds,
    failedIds,
    skippedIds,
    cancelledIds,
  };
}

export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency = 4,
): Promise<T[]> {
  const results: T[] = Array.from({ length: tasks.length });
  let nextIndex = 0;
  const workerCount = Math.max(
    1,
    Math.min(Math.floor(concurrency), tasks.length),
  );

  const worker = async () => {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
