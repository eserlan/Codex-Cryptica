import { describe, expect, it, vi } from "vitest";
import { unregisterDevelopmentServiceWorkers } from "./dev-service-worker";

describe("unregisterDevelopmentServiceWorkers", () => {
  it("unregisters stale workers before a development navigation", async () => {
    const unregisterFirst = vi.fn().mockResolvedValue(true);
    const unregisterSecond = vi.fn().mockResolvedValue(true);
    const serviceWorker = {
      getRegistrations: vi
        .fn()
        .mockResolvedValue([
          { unregister: unregisterFirst },
          { unregister: unregisterSecond },
        ]),
    };

    await unregisterDevelopmentServiceWorkers(true, serviceWorker);

    expect(unregisterFirst).toHaveBeenCalledOnce();
    expect(unregisterSecond).toHaveBeenCalledOnce();
  });

  it("leaves production service workers registered", async () => {
    const serviceWorker = {
      getRegistrations: vi.fn(),
    };

    await unregisterDevelopmentServiceWorkers(false, serviceWorker);

    expect(serviceWorker.getRegistrations).not.toHaveBeenCalled();
  });
});
