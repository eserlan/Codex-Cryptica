import { describe, expect, it } from "vitest";
import { createInertRuntime } from "./cloud-backup-runtime";

describe("inert cloud backup runtime", () => {
  it("uses isolated memory storage and the supplied base URL", async () => {
    const first = createInertRuntime("https://example.test");
    const second = createInertRuntime();
    await first.storage.write("vault", { enabled: false });
    expect(await first.storage.read("vault")).toEqual({ enabled: false });
    expect(await second.storage.read("vault")).toBeNull();
    expect(first.baseUrl).toBe("https://example.test");
    expect(second.baseUrl).toBe("");
  });

  it("rejects every network request", async () => {
    await expect(
      createInertRuntime().fetch("https://example.test"),
    ).rejects.toThrow("Cloud backup is not configured.");
  });
});
