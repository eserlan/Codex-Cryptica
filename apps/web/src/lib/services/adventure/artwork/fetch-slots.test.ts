import { expect, it } from "vitest";
import { FetchSlots } from "./fetch-slots";
it("limits active work and removes cancelled waiters", async () => {
  const slots = new FetchSlots(2);
  const first = await slots.acquire(new AbortController().signal);
  const second = await slots.acquire(new AbortController().signal);
  const cancelled = new AbortController();
  const waiting = slots.acquire(cancelled.signal);
  cancelled.abort();
  expect(await waiting).toBeNull();
  const next = slots.acquire(new AbortController().signal);
  first?.();
  expect(await next).toBeTypeOf("function");
  second?.();
});
