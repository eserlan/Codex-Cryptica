import { describe, expect, it, vi } from "vitest";
import { PENDING_DELVE_CANVAS_KEY } from "$lib/services/seo/pending-delve-transfer";
import { handoffGeneratorToCanvas } from "./generator-canvas-handoff";

const output = { title: "The Sunken Gate" } as never;

function createDependencies(isDevelopment = false) {
  return {
    storeTransfer: vi.fn(),
    unregisterDevelopmentServiceWorkers: vi.fn().mockResolvedValue(undefined),
    isDevelopment,
    navigate: vi.fn().mockResolvedValue(undefined),
    navigateInDevelopment: vi.fn(),
  };
}

describe("handoffGeneratorToCanvas", () => {
  it("stores the built transfer, clears workers, then navigates in production", async () => {
    const dependencies = createDependencies();
    const transfer = { canvas: "prepared" };
    const buildTransfer = vi.fn().mockReturnValue(transfer);

    await handoffGeneratorToCanvas(output, buildTransfer, dependencies);

    expect(buildTransfer).toHaveBeenCalledWith(output);
    expect(dependencies.storeTransfer).toHaveBeenCalledWith(
      PENDING_DELVE_CANVAS_KEY,
      transfer,
    );
    expect(
      dependencies.unregisterDevelopmentServiceWorkers,
    ).toHaveBeenCalledWith(false);
    expect(dependencies.navigate).toHaveBeenCalledOnce();
    expect(dependencies.navigateInDevelopment).not.toHaveBeenCalled();
  });

  it("uses hard navigation in development after unregistering workers", async () => {
    const dependencies = createDependencies(true);

    await handoffGeneratorToCanvas(
      output,
      vi.fn().mockReturnValue({}),
      dependencies,
    );

    expect(
      dependencies.unregisterDevelopmentServiceWorkers,
    ).toHaveBeenCalledWith(true);
    expect(dependencies.navigateInDevelopment).toHaveBeenCalledOnce();
    expect(dependencies.navigate).not.toHaveBeenCalled();
  });

  it("stops before navigation and rejects when transfer storage fails", async () => {
    const dependencies = createDependencies();
    const failure = new Error("storage unavailable");
    dependencies.storeTransfer.mockImplementation(() => {
      throw failure;
    });

    await expect(
      handoffGeneratorToCanvas(output, vi.fn(), dependencies),
    ).rejects.toBe(failure);

    expect(
      dependencies.unregisterDevelopmentServiceWorkers,
    ).not.toHaveBeenCalled();
    expect(dependencies.navigate).not.toHaveBeenCalled();
  });
});
