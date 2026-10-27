import { describe, expect, test } from "bun:test";
import { renderFeed, validateFixture, type Fixture } from "./feed";
import { buildAudio } from "./audio";
import { verifyResponse } from "./verify";

const fixture: Fixture = {
  id: "first",
  title: "A & B",
  date: "2026-10-27T12:00:00Z",
  narration: "A short update.",
  description: "Plain & simple",
  html: "<p>Tea &amp; dice</p>",
};
const meta = {
  email: "public@example.com",
  baseUrl: "https://example.com/podcast-poc",
  artworkUrl: "https://example.com/art.png",
};

describe("podcast feed", () => {
  test("renders stable IDs and escaped metadata with enclosure details", () => {
    const xml = renderFeed(meta, [
      {
        ...fixture,
        audioUrl: "https://example.com/a.mp3",
        bytes: 123,
        duration: 4,
      },
    ]);
    expect(xml).toContain("codex-cryptica-release-poc:first");
    expect(xml).toContain("A &amp; B");
    expect(xml).toContain('length="123" type="audio/mpeg"');
    expect(xml).toContain("<p>Tea &amp; dice</p>");
  });
  test("rejects invalid IDs, dates and duplicate items", () => {
    expect(() => validateFixture({ ...fixture, id: "../bad" })).toThrow();
    expect(() => validateFixture({ ...fixture, date: "invalid" })).toThrow();
    expect(() => renderFeed(meta, [fixture, fixture] as never)).toThrow();
  });
  test("renders episode artwork and rejects insecure artwork URLs", () => {
    const episode = {
      ...fixture,
      artworkUrl: "https://example.com/square.jpg",
      audioUrl: "https://example.com/a.mp3",
      bytes: 1,
      duration: 1,
    };
    expect(renderFeed(meta, [episode])).toContain(
      '<itunes:image href="https://example.com/square.jpg"/>',
    );
    expect(() =>
      renderFeed(meta, [
        { ...episode, artworkUrl: "http://example.com/art.jpg" },
      ]),
    ).toThrow();
  });
  test("safely splits CDATA terminators", () => {
    const xml = renderFeed(meta, [
      {
        ...fixture,
        html: "]]>",
        audioUrl: "https://example.com/a.mp3",
        bytes: 1,
        duration: 1,
      },
    ]);
    expect(xml).toContain("]]]]><![CDATA[>");
  });
});

describe("audio and response failures", () => {
  test("fails rather than dropping an item when synthesis fails", async () => {
    await expect(
      buildAudio(fixture, "/tmp/podcast-poc-test", async () => null),
    ).rejects.toThrow("synthesis");
  });
  test("rejects unavailable or incorrect byte-range responses", () => {
    expect(() =>
      verifyResponse(
        new Response(null, { status: 403 }),
        "head",
        10,
        "audio/mpeg",
      ),
    ).toThrow();
    expect(() =>
      verifyResponse(
        new Response("x", { status: 200 }),
        "range",
        10,
        "audio/mpeg",
      ),
    ).toThrow();
    expect(() =>
      verifyResponse(
        new Response(null, {
          status: 200,
          headers: { "content-length": "10", "content-type": "audio/mpeg" },
        }),
        "head",
        10,
        "audio/mpeg",
      ),
    ).not.toThrow();
  });
});

test("encodes playable audio and reuses it on a repeat build", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { pcmBytesToWav } =
    await import("../../packages/oracle-engine/src/tts/pcm-to-wav");
  const dir = await mkdtemp(join(tmpdir(), "podcast-poc-"));
  try {
    const audio = pcmBytesToWav(new Uint8Array(48000), 24000);
    const first = await buildAudio(fixture, dir, async () => audio);
    const second = await buildAudio(fixture, dir, async () => {
      throw new Error("should reuse audio");
    });
    expect(first).toEqual(second);
    expect(first.bytes).toBeGreaterThan(0);
    expect(first.duration).toBeGreaterThan(0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("fails when the encoder cannot read the generated audio", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "podcast-poc-"));
  try {
    await expect(
      buildAudio(fixture, dir, async () => new Blob(["not wav"])),
    ).rejects.toThrow("ffmpeg failed");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
