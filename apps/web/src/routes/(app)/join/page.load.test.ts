import { afterEach, describe, expect, it, vi } from "vitest";
import { load } from "./+page";

afterEach(() => vi.unstubAllEnvs());

describe("join route load", () => {
  it("is the not-found page with the flag off", () => {
    vi.stubEnv("VITE_SHARED_VAULT", "");
    expect(() => load()).toThrow(expect.objectContaining({ status: 404 }));
  });

  it("loads with the flag on", () => {
    vi.stubEnv("VITE_SHARED_VAULT", "true");
    expect(() => load()).not.toThrow();
  });
});
