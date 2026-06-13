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
      applicationCategory: ["GameApplication", "UtilitiesApplication"],
      applicationSubCategory: ["RPG campaign manager", "worldbuilding tool"],
      operatingSystem: "Web browser",
      isAccessibleForFree: true,
      image: "https://codexcryptica.com/og-image.png",
      screenshot: "https://codexcryptica.com/screenshots/living-lore-graph.png",
      privacyPolicy: "https://codexcryptica.com/privacy",
      termsOfService: "https://codexcryptica.com/terms",
    });

    expect(software?.description).toContain("local-first RPG campaign manager");
    expect(software?.description).toContain("Markdown vaults");
    expect(software?.description).toContain("offline prep");
    expect(software?.featureList).toEqual(
      expect.arrayContaining([
        "Local-first Markdown vaults",
        "World Anvil JSON migration import",
        "Offline RPG campaign management",
        "Private browser-local OPFS storage",
        "Spatial canvas and flowcharts",
        "Optional AI Lore Oracle; vault works fully without AI",
      ]),
    );
    expect(software?.keywords).toContain("private worldbuilding tool");
    expect(software?.keywords).toContain("World Anvil alternative");
    expect(software?.keywords).toContain("Obsidian RPG alternative");
    expect(software?.keywords).toContain("Kanka alternative");
    expect(software?.offers).toMatchObject({
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
    });
    expect(software?.publisher).toMatchObject({
      "@id": "https://codexcryptica.com/#organization",
    });
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

  it("connects the website entity back to the software entity", async () => {
    const { SCHEMA_ORG } = await import("./index");
    const website = SCHEMA_ORG["@graph"].find(
      (entry) => entry["@id"] === "https://codexcryptica.com/#website",
    );

    expect(website?.about).toMatchObject({
      "@id": "https://codexcryptica.com/#software",
    });
  });
});
