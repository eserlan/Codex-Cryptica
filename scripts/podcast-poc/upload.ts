import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { verifyResponse } from "./verify";

async function uploadObject(object: {
  key: string;
  path: string;
  bytes: number;
  mime: string;
}): Promise<void> {
  const process = Bun.spawn(
    [
      "bunx",
      "wrangler",
      "r2",
      "object",
      "put",
      `codex-cryptica-statics/podcast-poc/${object.key}`,
      "--file",
      object.path,
      "--content-type",
      object.mime,
      "--remote",
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  if ((await process.exited) !== 0)
    throw new Error(`Upload failed: ${object.key}`);
  const url = `https://assets.codexcryptica.com/podcast-poc/${object.key}`;
  const headers = {
    "User-Agent": "CodexCrypticaPodcastPOC/1.0",
    "Accept-Encoding": "identity",
  };
  verifyResponse(
    await fetch(url, { method: "HEAD", headers }),
    "head",
    object.bytes,
    object.mime,
  );
  verifyResponse(
    await fetch(url, { headers: { ...headers, Range: "bytes=0-1023" } }),
    "range",
    object.bytes,
    object.mime,
  );
  console.log(`Verified ${url}`);
}

function manifestObjects(
  manifest: { audioUrl: string; bytes: number }[],
  output: string,
) {
  return manifest.map(({ audioUrl, bytes }) => {
    const match =
      /^https:\/\/assets\.codexcryptica\.com\/podcast-poc\/audio\/([a-z0-9-]+-[a-f0-9]{12}\.mp3)$/.exec(
        audioUrl,
      );
    if (!match) throw new Error("Invalid manifest audio");
    if (!Number.isSafeInteger(bytes) || bytes <= 0)
      throw new Error("Invalid manifest audio");
    return {
      key: `audio/${match[1]}`,
      path: join(output, "audio", match[1]),
      bytes,
      mime: "audio/mpeg",
    };
  });
}

function validateManifest(manifest: unknown[]): void {
  if (!Array.isArray(manifest)) throw new Error("Invalid manifest");
  if (manifest.length < 2) throw new Error("Invalid manifest");
}

async function main(): Promise<void> {
  const output = join(import.meta.dir, "out");
  const manifest: { audioUrl: string; bytes: number }[] = JSON.parse(
    await readFile(join(output, "manifest.json"), "utf8"),
  );
  validateManifest(manifest);
  const objects = manifestObjects(manifest, output);
  const feedPath = join(output, "feed.xml");
  objects.push({
    key: "feed.xml",
    path: feedPath,
    bytes: (await stat(feedPath)).size,
    mime: "application/rss+xml",
  });
  for (const object of objects) {
    if ((await stat(object.path)).size !== object.bytes)
      throw new Error(`Size mismatch: ${object.key}`);
  }
  for (const object of objects) await uploadObject(object);
}
if (import.meta.main)
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
