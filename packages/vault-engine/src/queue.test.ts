import { describe, it, expect } from "vitest";
// Triggering new CI run to verify coverage
import { SequentialTaskQueue, KeyedTaskQueue } from "./queue";

describe("SequentialTaskQueue", () => {
  it("should execute tasks sequentially", async () => {
    const queue = new SequentialTaskQueue();
    const results: number[] = [];

    const task1 = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      results.push(1);
      return 1;
    };

    const task2 = async () => {
      results.push(2);
      return 2;
    };

    const p1 = queue.enqueue(task1);
    const p2 = queue.enqueue(task2);

    expect(queue.pendingCount).toBe(2);

    await Promise.all([p1, p2]);

    expect(results).toEqual([1, 2]);
    expect(queue.pendingCount).toBe(0);
  });

  it("should handle errors without breaking the queue", async () => {
    const queue = new SequentialTaskQueue();
    const results: string[] = [];

    const task1 = async () => {
      throw new Error("fail");
    };

    const task2 = async () => {
      results.push("success");
    };

    const p1 = queue.enqueue(task1);
    const p2 = queue.enqueue(task2);

    await expect(p1).rejects.toThrow("fail");
    await p2;

    expect(results).toEqual(["success"]);
  });
});

describe("KeyedTaskQueue", () => {
  it("should manage separate queues per key", async () => {
    const queue = new KeyedTaskQueue();
    const results: Record<string, number[]> = { a: [], b: [] };

    const taskA = async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      results.a.push(1);
    };

    const taskB = async () => {
      results.b.push(1);
    };

    const p1 = queue.enqueue("a", taskA);
    const p2 = queue.enqueue("b", taskB);

    await Promise.all([p1, p2]);

    // b should finish first because it's a different queue and didn't wait
    expect(results.b).toEqual([1]);
    expect(results.a).toEqual([1]);
  });

  it("should calculate total pending count", () => {
    const queue = new KeyedTaskQueue();
    queue.enqueue("a", () => new Promise(() => {}));
    queue.enqueue("b", () => new Promise(() => {}));
    queue.enqueue("a", () => new Promise(() => {}));

    expect(queue.totalPendingCount).toBe(3);
  });

  it("should waitForAll tasks to complete", async () => {
    const queue = new KeyedTaskQueue();
    let finished = 0;

    queue.enqueue("a", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      finished++;
    });
    queue.enqueue("b", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      finished++;
    });

    await queue.waitForAll();
    expect(finished).toBe(2);
  });
});
