import { describe, expect, it } from "bun:test";
import {
  deriveInstagramQualification,
  publishInstagramPost,
} from "./release-comms-instagram.ts";
import type { EvaluatorResult, WriterResult } from "./release-comms-types.ts";

const asset = {
  pageUrl: "https://codexcryptica.com/answers/example",
  imageUrl: "https://assets.codexcryptica.com/og/example.jpg",
  imageAlt: "Example social card",
};
const env = {
  INSTAGRAM_ACCOUNT_ID: "instagram-account",
  INSTAGRAM_ACCESS_TOKEN: "secret-token",
  INSTAGRAM_GRAPH_API_URL: "https://graph.facebook.com/v99.0",
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("release-comms-instagram", () => {
  describe("deriveInstagramQualification", () => {
    it("qualifies any release with a Bluesky draft and preserves existing channels", () => {
      const result: EvaluatorResult = {
        postworthy: true,
        reason: "Useful small improvement",
        recommended_channels: ["discord"],
      };
      const drafts: WriterResult = {
        bluesky: [{ pageUrl: asset.pageUrl, text: "Exact Bluesky copy" }],
        reddit: "",
        github_discussions: [],
      };

      expect(
        deriveInstagramQualification(result, drafts).recommendedChannels,
      ).toEqual(["discord", "instagram"]);
    });

    it("qualifies Bluesky-worthy features even when writer output is missing", () => {
      const result: EvaluatorResult = {
        postworthy: true,
        reason: "Useful small improvement",
        features: [
          {
            name: "Example",
            why_users_care: "Helps GMs",
            bluesky_worthy: true,
          },
        ],
        recommended_channels: [],
      };
      const drafts: WriterResult = {
        bluesky: [],
        reddit: "",
        github_discussions: [],
      };

      expect(
        deriveInstagramQualification(result, drafts).recommendedChannels,
      ).toEqual(["instagram"]);
    });

    it("does not add Instagram when nothing qualifies for Bluesky", () => {
      const result: EvaluatorResult = {
        postworthy: false,
        reason: "Only maintenance",
        recommended_channels: ["reddit"],
      };
      const drafts: WriterResult = {
        bluesky: [],
        reddit: "",
        github_discussions: [],
      };

      expect(
        deriveInstagramQualification(result, drafts).recommendedChannels,
      ).toEqual(["reddit"]);
    });
  });

  describe("publishInstagramPost", () => {
    it("uses the exact Bluesky caption and R2 image through the Meta publish flow", async () => {
      const calls: Array<{ url: string; init?: RequestInit }> = [];
      const fetchFn: typeof fetch = async (input, init) => {
        calls.push({ url: String(input), init });
        if (calls.length === 1) return response({ id: "container-1" });
        if (calls.length === 2) return response({ status_code: "FINISHED" });
        if (calls.length === 3) return response({ id: "media-1" });
        return response({ permalink: "https://www.instagram.com/p/example/" });
      };
      const caption =
        "A Bluesky caption\n\n#ttrpg https://codexcryptica.com/answers/example";

      await expect(
        publishInstagramPost({ asset, caption, env, fetchFn }),
      ).resolves.toEqual({
        id: "media-1",
        url: "https://www.instagram.com/p/example/",
      });

      expect(calls).toHaveLength(4);
      const createBody = new URLSearchParams(String(calls[0].init?.body));
      expect(createBody.get("caption")).toBe(caption);
      expect(createBody.get("image_url")).toBe(asset.imageUrl);
      expect(calls[0].url).toBe(
        "https://graph.facebook.com/v99.0/instagram-account/media",
      );
      expect(calls[2].url).toBe(
        "https://graph.facebook.com/v99.0/instagram-account/media_publish",
      );
    });

    it("does not call Meta during a dry run", async () => {
      let called = false;
      const publication = await publishInstagramPost({
        asset,
        caption: "Exact Bluesky caption",
        dryRun: true,
        fetchFn: async () => {
          called = true;
          return response({});
        },
      });

      expect(called).toBe(false);
      expect(publication.url).toBe(
        `dry-run://instagram/${encodeURIComponent(asset.pageUrl)}`,
      );
    });

    it("fails without credentials before making a network request", async () => {
      await expect(
        publishInstagramPost({
          asset,
          caption: "Exact Bluesky caption",
          env: {},
          fetchFn: async () => response({}),
        }),
      ).rejects.toThrow("INSTAGRAM_ACCOUNT_ID");
    });

    it("rejects an image outside the verified R2 asset host", async () => {
      await expect(
        publishInstagramPost({
          asset: { ...asset, imageUrl: "https://example.com/image.jpg" },
          caption: "Exact Bluesky caption",
          env,
          fetchFn: async () => response({}),
        }),
      ).rejects.toThrow("assets.codexcryptica.com");
    });

    it("fails safely when Meta reports media processing failure", async () => {
      let call = 0;
      await expect(
        publishInstagramPost({
          asset,
          caption: "Exact Bluesky caption",
          env,
          fetchFn: async () => {
            call += 1;
            return call === 1
              ? response({ id: "container-1" })
              : response({ status_code: "ERROR" });
          },
        }),
      ).rejects.toThrow("processing ended with ERROR");
    });
  });
});
