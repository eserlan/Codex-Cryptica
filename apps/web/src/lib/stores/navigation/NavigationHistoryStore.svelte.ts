export class NavigationHistoryStore {
  past = $state<string[]>([]);
  future = $state<string[]>([]);
  maxSize = $state(50);

  constructor() {}

  push(entityId: string) {
    if (this.past.length > 0 && this.past[this.past.length - 1] === entityId) {
      return; // Prevent consecutive duplicates
    }

    this.past.push(entityId);

    if (this.past.length > this.maxSize) {
      this.past.shift();
    }

    // Truncate future stack when a new entity is pushed
    this.future = [];
  }

  back(isValid: (entityId: string) => boolean = () => true): string | null {
    while (this.past.length >= 2) {
      const current = this.past.pop()!;
      this.future.push(current);

      const nextCandidate = this.past[this.past.length - 1];
      if (isValid(nextCandidate)) {
        return nextCandidate;
      }
      // If not valid, the loop continues to pop and check the next one
    }
    return null;
  }

  forward(isValid: (entityId: string) => boolean = () => true): string | null {
    while (this.future.length > 0) {
      const next = this.future.pop()!;
      this.past.push(next);

      if (isValid(next)) {
        return next;
      }
    }
    return null;
  }
}

export const navigationHistoryStore = new NavigationHistoryStore();
