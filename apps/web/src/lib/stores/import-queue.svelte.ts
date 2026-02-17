import { calculateFileHash } from "@codex/importer";
import type { ImportQueueItem } from "@codex/importer";

class ImportQueueStore {
  queue = $state<ImportQueueItem[]>([]);
  activeItemId = $state<string | null>(null);

  // Track chunk-level progress for the active UI
  activeItemChunks = $state<
    Record<number, "pending" | "active" | "completed" | "skipped">
  >({});

  get activeItem() {
    return this.queue.find((item) => item.id === this.activeItemId) || null;
  }

  get isProcessing() {
    return this.activeItemId !== null;
  }

  async addToQueue(file: File) {
    const id = crypto.randomUUID();
    const hash = await calculateFileHash(file);

    const newItem: ImportQueueItem = {
      id,
      hash,
      status: "pending",
      progress: 0,
    };

    this.queue.push(newItem);

    if (!this.isProcessing) {
      await this.processNext();
    }

    return id;
  }

  async processNext() {
    const nextItem = this.queue.find((item) => item.status === "pending");
    if (!nextItem) {
      this.activeItemId = null;
      return;
    }

    this.activeItemId = nextItem.id;
    nextItem.status = "processing";

    // Process the file (this logic will be integrated into vault store / io)
    // For now, we manage the queue state
  }

  updateChunkStatus(
    index: number,
    status: "pending" | "active" | "completed" | "skipped",
  ) {
    this.activeItemChunks[index] = status;
  }

  async markComplete(id: string) {
    const item = this.queue.find((i) => i.id === id);
    if (item) {
      item.status = "completed";
      item.progress = 100;
    }
    await this.processNext();
  }
}

export const importQueue = new ImportQueueStore();
