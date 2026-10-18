import { afterEach, describe, it, expect, vi } from "vitest";
import {
  renderAnswersFeed,
  renderBlogFeed,
  renderCombinedFeed,
} from "./editorial-feed";
import { getAllAnswers } from "$lib/content/answers/registry";
import {
  loadBlogIndex,
  loadLocalBlogArticles,
} from "$lib/content/blog-content";

const count = (xml: string) => (xml.match(/<entry>/g) ?? []).length;

describe("editorial feeds", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("answers feed lists every answer and no blog posts", () => {
    const xml = renderAnswersFeed();
    expect(count(xml)).toBe(getAllAnswers().length);
    expect(xml).toContain(
      "<id>https://codexcryptica.com/answers/feed.xml</id>",
    );
    expect(xml).not.toContain("/blog/");
  });

  it("blog feed lists every post and no answers", async () => {
    const xml = await renderBlogFeed();
    expect(count(xml)).toBe((await loadBlogIndex()).length);
    expect(xml).not.toContain("codexcryptica.com/answers/");
  });

  it("combined feed is the union of both", async () => {
    const xml = await renderCombinedFeed();
    expect(count(xml)).toBe(
      getAllAnswers().length + loadLocalBlogArticles().length,
    );
    expect(xml).toContain('<category term="answer"/>');
    expect(xml).toContain('<category term="blog"/>');
  });

  it("only emits absolute https canonical urls and unique ids", async () => {
    const ids = [
      ...(await renderCombinedFeed()).matchAll(/<entry>\s*<id>([^<]+)<\/id>/g),
    ].map((m) => m[1]);
    expect(ids.every((id) => id.startsWith("https://"))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses the configured remote blog index used by the blog page", async () => {
    vi.stubEnv("VITE_BLOG_CONTENT_BASE_URL", "https://content.example/blog");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "remote-id",
              slug: "remote-article",
              title: "Remote article",
              description: "A post from the configured content index.",
              publishedAt: "2026-09-01T12:00:00Z",
            },
          ]),
          { status: 200 },
        ),
      ),
    );

    const xml = await renderBlogFeed();
    expect(xml).toContain("<title>Remote article</title>");
    expect(xml).toContain("https://codexcryptica.com/blog/remote-article");
    expect(count(xml)).toBe(1);
  });
});
