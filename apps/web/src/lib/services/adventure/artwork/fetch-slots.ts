/** Abortable FIFO semaphore. Each acquired slot has an idempotent release. */
export class FetchSlots {
  private active = 0;
  private readonly waiters: Array<() => void> = [];
  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1)
      throw new Error("Invalid slot limit");
  }
  async acquire(signal: AbortSignal): Promise<(() => void) | null> {
    if (signal.aborted) return null;
    if (this.active >= this.limit) {
      const acquired = await new Promise<boolean>((resolve) => {
        const wake = () => {
          signal.removeEventListener("abort", cancel);
          resolve(true);
        };
        const cancel = () => {
          const index = this.waiters.indexOf(wake);
          if (index >= 0) this.waiters.splice(index, 1);
          resolve(false);
        };
        this.waiters.push(wake);
        signal.addEventListener("abort", cancel, { once: true });
      });
      if (!acquired) return null;
    } else {
      this.active++;
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.waiters.shift();
      if (next) next();
      else this.active--;
    };
  }
}
