import { describe, expect, test } from "bun:test";
import {
  AnswerConfigSchema,
  type AnswerConfig,
} from "../../apps/web/src/lib/content/answers/schema";
import { audioKey, createMp3, type Mp3 } from "./audio";
import { buildEpisodeContent, squareArtwork } from "./episode";
import {
  FEED_ITEM_LIMIT,
  renderFeed,
  validateEpisode,
  type Episode,
} from "./feed";
import {
  channel,
  FEED_KEY,
  INDEX_KEY,
  publishAnswer,
  type PublishDeps,
} from "./publish";
import { R2PodcastStore, verifyResponse, type PodcastStore } from "./store";

const answer: AnswerConfig = AnswerConfigSchema.parse({
  slug: "shared-domains",
  category: "worldbuilding",
  publishedAt: "2026-10-03",
  question: "Can gods share a domain?",
  kind: "framework",
  shortAnswer:
    "Yes. Read [the basics](/answers/basics) & decide what <overlap> means.",
  sections: [
    { kind: "prose", heading: "A domain is a claim", paragraphs: ["Text."] },
    { kind: "prose", paragraphs: ["No heading."] },
    {
      kind: "checklist",
      heading: "Before the session",
      items: ["One", "Two"],
    },
  ],
  seo: {
    title: "Can gods share a domain?",
    description: "Several gods can share one domain.",
    image: "https://assets.codexcryptica.com/og/shared-domains.jpg",
    imageAlt: "Two temples facing each other across a river.",
  },
});

const episode = (overrides: Partial<Episode> = {}): Episode => ({
  guid: "codex-cryptica:answer:one",
  slug: "one",
  title: "A & B",
  pageUrl: "https://codexcryptica.com/answers/one",
  description: "Plain & simple",
  html: "<p>Tea &amp; dice</p>",
  pubDate: "2026-10-27T12:00:00.000Z",
  audioUrl: "https://assets.codexcryptica.com/podcast/answers/audio/one.mp3",
  bytes: 123,
  duration: 4.2,
  ...overrides,
});

describe("episode content", () => {
  test("narrates only the reviewed question and short answer, without link syntax", () => {
    const content = buildEpisodeContent(answer);
    expect(content.guid).toBe("codex-cryptica:answer:shared-domains");
    expect(content.narration).toBe(
      "Can gods share a domain? Yes. Read the basics & decide what <overlap> means. Read the full answer at Codex Cryptica.",
    );
    expect(content.pageUrl).toBe(
      "https://codexcryptica.com/answers/shared-domains",
    );
  });

  test("escapes text, makes inline links absolute and lists section headings", () => {
    const { html } = buildEpisodeContent(answer);
    expect(html).toContain(
      '<a href="https://codexcryptica.com/answers/basics">the basics</a> &amp; decide what &lt;overlap&gt; means.',
    );
    expect(html).toContain(
      "<ul><li>A domain is a claim</li><li>Before the session</li></ul>",
    );
    expect(html).toContain(
      'alt="Two temples facing each other across a river."',
    );
    expect(
      buildEpisodeContent(answer, { includeImage: false }).html,
    ).not.toContain("<img");
  });

  test("squares only R2 artwork", () => {
    expect(squareArtwork("https://assets.codexcryptica.com/og/a.jpg")).toBe(
      "https://assets.codexcryptica.com/cdn-cgi/image/width=1400,height=1400,fit=cover,format=jpeg/og/a.jpg",
    );
    expect(squareArtwork("https://example.com/a.jpg")).toBeUndefined();
  });
});

