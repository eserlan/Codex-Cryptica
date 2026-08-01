export interface PublishBatchItem<T> {
  id: string;
  value: T;
}

export type PublishBatchResult<TResult> =
  | { id: string; status: "success"; value: TResult }
  | { id: string; status: "failed"; error: Error };

export interface PublishBatchOptions<TResult> {
  signal?: AbortSignal;
  onResult?: (result: PublishBatchResult<TResult>) => void;
}

/**
 * Publishes independent items in order. A failed item never prevents later
 * items from being attempted, while cancellation prevents queued items from
 * starting. The generic queue keeps the lifecycle reusable by future template
 * package types.
 */
export async function publishBatch<TItem, TResult>(
  items: readonly PublishBatchItem<TItem>[],
  publish: (item: TItem, signal?: AbortSignal) => Promise<TResult>,
  options: PublishBatchOptions<TResult> = {},
): Promise<PublishBatchResult<TResult>[]> {
  const results: PublishBatchResult<TResult>[] = [];

  for (const item of items) {
    if (options.signal?.aborted) break;

    try {
      const value = await publish(item.value, options.signal);
      const result: PublishBatchResult<TResult> = {
        id: item.id,
        status: "success",
        value,
      };
      results.push(result);
      options.onResult?.(result);
    } catch (cause) {
      const result: PublishBatchResult<TResult> = {
        id: item.id,
        status: "failed",
        error:
          cause instanceof Error ? cause : new Error("Could not publish item."),
      };
      results.push(result);
      options.onResult?.(result);
      if (options.signal?.aborted) break;
    }
  }

  return results;
}
