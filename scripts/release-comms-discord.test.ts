import { describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  deriveDiscordFromBluesky,
  loadDiscordConfig,
  publishToDiscord,
  resolveDiscordWebhookUrl,
  stripHashtags,
} from "./release-comms-discord.ts";

describe("release-comms-discord", () => {
  describe("stripHashtags", () => {
    it("removes standalone trailing hashtags and trims whitespace", () => {
      const input = [
        "New in Codex Cryptica: Faction Rosters",
        "",
        "Generate faction members with their own motives, loyalties and connections — ready to drop into play.",
        "",
        "https://codexcryptica.com/generators/faction",
        "",
        "#ttrpg #worldbuilding",
      ].join("\n");

      const expected = [
        "New in Codex Cryptica: Faction Rosters",
        "",
        "Generate faction members with their own motives, loyalties and connections — ready to drop into play.",
        "",
        "https://codexcryptica.com/generators/faction",
      ].join("\n");

      expect(stripHashtags(input)).toBe(expected);
    });

    it("handles multiple hashtags with varied casing, hyphens, and underscores", () => {
      const input =
        "Awesome new feature!\n\nhttps://codexcryptica.com\n\n#TTRPG #WorldBuilding #RPGDesign #scifi-rpg #tabletop_gaming";
      const expected = "Awesome new feature!\n\nhttps://codexcryptica.com";
      expect(stripHashtags(input)).toBe(expected);
    });

    it("removes inline hashtags mid-sentence while preserving surrounding text", () => {
      const input =
        "Flesh it out with the help of the alien race generator for your #scifi #ttrpg setting!";
      const result = stripHashtags(input);
      expect(result).not.toContain("#scifi");
      expect(result).not.toContain("#ttrpg");
      expect(result).toContain("alien race generator");
      expect(result).toContain("setting!");
    });

    it("preserves Markdown headings starting with #", () => {
      const input = [
        "# Main Heading",
        "## Sub Heading",
        "Content paragraph.",
        "",
        "#TTRPG #gaming",
      ].join("\n");

      const result = stripHashtags(input);
      expect(result).toContain("# Main Heading");
      expect(result).toContain("## Sub Heading");
      expect(result).not.toContain("#TTRPG");
      expect(result).not.toContain("#gaming");
    });

    it("preserves GitHub issue and PR numbers like #2906", () => {
      const input = "Fixed the bug reported in #2906 and PR #123.\n\n#TTRPG";
      const result = stripHashtags(input);
      expect(result).toBe("Fixed the bug reported in #2906 and PR #123.");
    });

    it("preserves URL anchor fragments like https://example.com/page#section", () => {
      const input =
        "Check out https://codexcryptica.com/answers#encounter-balance for tips.\n\n#TTRPG";
      const result = stripHashtags(input);
      expect(result).toBe(
        "Check out https://codexcryptica.com/answers#encounter-balance for tips.",
      );
    });

    it("returns empty string for empty input or hashtag-only input", () => {
      expect(stripHashtags("")).toBe("");
      expect(stripHashtags("#ttrpg #worldbuilding")).toBe("");
    });
  });

  describe("deriveDiscordFromBluesky", () => {
    it("returns empty string when given empty array or undefined", () => {
      expect(deriveDiscordFromBluesky([])).toBe("");
      expect(deriveDiscordFromBluesky(undefined)).toBe("");
    });

    it("derives Discord copy from a single Bluesky draft without hashtags", () => {
      const bluesky = [
        "I needed a fantasy city guide. So I built one.\n\nhttps://codexcryptica.com/city\n\n#TTRPG #Worldbuilding",
      ];
      const result = deriveDiscordFromBluesky(bluesky);
      expect(result).toBe(
        "I needed a fantasy city guide. So I built one.\n\nhttps://codexcryptica.com/city",
      );
    });

    it("combines multiple Bluesky drafts into a clean formatted message", () => {
      const bluesky = [
        "Feature A is out!\n\nhttps://codexcryptica.com/a\n\n#TTRPG",
        "Feature B is out too!\n\nhttps://codexcryptica.com/b\n\n#Worldbuilding",
      ];
      const result = deriveDiscordFromBluesky(bluesky);
      expect(result).toContain(
        "Feature A is out!\n\nhttps://codexcryptica.com/a",
      );
      expect(result).toContain(
        "Feature B is out too!\n\nhttps://codexcryptica.com/b",
      );
      expect(result).not.toContain("#TTRPG");
      expect(result).not.toContain("#Worldbuilding");
    });
  });

  describe("loadDiscordConfig", () => {
    it("returns default config when no config file exists", async () => {
      const tempDir = await mkdtemp(join(tmpdir(), "discord-cfg-"));
      try {
        const config = loadDiscordConfig(tempDir);
        expect(config.enabled).toBe(true);
        expect(config.destinations.length).toBe(1);
        expect(config.destinations[0].id).toBe("main-community");
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    it("loads config from .social/discord-destinations.yaml", async () => {
      const tempDir = await mkdtemp(join(tmpdir(), "discord-cfg-"));
      try {
        const socialDir = join(tempDir, ".social");
        const { mkdir } = await import("node:fs/promises");
        await mkdir(socialDir);
        await writeFile(
          join(socialDir, "discord-destinations.yaml"),
          `discord:
  enabled: true
  destinations:
    - id: dev-announcements
      source: bluesky
      strip_hashtags: true
      auto_publish: true
      webhookEnvVar: DISCORD_WEBHOOK_DEV
`,
        );

        const config = loadDiscordConfig(tempDir);
        expect(config.enabled).toBe(true);
        expect(config.destinations.length).toBe(1);
        expect(config.destinations[0].id).toBe("dev-announcements");
        expect(config.destinations[0].auto_publish).toBe(true);
        expect(config.destinations[0].webhookEnvVar).toBe(
          "DISCORD_WEBHOOK_DEV",
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("resolveDiscordWebhookUrl", () => {
    it("resolves from explicit webhookEnvVar first", () => {
      const env = {
        CUSTOM_VAR: "https://discord.com/api/webhooks/custom",
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/fallback",
      };
      const url = resolveDiscordWebhookUrl(
        { id: "test", webhookEnvVar: "CUSTOM_VAR" },
        env,
      );
      expect(url).toBe("https://discord.com/api/webhooks/custom");
    });

    it("resolves from DISCORD_WEBHOOK_URL_<ID> if specific env var is missing", () => {
      const env = {
        DISCORD_WEBHOOK_URL_MAIN_COMMUNITY:
          "https://discord.com/api/webhooks/main",
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/fallback",
      };
      const url = resolveDiscordWebhookUrl({ id: "main-community" }, env);
      expect(url).toBe("https://discord.com/api/webhooks/main");
    });

    it("falls back to DISCORD_WEBHOOK_URL", () => {
      const env = {
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/fallback",
      };
      const url = resolveDiscordWebhookUrl({ id: "other" }, env);
      expect(url).toBe("https://discord.com/api/webhooks/fallback");
    });

    it("returns null if no webhook env var is present", () => {
      const url = resolveDiscordWebhookUrl({ id: "other" }, {});
      expect(url).toBeNull();
    });
  });

  describe("publishToDiscord", () => {
    it("returns dryRun result when dryRun is true without making network calls", async () => {
      let fetchCalled = false;
      const result = await publishToDiscord({
        message: "Hello Discord",
        destination: { id: "test" },
        dryRun: true,
        fetchFn: async () => {
          fetchCalled = true;
          return new Response("ok");
        },
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(fetchCalled).toBe(false);
    });

    it("returns error when webhook URL is missing", async () => {
      const result = await publishToDiscord({
        message: "Hello Discord",
        destination: { id: "test" },
        env: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No webhook URL found");
    });

    it("posts payload to the webhook URL", async () => {
      let postedBody: string | null = null;
      let targetUrl: string | null = null;

      const mockFetch: typeof fetch = async (input, init) => {
        targetUrl = String(input);
        postedBody = init?.body as string;
        return new Response("ok", { status: 204 });
      };

      const result = await publishToDiscord({
        message: "Hello Discord world!",
        destination: { id: "test", webhookEnvVar: "TEST_WEBHOOK" },
        env: { TEST_WEBHOOK: "https://discord.com/api/webhooks/123/abc" },
        fetchFn: mockFetch,
      });

      expect(result.success).toBe(true);
      expect(targetUrl).toBe("https://discord.com/api/webhooks/123/abc");
      expect(postedBody).toBe(
        JSON.stringify({ content: "Hello Discord world!" }),
      );
    });
  });
});
