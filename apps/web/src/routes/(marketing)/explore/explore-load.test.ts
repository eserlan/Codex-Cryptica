import { describe, expect, it, vi } from "vitest";
import { load, prerender, ssr } from "./+page";

describe("/explore load function", () => {
  it("enables prerendering and SSR", () => {
    expect(prerender).toBe(true);
    expect(ssr).toBe(true);
  });

  it("returns empty label and results when no query param is present", async () => {
    const mockFetch = vi.fn();
    const url = new URL("https://codexcryptica.com/explore");

    const result = (await load({
      fetch: mockFetch,
      url,
    } as any)) as any;

    expect(result).toEqual({ label: "", results: [] });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("loads content and queries directory when label param is provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            guestUrl: "https://codexcryptica.com/guest/cyber-city",
            title: "Neon Sprawl",
            description: "A cyberpunk city-state.",
          },
        ],
      }),
    });
    const url = new URL("https://codexcryptica.com/explore?label=cyberpunk");

    const result = (await load({
      fetch: mockFetch,
      url,
    } as any)) as any;

    expect(result.label).toBe("cyberpunk");
    expect(mockFetch).toHaveBeenCalled();
    expect(result.results.some((r: any) => r.title === "Neon Sprawl")).toBe(
      true,
    );
  });

  it("falls back gracefully when the directory API fails", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const url = new URL("https://codexcryptica.com/explore?label=fantasy");

    const result = (await load({
      fetch: mockFetch,
      url,
    } as any)) as any;

    expect(result.label).toBe("fantasy");
    expect(Array.isArray(result.results)).toBe(true);
  });
});
