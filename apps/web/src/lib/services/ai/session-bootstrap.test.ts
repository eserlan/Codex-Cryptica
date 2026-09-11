import { describe, expect, it } from "vitest";
import { requiresCapabilitySession } from "./session-bootstrap";

describe("requiresCapabilitySession", () => {
  it("does not request a capability token from a local development proxy", () => {
    expect(requiresCapabilitySession("http://localhost:8787")).toBe(false);
    expect(requiresCapabilitySession("http://127.0.0.1:8787")).toBe(false);
  });

  it("keeps capability sessions enabled for a hosted proxy", () => {
    expect(
      requiresCapabilitySession("https://oracle-proxy.example.workers.dev"),
    ).toBe(true);
  });
});
