import { describe, expect, it } from "vitest";
import { handoffAfterPublicImport } from "./public-import-handoff.js";

describe("public import onboarding handoff", () => {
  it("keeps the blocker active while a failed import can be retried", () => {
    expect(
      handoffAfterPublicImport({
        status: "failed",
        message: "temporary error",
      }),
    ).toBe("pending");
  });

  it("tracks the imported root and clears the blocker when no draft remains", () => {
    expect(
      handoffAfterPublicImport({
        status: "imported",
        rootId: "root-1",
        count: 1,
        vaultName: "Test Vault",
        rootTitle: "The Millrace Ultimatum",
      }),
    ).toEqual({ rootId: "root-1" });
    expect(handoffAfterPublicImport({ status: "invalid" })).toBeNull();
  });
});
