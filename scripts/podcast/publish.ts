/**
 * `bun run podcast:publish <slug>` — adds one answer to the public podcast
 * feed that Patreon's podcast sync imports (#4438).
 *
 * dev-agents runs this after an answer deploys and holds a lock around it, so
 * two runs never rewrite the feed at once. Its final stdout line is the JSON
 * result dev-agents records: `{guid, audioUrl, status: "created" | "unchanged"}`.
 * Republishing a slug that is already in the feed changes nothing.
 *
 * Everything written is public, regardless of any Patreon access setting.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAnswer } from "../../apps/web/src/lib/content/answers/registry";
import type { AnswerConfig } from "../../apps/web/src/lib/content/answers/schema";
import {
  audioKey,
  createMp3,
  geminiSynthesizer,
  probeDuration,
  type Mp3,
} from "./audio";
import {
  ASSET_URL,
  buildEpisodeContent,
  episodeGuid,
  squareArtwork,
  SITE_URL,
} from "./episode";
import {
  renderFeed,
  validateEpisode,
  type Channel,
  type Episode,
} from "./feed";
import {
  IMMUTABLE,
  publicUrl,
  R2PodcastStore,
  REVALIDATE,
  type PodcastStore,
} from "./store";

export const FEED_KEY = "podcast/answers/feed.xml";
export const INDEX_KEY = "podcast/answers/episodes.json";

export const channel = (email: string): Channel => ({
  title: "Codex Cryptica Answers",
  link: `${SITE_URL}/answers`,
  description:
    "Short narrated answers to tabletop RPG and worldbuilding questions from Codex Cryptica.",
  email,
  artworkUrl:
    "https://assets.codexcryptica.com/cdn-cgi/image/width=1400,height=1400,fit=cover,format=jpeg/announcements/character-nkiru-okafor.jpg",
});

export interface PublishResult {
  guid: string;
  audioUrl: string;
  status: "created" | "unchanged";
}

export interface PublishDeps {
  getAnswer: (slug: string) => AnswerConfig | undefined;
  store: PodcastStore;
  createMp3: (narration: string) => Promise<Mp3>;
  probeDuration: (url: string) => Promise<number>;
  writeTemp: (name: string, content: string) => Promise<string>;
  email: string;
  now: () => Date;
}

function parseIndex(text: string | undefined): Episode[] {
  if (text === undefined) return [];
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value)) throw new Error("Invalid podcast episode index");
  return value.map(validateEpisode);
}

export async function publishAnswer(
  slug: string,
  deps: PublishDeps,
): Promise<PublishResult> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error(`Invalid answer slug: ${slug}`);
  const answer = deps.getAnswer(slug);
  if (!answer)
    throw new Error(
      `No answer "${slug}" in this checkout; is it up to date with production?`,
    );

  const index = parseIndex(await deps.store.read(INDEX_KEY));
  const guid = episodeGuid(slug);
  const existing = index.find((episode) => episode.guid === guid);
  if (existing)
    return { guid, audioUrl: existing.audioUrl, status: "unchanged" };

  // Only an R2 image that actually exists is shown; a missing og card must
  // not become a broken image in the Patreon post.
  const draft = buildEpisodeContent(answer);
  const imageKey = draft.imageUrl.startsWith(`${ASSET_URL}/`)
    ? draft.imageUrl.slice(ASSET_URL.length + 1)
    : undefined;
  const hasImage =
    imageKey !== undefined && (await deps.store.size(imageKey)) !== undefined;
  const content = hasImage
    ? draft
    : buildEpisodeContent(answer, { includeImage: false });

  // The key is derived from the narration, so a retry after a failed feed
  // write finds the uploaded audio and skips text-to-speech entirely.
  const key = audioKey(slug, content.narration);
  const audioUrl = publicUrl(key);
  let bytes = await deps.store.size(key);
  let duration: number;
  if (bytes === undefined) {
    const mp3 = await deps.createMp3(content.narration);
    try {
      await deps.store.put(key, mp3.path, "audio/mpeg", IMMUTABLE);
      ({ bytes, duration } = mp3);
    } finally {
      await mp3.cleanup();
    }
  } else {
    duration = await deps.probeDuration(audioUrl);
  }
  await deps.store.verify(key, bytes, "audio/mpeg");

  const episode = validateEpisode({
    guid,
    slug,
    title: content.title,
    pageUrl: content.pageUrl,
    description: content.description,
    html: content.html,
    pubDate: deps.now().toISOString(),
    audioUrl,
    bytes,
    duration,
    artworkUrl: hasImage ? squareArtwork(content.imageUrl) : undefined,
  } satisfies Episode);
  const episodes = [episode, ...index];

  // Feed first, index second: if the index write fails, the next run still
  // sees the slug as new and rewrites the same feed item under the same GUID.
  const feed = renderFeed(channel(deps.email), episodes);
  const feedPath = await deps.writeTemp("feed.xml", feed);
  await deps.store.put(FEED_KEY, feedPath, "application/rss+xml", REVALIDATE);
  await deps.store.verify(
    FEED_KEY,
    Buffer.byteLength(feed),
    "application/rss+xml",
  );
  const indexPath = await deps.writeTemp(
    "episodes.json",
    `${JSON.stringify(episodes, null, 2)}\n`,
  );
  await deps.store.put(INDEX_KEY, indexPath, "application/json", REVALIDATE);
  return { guid, audioUrl, status: "created" };
}

async function main(argv: string[]): Promise<void> {
  const [slug, ...rest] = argv;
  if (!slug || rest.length)
    throw new Error("Usage: bun run podcast:publish <answer-slug>");
  const apiKey = process.env.GEMINI_API_KEY;
  const email = process.env.PODCAST_OWNER_EMAIL;
  if (!apiKey || !email)
    throw new Error(
      "Set GEMINI_API_KEY and PODCAST_OWNER_EMAIL (a public ownership email)",
    );
  const temp = await mkdtemp(join(tmpdir(), "podcast-publish-"));
  try {
    const result = await publishAnswer(slug, {
      getAnswer,
      store: new R2PodcastStore(),
      createMp3: (narration) => createMp3(narration, geminiSynthesizer(apiKey)),
      probeDuration: (url) => probeDuration(url),
      writeTemp: async (name, content) => {
        const path = join(temp, name);
        await writeFile(path, content);
        return path;
      },
      email,
      now: () => new Date(),
    });
    console.log(JSON.stringify(result));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

if (import.meta.main)
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
