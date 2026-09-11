import { describe, expect, it } from "bun:test";
import {
  deriveInstagramQualification,
  isInstagramPublishingEnabled,
  lookupInstagramPermalink,
  publishInstagramPost,
} from "./release-comms-instagram.ts";
import type { EvaluatorResult, WriterResult } from "./release-comms-types.ts";
import { formatIssueComment } from "./release-comms-prompts.ts";

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

    it("does not trust an Instagram-only evaluator recommendation", () => {
      const result: EvaluatorResult = {
        postworthy: true,
        reason: "No Bluesky-qualified feature",
        recommended_channels: ["instagram"],
      };
      const drafts: WriterResult = {
        bluesky: [],
        reddit: "",
        github_discussions: [],
      };

      expect(
        deriveInstagramQualification(result, drafts).recommendedChannels,
      ).toEqual([]);
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

    it("rejects a non-JPEG R2 image before contacting Meta", async () => {
      await expect(
        publishInstagramPost({
          asset: {
            ...asset,
            imageUrl: "https://assets.codexcryptica.com/og/example.png",
          },
          caption: "Exact Bluesky caption",
          env,
          fetchFn: async () => response({}),
        }),
      ).rejects.toThrow("JPEG");
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

    it("bypasses media creation and only looks up permalink when publishedMediaId is provided", async () => {
      const calls: Array<{ url: string; init?: RequestInit }> = [];
      const fetchFn: typeof fetch = async (input, init) => {
        calls.push({ url: String(input), init });
        return response({
          permalink: "https://www.instagram.com/p/recovered/",
        });
      };

      const publication = await publishInstagramPost({
        asset,
        caption: "Exact Bluesky caption",
        publishedMediaId: "already-published-id",
        env,
        fetchFn,
      });

      expect(publication).toEqual({
        id: "already-published-id",
        url: "https://www.instagram.com/p/recovered/",
      });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(
        "https://graph.facebook.com/v99.0/already-published-id?fields=permalink&access_token=secret-token",
      );
    });

    it("invokes onMediaPublished immediately after media_publish before permalink lookup", async () => {
      let mediaPublishedCheckpoint: string | null = null;
      let permalinkLookupHappened = false;

      const fetchFn: typeof fetch = async (input) => {
        const urlStr = String(input);
        if (urlStr.endsWith("/media")) {
          return response({ id: "container-1" });
        }
        if (urlStr.includes("fields=status_code")) {
          return response({ status_code: "FINISHED" });
        }
        if (urlStr.endsWith("/media_publish")) {
          return response({ id: "published-meta-id" });
        }
        if (urlStr.includes("fields=permalink")) {
          permalinkLookupHappened = true;
          return response({
            permalink: "https://www.instagram.com/p/checkpointed/",
          });
        }
        return response({});
      };

      const publication = await publishInstagramPost({
        asset,
        caption: "Exact Bluesky caption",
        env,
        fetchFn,
        onMediaPublished: async (mediaId) => {
          mediaPublishedCheckpoint = mediaId;
          // Verify onMediaPublished was called BEFORE permalink lookup completed
          expect(permalinkLookupHappened).toBe(false);
        },
      });

      expect(mediaPublishedCheckpoint).toBe("published-meta-id");
      expect(publication.url).toBe("https://www.instagram.com/p/checkpointed/");
    });
  });

  describe("lookupInstagramPermalink", () => {
    it("looks up permalink from Meta Graph API", async () => {
      const fetchFn: typeof fetch = async () =>
        response({ permalink: "https://www.instagram.com/p/direct-lookup/" });

      const url = await lookupInstagramPermalink("test-media-id", {
        env,
        fetchFn,
      });
      expect(url).toBe("https://www.instagram.com/p/direct-lookup/");
    });

    it("returns dry-run permalink in dryRun mode", async () => {
      const url = await lookupInstagramPermalink("dry-run-media", {
        dryRun: true,
      });
      expect(url).toBe("dry-run://instagram/media/dry-run-media");
    });
  });

  describe("isInstagramPublishingEnabled", () => {
    it("returns true by default or when not explicitly disabled", () => {
      expect(isInstagramPublishingEnabled({})).toBe(true);
      expect(
        isInstagramPublishingEnabled({ INSTAGRAM_AUTO_PUBLISH: "1" }),
      ).toBe(true);
    });

    it("returns false when INSTAGRAM_AUTO_PUBLISH is 0 or false", () => {
      expect(
        isInstagramPublishingEnabled({ INSTAGRAM_AUTO_PUBLISH: "0" }),
      ).toBe(false);
      expect(
        isInstagramPublishingEnabled({ INSTAGRAM_AUTO_PUBLISH: "false" }),
      ).toBe(false);
    });

    it("returns false when RELEASE_COMMS_INSTAGRAM_ENABLED is 0 or false", () => {
      expect(
        isInstagramPublishingEnabled({ RELEASE_COMMS_INSTAGRAM_ENABLED: "0" }),
      ).toBe(false);
      expect(
        isInstagramPublishingEnabled({
          RELEASE_COMMS_INSTAGRAM_ENABLED: "false",
        }),
      ).toBe(false);
    });
  });

  it("shows the persisted exact Instagram caption and JPEG asset handoff", () => {
    const comment = formatIssueComment(
      {
        sha: "1234567890abcdef",
        date: "2026-09-11T12:00:00.000Z",
        promoteRunId: "999",
        postworthy: true,
        reason: "A useful improvement",
        instagramHandoffs: [
          {
            pageUrl: asset.pageUrl,
            caption:
              "Exact final caption\n\nhttps://codexcryptica.com/answers/example",
            imageUrl: asset.imageUrl,
          },
        ],
      },
      { postworthy: true, reason: "A useful improvement" },
      { bluesky: [], reddit: "", github_discussions: [] },
    );

    expect(comment).toContain(
      "Instagram (published automatically when recommended; shown here for reference):",
    );
    expect(comment).toContain(`Image: ${asset.imageUrl}`);
    expect(comment).toContain("Exact final caption");
  });

  it("shows checkpointed Instagram permalinks in the release approval comment", () => {
    const comment = formatIssueComment(
      {
        sha: "1234567890abcdef",
        date: "2026-09-11T12:00:00.000Z",
        promoteRunId: "999",
        postworthy: true,
        reason: "A useful improvement",
        publications: {
          bluesky: [],
          instagram: [
            {
              pageUrl: asset.pageUrl,
              url: "https://www.instagram.com/p/example/",
            },
          ],
          githubDiscussions: [],
        },
      },
      { postworthy: true, reason: "A useful improvement" },
      { bluesky: [], reddit: "", github_discussions: [] },
    );

    expect(comment).toContain(
      "- Instagram: https://www.instagram.com/p/example/ (https://codexcryptica.com/answers/example)",
    );
  });
});