describe("feed", () => {
  const meta = channel("public@example.com");

  test("renders escaped metadata, stable GUIDs and enclosure details", () => {
    const xml = renderFeed(meta, [episode()]);
    expect(xml).toContain(
      '<guid isPermaLink="false">codex-cryptica:answer:one</guid>',
    );
    expect(xml).toContain("<title>A &amp; B</title>");
    expect(xml).toContain('length="123" type="audio/mpeg"');
    expect(xml).toContain("<itunes:duration>5</itunes:duration>");
    expect(xml).toContain("<![CDATA[<p>Tea &amp; dice</p>]]>");
  });

  test("orders newest first, caps the item count and splits CDATA terminators", () => {
    const many = Array.from({ length: FEED_ITEM_LIMIT + 1 }, (_, i) =>
      episode({
        guid: `g-${i}`,
        pubDate: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
        html: i === FEED_ITEM_LIMIT ? "]]>" : "<p>x</p>",
      }),
    );
    const xml = renderFeed(meta, many);
    expect(xml.match(/<item>/g)).toHaveLength(FEED_ITEM_LIMIT);
    expect(xml.indexOf(`g-${FEED_ITEM_LIMIT}`)).toBeLessThan(
      xml.indexOf("g-1<"),
    );
    expect(xml).not.toContain(">g-0<");
    expect(xml).toContain("]]]]><![CDATA[>");
  });

  test("rejects duplicate GUIDs, insecure URLs and a missing owner email", () => {
    expect(() => renderFeed(meta, [episode(), episode()])).toThrow("Duplicate");
    expect(() =>
      renderFeed(meta, [episode({ audioUrl: "http://example.com/a.mp3" })]),
    ).toThrow("HTTPS");
    expect(() => renderFeed(channel("not-an-email"), [episode()])).toThrow(
      "email",
    );
  });

  test.each([
    ["a missing GUID", { guid: "" }, "Invalid"],
    ["an unsafe slug", { slug: "../x" }, "Invalid"],
    ["a blank title", { title: "  " }, "Invalid"],
    ["an unparseable date", { pubDate: "soon" }, "Invalid"],
    ["NaN bytes", { bytes: Number.NaN }, "Invalid"],
    ["zero bytes", { bytes: 0 }, "Invalid"],
    ["fractional bytes", { bytes: 1.5 }, "Invalid"],
    ["a zero duration", { duration: 0 }, "Invalid"],
    ["insecure artwork", { artworkUrl: "http://example.com/a.jpg" }, "HTTPS"],
  ] as const)("rejects an index episode with %s", (_, overrides, message) => {
    expect(() => validateEpisode(episode(overrides))).toThrow(message);
  });

  test("rejects index entries that are not episodes", () => {
    for (const value of [null, [], {}, "episode"])
      expect(() => validateEpisode(value)).toThrow("Invalid");
    expect(validateEpisode(episode())).toEqual(episode());
  });
});

describe("audio", () => {
  test("keys audio by narration and signature", () => {
    expect(audioKey("a", "One.")).toBe(audioKey("a", "One."));
    expect(audioKey("a", "One.")).not.toBe(audioKey("a", "Two."));
    expect(audioKey("a", "One.")).toMatch(
      /^podcast\/answers\/audio\/a-[a-f0-9]{12}\.mp3$/,
    );
  });

  test("fails rather than publishing silence when synthesis fails", async () => {
    const commands: string[][] = [];
    await expect(
      createMp3(
        "Text",
        async () => null,
        async (args) => {
          commands.push(args);
          return "";
        },
      ),
    ).rejects.toThrow("synthesis failed");
    expect(commands).toEqual([]);
  });
});

describe("R2 store", () => {
  const response = (status: number, body = "") =>
    new Response(status === 204 ? null : body, { status });

  test("treats only a 404 as missing and refuses to guess on other errors", async () => {
    const store = (status: number) =>
      new R2PodcastStore(async () => response(status, "[]"));
    expect(await store(404).read(INDEX_KEY)).toBeUndefined();
    expect(await store(200).read(INDEX_KEY)).toBe("[]");
    await expect(store(403).read(INDEX_KEY)).rejects.toThrow("HTTP 403");
  });

  test("bypasses the edge cache on reads", async () => {
    const urls: string[] = [];
    await new R2PodcastStore(async (input) => {
      urls.push(String(input));
      return response(404);
    }).read(INDEX_KEY);
    expect(urls[0]).toMatch(
      /^https:\/\/assets\.codexcryptica\.com\/podcast\/answers\/episodes\.json\?fresh=\d+$/,
    );
  });

  test("refuses an object size it cannot trust", async () => {
    const head = (headers: Record<string, string>) =>
      new R2PodcastStore(
        async () => new Response(null, { status: 200, headers }),
      );
    expect(await head({ "content-length": "2048" }).size(FEED_KEY)).toBe(2048);
    for (const length of [undefined, "0", "abc"])
      await expect(
        head(length === undefined ? {} : { "content-length": length }).size(
          FEED_KEY,
        ),
      ).rejects.toThrow("content length");
  });

  test("never writes outside the podcast prefix", async () => {
    const store = new R2PodcastStore(fetch, async () => "");
    await expect(
      store.put("og/a.jpg", "/tmp/a", "image/jpeg", "no-cache"),
    ).rejects.toThrow("outside");
  });

  test("rejects unavailable or incorrect byte-range responses", () => {
    expect(() =>
      verifyResponse(
        new Response(null, { status: 403 }),
        "head",
        1,
        "audio/mpeg",
      ),
    ).toThrow("HTTP 403");
    const range = new Response(null, {
      status: 206,
      headers: {
        "content-type": "audio/mpeg",
        "content-range": "bytes 0-9/99",
      },
    });
    expect(() => verifyResponse(range, "range", 2048, "audio/mpeg")).toThrow(
      "content range",
    );
  });
});

class MemoryStore implements PodcastStore {
  objects = new Map<string, string>();
  writes: string[] = [];
  failOn?: string;

  async size(key: string) {
    const value = this.objects.get(key);
    return value === undefined ? undefined : value.length;
  }
  async read(key: string) {
    return this.objects.get(key);
  }
  async put(key: string, path: string) {
    if (key === this.failOn) throw new Error(`upload failed: ${key}`);
    this.writes.push(key);
    this.objects.set(key, await Bun.file(path).text());
  }
  async verify() {}
}

