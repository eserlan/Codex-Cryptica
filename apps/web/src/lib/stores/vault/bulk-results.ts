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

  return {
    requested: requestedIds.length,
    items: normalized,
    succeededIds: normalized
      .filter((item) => item.status === "success")
      .map((item) => item.id),
    failedIds: normalized
      .filter((item) => item.status === "failed")
      .map((item) => item.id),
    skippedIds: normalized
      .filter((item) => item.status === "skipped")
      .map((item) => item.id),
    cancelledIds: normalized
      .filter((item) => item.status === "cancelled")
      .map((item) => item.id),
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
