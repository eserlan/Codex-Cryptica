import { describe, it, expect } from "vitest";
import { classifySearchReferral } from "./search-referral";

const landing = (search = "") =>
  new URL(`https://codexcryptica.com/answers/example${search}`);

describe("classifySearchReferral", () => {
  it.each([
    ["https://www.google.com/", "google"],
    ["https://google.co.uk/search?q=x", "google"],
    ["https://www.bing.com/search?q=x", "bing"],
    ["https://duckduckgo.com/", "duckduckgo"],
    ["https://search.yahoo.com/search?p=x", "yahoo"],
    ["https://uk.search.yahoo.com/search?p=x", "yahoo"],
    ["https://www.ecosia.org/search?q=x", "ecosia"],
    ["https://search.brave.com/search?q=x", "brave"],
  ])("recognises %s as %s", (referrer, engine) => {
    expect(classifySearchReferral(landing(), referrer)).toEqual({
      channel: "organic_search",
      search_engine: engine,
    });
  });

  it.each([
    ["no referrer", undefined],
    ["an empty referrer", ""],
    ["a non-search site", "https://example.org/"],
    ["Google Docs", "https://docs.google.com/document/d/1"],
    ["Gmail", "https://mail.google.com/"],
    ["Gemini", "https://gemini.google.com/app"],
    ["a spoofed suffix", "https://google.com.evil.example/"],
    ["a spoofed prefix", "https://notgoogle.com/"],
    [
      "an Android app referrer",
      "android-app://com.google.android.googlequicksearchbox",
    ],
    ["an unparseable referrer", "not a url"],
    ["the site itself", "https://codexcryptica.com/generators"],
  ])("does not classify %s", (_label, referrer) => {
    expect(classifySearchReferral(landing(), referrer)).toBeNull();
  });

  it("leaves a UTM-tagged landing to its campaign attribution", () => {
    expect(
      classifySearchReferral(
        landing("?utm_source=newsletter"),
        "https://www.google.com/",
      ),
    ).toBeNull();
  });
});
