import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadBlogArticle,
  loadBlogIndex,
  loadLocalBlogArticles,
} from "./blog-content";

describe("blog content loader", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads local blog articles when no remote base is configured", async () => {
    const articles = loadLocalBlogArticles();
    expect(articles.length).toBeGreaterThan(0);

    const index = await loadBlogIndex();
    expect(index.length).toBeGreaterThan(0);
    expect(index[0]).toHaveProperty("slug");
  });

  it("loads remote blog index and articles when a base URL is configured", async () => {
    vi.stubEnv("VITE_BLOG_CONTENT_BASE_URL", "https://example.com/blog");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/index.json")) {
        return new Response(
          JSON.stringify([
            {
              id: "remote-1",
              slug: "remote-post",
              title: "Remote Post",
              description: "Remote description",
              publishedAt: "2026-04-05T00:00:00.000Z",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.endsWith("/remote-post.md")) {
        return new Response(
          `---
id: remote-1
slug: remote-post
title: Remote Post
description: Remote description
keywords: ["One", "Two"]
publishedAt: 2026-04-05T00:00:00Z
---
# Remote Content`,
          { status: 200, headers: { "content-type": "text/plain" } },
        );
      }

      return new Response("", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(loadBlogIndex()).resolves.toEqual([
      {
        id: "remote-1",
        slug: "remote-post",
        title: "Remote Post",
        description: "Remote description",
        publishedAt: "2026-04-05T00:00:00.000Z",
      },
    ]);

    await expect(loadBlogArticle("remote-post")).resolves.toMatchObject({
      slug: "remote-post",
      title: "Remote Post",
      content: "# Remote Content",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/blog/index.json",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
