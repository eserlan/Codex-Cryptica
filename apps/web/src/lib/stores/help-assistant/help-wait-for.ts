import { systemClock, type Clock } from "#lib/utils/runtime-deps.js";

/** Waits for a condition, settling promptly when the caller cancels. */
export function waitFor(
  check: () => boolean,
  ms: number,
  signal?: AbortSignal,
  clock: Clock = systemClock,
): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);

  return new Promise((resolve, reject) => {
    const deadline = clock.now() + ms;
    let frame: number | null = null;
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (frame !== null) cancelAnimationFrame(frame);
      signal?.removeEventListener("abort", onAbort);
    };

    const finish = (result: boolean) => {
      if (settled) return;
      cleanup();
      resolve(result);
    };

    const fail = (error: unknown) => {
      if (settled) return;
      cleanup();
      reject(error);
    };

    const onAbort = () => finish(false);
    const tick = () => {
      frame = null;
      if (signal?.aborted) return finish(false);
      try {
        if (check()) return finish(true);
      } catch (error) {
        return fail(error);
      }
      if (clock.now() >= deadline) return finish(false);
      frame = requestAnimationFrame(tick);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    tick();
  });
}
