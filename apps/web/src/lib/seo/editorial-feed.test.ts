import { describe, it, expect } from "vitest";
import {
  renderAnswersFeed,
  renderBlogFeed,
  renderCombinedFeed,
} from "./editorial-feed";
import { getAllAnswers } from "$lib/content/answers/registry";
import { loadLocalBlogArticles } from "$lib/content/blog-content";

const count = (xml: string) => (xml.match(/<entry>/g) ?? []).length;

describe("editorial feeds", () => {
  it("answers feed lists every answer and no blog posts", () => {
    const xml = renderAnswersFeed();
    expect(count(xml)).toBe(getAllAnswers().length);
    expect(xml).toContain(
      "<id>https://codexcryptica.com/answers/feed.xml</id>",
    );
    expect(xml).not.toContain("/blog/");
  });

  it("blog feed lists every post and no answers", () => {
    const xml = renderBlogFeed();
    expect(count(xml)).toBe(loadLocalBlogArticles().length);
    expect(xml).not.toContain("codexcryptica.com/answers/");
  });

  it("combined feed is the union of both", () => {
    const xml = renderCombinedFeed();
    expect(count(xml)).toBe(
      getAllAnswers().length + loadLocalBlogArticles().length,
    );
    expect(xml).toContain('<category term="answer"/>');
    expect(xml).toContain('<category term="blog"/>');
  });

  it("only emits absolute https canonical urls and unique ids", () => {
    const ids = [
      ...renderCombinedFeed().matchAll(/<entry>\s*<id>([^<]+)<\/id>/g),
    ].map((m) => m[1]);
    expect(ids.every((id) => id.startsWith("https://"))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