function deps(store: MemoryStore, overrides: Partial<PublishDeps> = {}) {
  const narrations: string[] = [];
  const cleaned: string[] = [];
  const temp = `/tmp/podcast-test-${crypto.randomUUID()}`;
  const value: PublishDeps = {
    getAnswer: (slug) => (slug === answer.slug ? answer : undefined),
    store,
    createMp3: async (narration): Promise<Mp3> => {
      narrations.push(narration);
      const path = `${temp}-audio.mp3`;
      await Bun.write(path, "mp3-bytes");
      return {
        path,
        bytes: 9,
        duration: 12.5,
        cleanup: async () => void cleaned.push(path),
      };
    },
    probeDuration: async () => 12.5,
    writeTemp: async (name, content) => {
      const path = `${temp}-${name}`;
      await Bun.write(path, content);
      return path;
    },
    email: "public@example.com",
    now: () => new Date("2026-10-28T09:00:00Z"),
    ...overrides,
  };
  return { value, narrations, cleaned };
}

describe("publishAnswer", () => {
  test("uploads audio, then the feed, then the index, and reports created", async () => {
    const store = new MemoryStore();
    store.objects.set("og/shared-domains.jpg", "jpg");
    const { value, narrations, cleaned } = deps(store);

    const result = await publishAnswer("shared-domains", value);

    expect(result.status).toBe("created");
    expect(result.guid).toBe("codex-cryptica:answer:shared-domains");
    expect(result.audioUrl).toMatch(
      /^https:\/\/assets\.codexcryptica\.com\/podcast\/answers\/audio\/shared-domains-[a-f0-9]{12}\.mp3$/,
    );
    expect(store.writes).toEqual([
      result.audioUrl.replace("https://assets.codexcryptica.com/", ""),
      FEED_KEY,
      INDEX_KEY,
    ]);
    expect(narrations).toHaveLength(1);
    expect(cleaned).toHaveLength(1);
    const feed = store.objects.get(FEED_KEY) ?? "";
    expect(feed).toContain("codex-cryptica:answer:shared-domains");
    expect(feed).toContain("<pubDate>Wed, 28 Oct 2026 09:00:00 GMT</pubDate>");
    expect(feed).toContain("cdn-cgi/image/width=1400");
    const index = JSON.parse(store.objects.get(INDEX_KEY) ?? "[]");
    expect(index).toHaveLength(1);
  });

  test("is a no-op for a slug that is already in the feed", async () => {
    const store = new MemoryStore();
    const first = deps(store);
    await publishAnswer("shared-domains", first.value);
    store.writes = [];
    const second = deps(store);

    const result = await publishAnswer("shared-domains", second.value);

    expect(result.status).toBe("unchanged");
    expect(store.writes).toEqual([]);
    expect(second.narrations).toEqual([]);
  });

  test("reuses uploaded audio on retry after a failed feed write", async () => {
    const store = new MemoryStore();
    store.failOn = FEED_KEY;
    const first = deps(store);
    await expect(publishAnswer("shared-domains", first.value)).rejects.toThrow(
      "upload failed",
    );
    expect(store.objects.has(INDEX_KEY)).toBe(false);
    store.failOn = undefined;
    const retry = deps(store);

    const result = await publishAnswer("shared-domains", retry.value);

    expect(result.status).toBe("created");
    expect(retry.narrations).toEqual([]);
  });

  test("keeps earlier episodes and omits a missing image", async () => {
    const store = new MemoryStore();
    store.objects.set(INDEX_KEY, JSON.stringify([episode()]));
    const { value } = deps(store);

    await publishAnswer("shared-domains", value);

    const feed = store.objects.get(FEED_KEY) ?? "";
    expect(feed).toContain("codex-cryptica:answer:one");
    expect(feed).not.toContain("<img");
    expect(feed).not.toContain(
      "cdn-cgi/image/width=1400,height=1400,fit=cover,format=jpeg/og/",
    );
  });

  test("fails without writing for unknown slugs, bad slugs, TTS failure or a corrupt index", async () => {
    const store = new MemoryStore();
    await expect(publishAnswer("missing", deps(store).value)).rejects.toThrow(
      "No answer",
    );
    await expect(publishAnswer("../x", deps(store).value)).rejects.toThrow(
      "Invalid answer slug",
    );
    const failing = deps(store, {
      createMp3: async () => {
        throw new Error("Audio synthesis failed");
      },
    });
    await expect(
      publishAnswer("shared-domains", failing.value),
    ).rejects.toThrow("synthesis");
    store.objects.set(INDEX_KEY, '{"not": "a list"}');
    await expect(
      publishAnswer("shared-domains", deps(store).value),
    ).rejects.toThrow("Invalid podcast episode index");
    expect(store.writes).toEqual([]);
  });
});
