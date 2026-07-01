import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ImportEngine } from "../../src/cc/engine";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";
import { kankaMinimal } from "./fixtures/kanka-minimal";

describe("no AI/network calls", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network not allowed"));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("prepare + commit makes zero fetch calls", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer });
    const session = await engine.prepare(kankaMinimal);
    await engine.commit(session);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
