/**
 * A queue that executes asynchronous tasks sequentially.
 * Useful for ensuring file writes happen in order to prevent race conditions.
 */
export class SequentialTaskQueue {
  private _pendingCount = 0;
  private queue: Promise<void> = Promise.resolve();

  get pendingCount() {
    return this._pendingCount;
  }

  /**
   * Adds a task to the queue.
   * @param task A function that returns a promise.
   * @returns A promise that resolves when the task completes.
   */
  enqueue<T>(task: () => Promise<T>): Promise<T> {
    this._pendingCount++;
    const next = this.queue.then(async () => {
      try {
        return await task();
      } finally {
        this._pendingCount--;
      }
    });
    // We catch errors here to ensure the queue chain isn't broken for subsequent tasks
    this.queue = next.catch(() => {}) as Promise<void>;
    return next;
  }
}

/**
 * A map of queues, useful for managing separate queues per resource (e.g., per file).
 */
export class KeyedTaskQueue {
  private queues = new Map<string, SequentialTaskQueue>();

  get totalPendingCount() {
    let count = 0;
    for (const q of this.queues.values()) {
      count += q.pendingCount;
    }
    return count;
  }

  /**
   * Enqueues a task for a specific key.
   * @param key The resource key (e.g., file ID).
   * @param task The async task to execute.
   */
  enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    if (!this.queues.has(key)) {
      this.queues.set(key, new SequentialTaskQueue());
    }
    return this.queues.get(key)!.enqueue(task);
  }
}
