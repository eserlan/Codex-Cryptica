/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Config IS_STAGING", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("location", { hostname: "localhost", pathname: "/" });
  });

  it("should be true if hostname contains staging", async () => {
    vi.stubGlobal("location", {
      hostname: "staging.codex-cryptica.com",
      pathname: "/",
    });
    const { IS_STAGING } = await import("./index");
    expect(IS_STAGING).toBe(true);
  });

  it("should be true if pathname contains staging", async () => {
    vi.stubGlobal("location", {
      hostname: "codex-cryptica.com",
      pathname: "/staging/",
    });
    const { IS_STAGING } = await import("./index");
    expect(IS_STAGING).toBe(true);
  });

  it("should be false if neither hostname nor pathname contains staging", async () => {
    vi.stubGlobal("location", {
      hostname: "codex-cryptica.com",
      pathname: "/app/",
    });
    const { IS_STAGING } = await import("./index");
    // Note: This might still be true if VITE_APP_ENV is set in the test environment,
    // but in a clean jsdom it should be false.
    expect(IS_STAGING).toBe(
      import.meta.env.VITE_APP_ENV === "staging" ||
        import.meta.env.MODE === "staging",
    );
  });
});

describe("shared schema.org metadata", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("location", { hostname: "localhost", pathname: "/" });
  });

  it("describes Codex Cryptica as a local-first RPG campaign manager", async () => {
    const { SCHEMA_ORG } = await import("./index");
    const software = SCHEMA_ORG["@graph"].find(
      (entry) => entry["@id"] === "https://codexcryptica.com/#software",
    );

    expect(software).toMatchObject({
      "@type": "SoftwareApplication",
      name: "Codex Cryptica",
      applicationCategory: "GameApplication",
      applicationSubCategory: "RPG campaign manager",
      isAccessibleForFree: true,
    });

    expect(software?.description).toContain("local-first RPG campaign manager");
    expect(software?.description).toContain("Markdown vaults");
    expect(software?.description).toContain("offline prep");
    expect(software?.featureList).toEqual(
      expect.arrayContaining([
        "Local-first Markdown vaults",
        "Offline RPG campaign management",
        "Private browser-local OPFS storage",
        "Spatial canvas and flowcharts",
        "Optional AI Lore Oracle",
      ]),
    );
    expect(software?.keywords).toContain("private worldbuilding tool");
  });

  it("links official public community and project profiles", async () => {
    const { DISCORD_URL, PATREON_URL, SCHEMA_ORG } = await import("./index");
    const organization = SCHEMA_ORG["@graph"].find(
      (entry) => entry["@id"] === "https://codexcryptica.com/#organization",
    );

    expect(organization?.sameAs).toEqual(
      expect.arrayContaining([
        "https://github.com/eserlan/Codex-Cryptica",
        DISCORD_URL,
        PATREON_URL,
      ]),
    );
  });
});
