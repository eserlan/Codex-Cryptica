import { describe, expect, it } from "vitest";
import {
  isReleaseCommsDryRun,
  prepareBlueskyText,
  publishBlueskyPost,
  publishDiscussion,
} from "./release-comms-publish.ts";

describe("prepareBlueskyText", () => {
  it("uses explicitly enabled dry-run URLs without invoking either external publisher", () => {
    const previous = process.env.RELEASE_COMMS_DRY_RUN;
    process.env.RELEASE_COMMS_DRY_RUN = "1";
    try {
      expect(isReleaseCommsDryRun()).toBe(true);
      expect(
        publishBlueskyPost(
          "Short post",
          {
            pageUrl: "https://codexcryptica.com/answers/x",
            imageUrl: "https://assets.codexcryptica.com/x.jpg",
            imageAlt: "X",
          },
          (() => {
            throw new Error("publisher must not be called");
          }) as never,
        ).url,
      ).toStartWith("dry-run://bluesky/");
      expect(
        publishDiscussion(
          "Title",
          "Body",
          {
            pageUrl: "https://codexcryptica.com/answers/x",
            imageUrl: "https://assets.codexcryptica.com/x.jpg",
            imageAlt: "X",
          },
          (() => {
            throw new Error("publisher must not be called");
          }) as never,
        ).url,
      ).toStartWith("dry-run://github-discussion/");
    } finally {
      if (previous === undefined) delete process.env.RELEASE_COMMS_DRY_RUN;
      else process.env.RELEASE_COMMS_DRY_RUN = previous;
    }
  });

  it("replaces the writer placeholder with the verified public page URL", () => {
    expect(
      prepareBlueskyText(
        "Read it at codexcryptica.com/[relevant page]",
        "https://codexcryptica.com/answers/living-city",
      ),
    ).toBe("Read it at https://codexcryptica.com/answers/living-city");
  });

  it("adds the matched link when a draft points to a different page", () => {
    expect(
      prepareBlueskyText(
        "https://codexcryptica.com/answers/living-city",
        "https://codexcryptica.com/answers/other",
      ),
    ).toBe(
      "https://codexcryptica.com/answers/living-city\n\nhttps://codexcryptica.com/answers/other",
    );
  });

  it("adds the matched public-page URL when the writer omits it", () => {
    expect(
      prepareBlueskyText(
        "A short complete post.",
        "https://codexcryptica.com/answers/living-city",
      ),
    ).toBe(
      "A short complete post.\n\nhttps://codexcryptica.com/answers/living-city",
    );
  });

  it("rejects an overlong draft rather than publishing cut-off prose", () => {
    expect(() =>
      prepareBlueskyText(
        `${"A city guide. ".repeat(40)}\n\nhttps://codexcryptica.com/answers/living-city\n\n#TTRPG`,
        "https://codexcryptica.com/answers/living-city",
      ),
    ).toThrow("exceeds 300 characters");
  });

  it("publishes a complete Bluesky post with the matched R2 asset and records its URL", () => {
    const calls: string[][] = [];
    const publication = publishBlueskyPost(
      "A useful answer https://codexcryptica.com/answers/living-city",
      {
        pageUrl: "https://codexcryptica.com/answers/living-city",
        imageUrl: "https://assets.codexcryptica.com/og/living-city.jpg",
        imageAlt: "A living city map",
      },
      ((_bin: string, args: string[]) => {
        calls.push(args);
        return "Published: https://bsky.app/profile/codexcryptica.bsky.social/post/abc";
      }) as never,
    );
    expect(calls[0]).toEqual([
      "scripts/post-to-bluesky.mjs",
      "--image",
      "https://assets.codexcryptica.com/og/living-city.jpg",
      "--alt",
      "A living city map",
      "A useful answer https://codexcryptica.com/answers/living-city",
    ]);
    expect(publication.url).toContain("/post/abc");
  });

  it("refuses publisher output without a durable Bluesky URL", () => {
    expect(() =>
      publishBlueskyPost(
        "Short post",
        {
          pageUrl: "https://codexcryptica.com/answers/x",
          imageUrl: "https://assets.codexcryptica.com/x.jpg",
          imageAlt: "X",
        },
        (() => "success") as never,
      ),
    ).toThrow("returned no post URL");
  });

  it("publishes a Discussion with its direct page link and social image", () => {
    let args: string[] = [];
    const result = publishDiscussion(
      "Living cities",
      "Read codexcryptica.com/[relevant page]",
      {
        pageUrl: "https://codexcryptica.com/answers/living-city",
        imageUrl: "https://assets.codexcryptica.com/og/living-city.jpg",
        imageAlt: "A living city map",
      },
      ((_bin: string, received: string[]) => {
        args = received;
        return "Created https://github.com/eserlan/Codex-Cryptica/discussions/123";
      }) as never,
    );
    expect(args.at(-1)).toContain(
      "https://codexcryptica.com/answers/living-city",
    );
    expect(args.at(-1)).toContain(
      "![A living city map](https://assets.codexcryptica.com/og/living-city.jpg)",
    );
    expect(result.url).toContain("/discussions/123");
  });

  it("adds the public-page URL to a Discussion when the writer omits it", () => {
    let body = "";
    publishDiscussion(
      "Living cities",
      "A long-form post without a link.",
      {
        pageUrl: "https://codexcryptica.com/answers/living-city",
        imageUrl: "https://assets.codexcryptica.com/og/living-city.jpg",
        imageAlt: "A living city map",
      },
      ((_bin: string, args: string[]) => {
        body = args.at(-1) ?? "";
        return "Created https://github.com/eserlan/Codex-Cryptica/discussions/123";
      }) as never,
    );
    expect(body).toContain("https://codexcryptica.com/answers/living-city");
  });

  it("refuses to publish a Discussion draft with an unresolved page placeholder", () => {
    expect(() =>
      publishDiscussion(
        "Living cities",
        "Read it at [relevant page] for more.",
        {
          pageUrl: "https://codexcryptica.com/answers/living-city",
          imageUrl: "https://assets.codexcryptica.com/og/living-city.jpg",
          imageAlt: "A living city map",
        },
        (() => {
          throw new Error("publisher must not be called");
        }) as never,
      ),
    ).toThrow("unresolved page placeholder");
  });
});
