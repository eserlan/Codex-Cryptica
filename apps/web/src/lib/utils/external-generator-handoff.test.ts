import { describe, it, expect, vi } from "vitest";
import {
  buildExternalGeneratorUrl,
  openExternalGeneratorUrl,
  sendToExternalGenerator,
  MAX_EXTERNAL_GENERATOR_URL_LENGTH,
} from "./external-generator-handoff";

describe("buildExternalGeneratorUrl", () => {
  it("builds a URL with the content safely encoded under the given param", () => {
    const result = buildExternalGeneratorUrl({
      baseUrl: "https://monsterlabs.app/dnd-monster-generator",
      paramName: "prompt",
      content: "A rusted iron golem guarding a flooded crypt",
    });

    expect(result).toEqual({
      ok: true,
      url: "https://monsterlabs.app/dnd-monster-generator?prompt=A+rusted+iron+golem+guarding+a+flooded+crypt",
    });
  });

  it("appends optional extra params such as attribution", () => {
    const result = buildExternalGeneratorUrl({
      baseUrl: "https://monsterlabs.app/dnd-magic-item-generator",
      paramName: "prompt",
      content: "A cursed lantern",
      extraParams: { utm_source: "codexcryptica" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.searchParams.get("prompt")).toBe("A cursed lantern");
      expect(url.searchParams.get("utm_source")).toBe("codexcryptica");
    }
  });

  it("round-trips special characters, markdown, and unicode through the query string", () => {
    const content =
      "# Grand Vizier\n\n*Cunning & ruthless* — wields a +2 blade\nHP: 120 | Line 2\n世界";
    const result = buildExternalGeneratorUrl({
      baseUrl: "https://monsterlabs.app/dnd-monster-generator",
      paramName: "prompt",
      content,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.searchParams.get("prompt")).toBe(content);
    }
  });

  it("preserves leading/trailing whitespace in content instead of trimming it", () => {
    const result = buildExternalGeneratorUrl({
      baseUrl: "https://monsterlabs.app/dnd-monster-generator",
      paramName: "prompt",
      content: "  a lone wolf stalking the treeline  ",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.searchParams.get("prompt")).toBe(
        "  a lone wolf stalking the treeline  ",
      );
    }
  });

  it("reports empty content instead of building an empty-prompt URL", () => {
    const result = buildExternalGeneratorUrl({
      baseUrl: "https://monsterlabs.app/dnd-monster-generator",
      paramName: "prompt",
      content: "   ",
    });

    expect(result).toEqual({ ok: false, reason: "empty-content" });
  });

  it("reports an invalid base URL instead of throwing", () => {
    const result = buildExternalGeneratorUrl({
      baseUrl: "not a valid url",
      paramName: "prompt",
      content: "A cursed lantern",
    });

    expect(result).toEqual({ ok: false, reason: "invalid-base-url" });
  });

  it("rejects non-http(s) protocols instead of building a javascript: URL", () => {
    const result = buildExternalGeneratorUrl({
      baseUrl: "javascript:alert(1)",
      paramName: "prompt",
      content: "A cursed lantern",
    });

    expect(result).toEqual({ ok: false, reason: "unsupported-protocol" });
  });

  it("reports an oversized payload explicitly instead of truncating it", () => {
    const content = "a".repeat(50);
    const result = buildExternalGeneratorUrl({
      baseUrl: "https://monsterlabs.app/dnd-monster-generator",
      paramName: "prompt",
      content,
      maxLength: 40,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("url-too-long");
      if (result.reason === "url-too-long") {
        expect(result.limit).toBe(40);
        expect(result.length).toBeGreaterThan(40);
      }
    }
  });

  it("defaults the length guard to MAX_EXTERNAL_GENERATOR_URL_LENGTH", () => {
    const content = "a".repeat(MAX_EXTERNAL_GENERATOR_URL_LENGTH + 1);
    const result = buildExternalGeneratorUrl({
      baseUrl: "https://monsterlabs.app/dnd-monster-generator",
      paramName: "prompt",
      content,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("url-too-long");
    }
  });
});

describe("openExternalGeneratorUrl", () => {
  it("opens the URL in a new tab without an opener reference", () => {
    const open = vi.fn();
    openExternalGeneratorUrl("https://monsterlabs.app/dnd-monster-generator", {
      open,
    });

    expect(open).toHaveBeenCalledWith(
      "https://monsterlabs.app/dnd-monster-generator",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("no-ops instead of throwing when called in a non-browser context", () => {
    vi.stubGlobal("window", undefined);
    try {
      expect(() =>
        openExternalGeneratorUrl(
          "https://monsterlabs.app/dnd-monster-generator",
        ),
      ).not.toThrow();
      expect(
        openExternalGeneratorUrl(
          "https://monsterlabs.app/dnd-monster-generator",
        ),
      ).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("sendToExternalGenerator", () => {
  it("builds and opens the URL when the payload fits", () => {
    const open = vi.fn();
    const result = sendToExternalGenerator({
      baseUrl: "https://monsterlabs.app/dnd-monster-generator",
      paramName: "prompt",
      content: "A cursed lantern",
      windowRef: { open },
    });

    expect(result.ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("does not open a tab when the payload is empty", () => {
    const open = vi.fn();
    const result = sendToExternalGenerator({
      baseUrl: "https://monsterlabs.app/dnd-monster-generator",
      paramName: "prompt",
      content: "",
      windowRef: { open },
    });

    expect(result).toEqual({ ok: false, reason: "empty-content" });
    expect(open).not.toHaveBeenCalled();
  });

  it("does not open a tab when the payload is too large", () => {
    const open = vi.fn();
    const result = sendToExternalGenerator({
      baseUrl: "https://monsterlabs.app/dnd-monster-generator",
      paramName: "prompt",
      content: "a".repeat(50),
      maxLength: 40,
      windowRef: { open },
    });

    expect(result.ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it("is reusable across different partner endpoints (monster vs magic item)", () => {
    const monster = buildExternalGeneratorUrl({
      baseUrl: "https://monsterlabs.app/dnd-monster-generator",
      paramName: "prompt",
      content: "A rusted iron golem",
    });
    const magicItem = buildExternalGeneratorUrl({
      baseUrl: "https://monsterlabs.app/dnd-magic-item-generator",
      paramName: "prompt",
      content: "A cursed lantern",
    });

    expect(monster.ok).toBe(true);
    expect(magicItem.ok).toBe(true);
    if (monster.ok && magicItem.ok) {
      expect(
        monster.url.startsWith(
          "https://monsterlabs.app/dnd-monster-generator?",
        ),
      ).toBe(true);
      expect(
        magicItem.url.startsWith(
          "https://monsterlabs.app/dnd-magic-item-generator?",
        ),
      ).toBe(true);
    }
  });
});
