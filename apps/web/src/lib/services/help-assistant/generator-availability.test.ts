import { describe, expect, it } from "vitest";
import { generatorsAvailable } from "./generator-availability";

const ready = { isInitialized: true, activeVaultId: "v1", status: "idle" };

describe("generatorsAvailable", () => {
  it("is true in a ready vault outside guest mode", () => {
    expect(generatorsAvailable(ready, { isGuestMode: false })).toBe(true);
  });

  it("is false in a guest vault, where the generator workflow refuses to open", () => {
    expect(generatorsAvailable(ready, { isGuestMode: true })).toBe(false);
  });

  it("is false while the vault is not ready", () => {
    expect(
      generatorsAvailable(
        { ...ready, isInitialized: false },
        { isGuestMode: false },
      ),
    ).toBe(false);
    expect(
      generatorsAvailable(
        { ...ready, activeVaultId: null },
        { isGuestMode: false },
      ),
    ).toBe(false);
    expect(
      generatorsAvailable(
        { ...ready, status: "loading" },
        { isGuestMode: false },
      ),
    ).toBe(false);
  });
});
