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
  // ⚡ Bolt Optimization: Single-pass normalization and status partitioning
  const normalized: BulkMutationItemResult[] = [];
  const succeededIds: string[] = [];
  const failedIds: string[] = [];
  const skippedIds: string[] = [];
  const cancelledIds: string[] = [];

  for (let i = 0; i < requestedIds.length; i++) {
    const id = requestedIds[i];
    const item = byId.get(id) ?? {
      id,
      status: "skipped" as const,
    };
    normalized.push(item);

    switch (item.status) {
      case "success":
        succeededIds.push(item.id);
        break;
      case "failed":
        failedIds.push(item.id);
        break;
      case "skipped":
        skippedIds.push(item.id);
        break;
      case "cancelled":
        cancelledIds.push(item.id);
        break;
    }
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
