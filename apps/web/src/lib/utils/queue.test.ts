import { describe, it, expect } from "vitest";
import { SequentialTaskQueue, KeyedTaskQueue } from "./queue";

describe("SequentialTaskQueue", () => {
  it("executes tasks in sequential order and returns results", async () => {
    const queue = new SequentialTaskQueue();
    const order: number[] = [];

    const task1 = queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push(1);
      return "result1";
    });

    const task2 = queue.enqueue(async () => {
      order.push(2);
      return "result2";
    });

    const [res1, res2] = await Promise.all([task1, task2]);

    expect(order).toEqual([1, 2]);
    expect(res1).toBe("result1");
    expect(res2).toBe("result2");
  });

  it("tracks pendingCount accurately during task lifecycle", async () => {
    const queue = new SequentialTaskQueue();
    expect(queue.pendingCount).toBe(0);

    let finishTask1!: () => void;
    const task1Promise = new Promise<void>((resolve) => {
      finishTask1 = resolve;
    });

    const p1 = queue.enqueue(async () => task1Promise);
    const p2 = queue.enqueue(async () => "task2");

    expect(queue.pendingCount).toBe(2);

    finishTask1();
    await p1;
    await p2;

    expect(queue.pendingCount).toBe(0);
  });

  it("continues processing subsequent tasks when a previous task rejects", async () => {
    const queue = new SequentialTaskQueue();
    const order: string[] = [];

    const failingTask = queue.enqueue(async () => {
      order.push("failed");
      throw new Error("task failure");
    });

    const succeedingTask = queue.enqueue(async () => {
      order.push("succeeded");
      return "recovered";
    });

    await expect(failingTask).rejects.toThrow("task failure");
    const result = await succeedingTask;

    expect(result).toBe("recovered");
    expect(order).toEqual(["failed", "succeeded"]);
    expect(queue.pendingCount).toBe(0);
  });
});

describe("KeyedTaskQueue", () => {
  it("runs tasks for the same key sequentially but different keys concurrently", async () => {
    const keyedQueue = new KeyedTaskQueue();
    const trace: string[] = [];

    const k1Task1 = keyedQueue.enqueue("keyA", async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      trace.push("A1");
    });

    const k1Task2 = keyedQueue.enqueue("keyA", async () => {
      trace.push("A2");
    });

    const k2Task1 = keyedQueue.enqueue("keyB", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      trace.push("B1");
    });

    await Promise.all([k1Task1, k1Task2, k2Task1]);

    expect(trace).toEqual(["B1", "A1", "A2"]);
  });

  it("calculates totalPendingCount across all queues", async () => {
    const keyedQueue = new KeyedTaskQueue();
    expect(keyedQueue.totalPendingCount).toBe(0);

    let finish!: () => void;
    const blocker = new Promise<void>((resolve) => {
      finish = resolve;
    });

    const pA = keyedQueue.enqueue("keyA", () => blocker);
    const pB = keyedQueue.enqueue("keyB", () => blocker);

    expect(keyedQueue.totalPendingCount).toBe(2);

    finish();
    await Promise.all([pA, pB]);

    expect(keyedQueue.totalPendingCount).toBe(0);
  });

  it("waitForAll waits for all pending tasks in all queues", async () => {
    const keyedQueue = new KeyedTaskQueue();
    let taskAFinished = false;
    let taskBFinished = false;

    keyedQueue.enqueue("keyA", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      taskAFinished = true;
    });

    keyedQueue.enqueue("keyB", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      taskBFinished = true;
    });

    await keyedQueue.waitForAll();

    expect(taskAFinished).toBe(true);
    expect(taskBFinished).toBe(true);
  });
});
