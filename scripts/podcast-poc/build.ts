import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildAudio, geminiSynthesizer } from "./audio";
import {
  renderFeed,
  validateFixture,
  type Episode,
  type Fixture,
} from "./feed";

function validateInput(fixtures: Fixture[]): number {
  if (!Array.isArray(fixtures) || fixtures.length < 2)
    throw new Error("At least two fixtures are required");
  fixtures.forEach(validateFixture);
  if (new Set(fixtures.map((item) => item.id)).size !== fixtures.length)
    throw new Error("Duplicate fixture ID");
  return validateLimit(fixtures.length);
}

function validateLimit(count: number): number {
  const limit = Number(process.env.PODCAST_POC_ITEM_COUNT ?? "2");
  if (![Number.isInteger(limit), limit >= 2, limit <= count].every(Boolean))
    throw new Error("Invalid PODCAST_POC_ITEM_COUNT");
  return limit;
}

async function main(): Promise<void> {
  const key = process.env.GEMINI_API_KEY;
  const email = process.env.PODCAST_POC_EMAIL;
  if (!key || !email)
    throw new Error(
      "Set GEMINI_API_KEY and PODCAST_POC_EMAIL (a public ownership email)",
    );
  const baseUrl = "https://assets.codexcryptica.com/podcast-poc";
  const root = import.meta.dir;
  const output = join(root, "out");
  const fixtures: Fixture[] = JSON.parse(
    await readFile(join(root, "fixture.json"), "utf8"),
  );
  const limit = validateInput(fixtures);
  await mkdir(output, { recursive: true });
  const episodes: Episode[] = [];
  for (const item of fixtures.slice(0, limit)) {
    const audio = await buildAudio(item, output, geminiSynthesizer(key));
    episodes.push({
      ...item,
      audioUrl: `${baseUrl}/audio/${audio.filename}`,
      bytes: audio.bytes,
      duration: audio.duration,
    });
  }
  const feed = renderFeed(
    {
      email,
      baseUrl,
      artworkUrl:
        "https://assets.codexcryptica.com/cdn-cgi/image/width=1400,height=1400,fit=cover,format=jpeg/announcements/character-nkiru-okafor.jpg",
    },
    episodes,
  );
  await writeFile(join(output, "feed.xml"), feed);
  await writeFile(
    join(output, "manifest.json"),
    JSON.stringify(
      episodes.map(({ audioUrl, bytes }) => ({ audioUrl, bytes })),
      null,
      2,
    ),
  );
  console.log(`Built ${episodes.length} items in ${output}`);
}
if (import.meta.main)
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
