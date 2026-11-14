import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadHelpArticles, type HelpArticle } from "#lib/content/loader.js";

vi.mock("#lib/content/loader.js", () => ({ loadHelpArticles: vi.fn() }));

const loadedArticles: HelpArticle[] = [
  {
    id: "first",
    title: "First guide",
    labels: ["start"],
    content: "Start here.",
  },
  { id: "second", title: "Second guide", labels: [], content: "Next steps." },
];

describe("lazy help articles", () => {
  let help: typeof import("./help-articles");
  let articles: HelpArticle[];

  beforeEach(async () => {
    vi.resetModules();
    vi.mocked(loadHelpArticles).mockReset();
    articles = [...loadedArticles];
    vi.mocked(loadHelpArticles).mockReturnValue(articles);
    help = await import("./help-articles");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("imports through either path without loading and shares one cache", async () => {
    const publicHelp = await import("./help-content");
    expect(loadHelpArticles).not.toHaveBeenCalled();
    expect(publicHelp.HELP_ARTICLES).toBe(help.HELP_ARTICLES);
    expect(publicHelp.getHelpArticles).toBe(help.getHelpArticles);
    expect(publicHelp.getHelpArticles()).toBe(articles);
    expect(help.getHelpArticles()).toBe(articles);
    expect(loadHelpArticles).toHaveBeenCalledTimes(1);
  });

  it("supports array indexing, iteration and detached array methods", () => {
    expect(Array.isArray(help.HELP_ARTICLES)).toBe(true);
    expect(help.HELP_ARTICLES.length).toBe(2);
    expect(help.HELP_ARTICLES[0]).toBe(articles[0]);
    expect(help.HELP_ARTICLES[2]).toBeUndefined();
    expect([...help.HELP_ARTICLES]).toEqual(articles);
    const find = help.HELP_ARTICLES.find;
    expect(find((article) => article.id === "second")).toBe(articles[1]);
    expect(find((article) => article.id === "missing")).toBeUndefined();
    expect(help.HELP_ARTICLES.map((article) => article.id)).toEqual([
      "first",
      "second",
    ]);
    expect(loadHelpArticles).toHaveBeenCalledTimes(1);
  });

  it("reflects article membership, own keys and descriptors", () => {
    expect(0 in help.HELP_ARTICLES).toBe(true);
    expect(2 in help.HELP_ARTICLES).toBe(false);
    expect(Reflect.ownKeys(help.HELP_ARTICLES)).toEqual(
      Reflect.ownKeys(articles),
    );
    expect(Object.keys(help.HELP_ARTICLES)).toEqual(["0", "1"]);
    expect(Object.getOwnPropertyDescriptor(help.HELP_ARTICLES, "0")).toEqual(
      Object.getOwnPropertyDescriptor(articles, "0"),
    );
    expect(
      Object.getOwnPropertyDescriptor(help.HELP_ARTICLES, "length"),
    ).toEqual(Object.getOwnPropertyDescriptor(articles, "length"));
    expect(
      Object.getOwnPropertyDescriptor(help.HELP_ARTICLES, "missing"),
    ).toBeUndefined();
  });

  it("keeps array method mutations visible to cached readers", () => {
    expect(help.HELP_ARTICLES.pop()).toBe(loadedArticles[1]);
    expect(help.getHelpArticles()).toBe(articles);
    expect(help.HELP_ARTICLES.length).toBe(1);
    expect(loadHelpArticles).toHaveBeenCalledTimes(1);
  });

  it("caches a successful empty result without reloading", () => {
    vi.mocked(loadHelpArticles).mockReturnValue([]);
    const empty = help.getHelpArticles();
    expect(empty).toEqual([]);
    expect(help.getHelpArticles()).toBe(empty);
    expect(help.HELP_ARTICLES.length).toBe(0);
    expect(loadHelpArticles).toHaveBeenCalledTimes(1);
  });

  it("logs a load failure once and caches the empty fallback", () => {
    const error = new Error("Unavailable content");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(loadHelpArticles).mockImplementation(() => {
      throw error;
    });
    const fallback = help.getHelpArticles();
    expect(fallback).toEqual([]);
    expect(help.getHelpArticles()).toBe(fallback);
    expect([...help.HELP_ARTICLES]).toEqual([]);
    expect(help.HELP_ARTICLES.find(() => true)).toBeUndefined();
    expect(loadHelpArticles).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledExactlyOnceWith(
      "Failed to load help articles:",
      error,
    );
  });
});
