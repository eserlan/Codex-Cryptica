import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GeminiTTSService } from "../../packages/oracle-engine/src/tts/gemini-tts-service";
import type { Fixture } from "./feed";

export type Synthesizer = (text: string) => Promise<Blob | null>;
export const geminiSynthesizer =
  (key: string): Synthesizer =>
  (text) =>
    new GeminiTTSService().synthesize(
      text,
      {
        gender: "female",
        ageRange: "young-adult",
        accent: "Standard",
        tone: "Clear and expressive",
      },
      key,
    );

async function run(args: string[]): Promise<string> {
  const process = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exit !== 0) throw new Error(`${args[0]} failed: ${stderr}`);
  return stdout;
}

async function readCached(
  cachePath: string,
  audioDir: string,
  inputHash: string,
): Promise<{ filename: string; bytes: number; duration: number } | undefined> {
  try {
    const cache = JSON.parse(await readFile(cachePath, "utf8"));
    if (
      [
        cache.inputHash === inputHash,
        /^[a-z0-9-]+-[a-f0-9]{12}\.mp3$/.test(cache.filename),
      ].every(Boolean)
    ) {
      const bytes = await readFile(join(audioDir, cache.filename));
      if (
        [
          createHash("sha256").update(bytes).digest("hex").slice(0, 12) ===
            cache.filename.slice(-16, -4),
          cache.duration > 0,
        ].every(Boolean)
      )
        return {
          filename: cache.filename,
          bytes: bytes.length,
          duration: cache.duration,
        };
    }
  } catch {
    /* No usable cached audio. */
  }
  return undefined;
}

function requireAudio(blob: Blob | null, id: string): Blob {
  if (!blob?.size) throw new Error(`Audio synthesis failed for ${id}`);
  return blob;
}

export async function buildAudio(
  item: Fixture,
  output: string,
  synthesize: Synthesizer,
): Promise<{ filename: string; bytes: number; duration: number }> {
  const audioDir = join(output, "audio");
  await mkdir(audioDir, { recursive: true });
  const inputHash = createHash("sha256").update(item.narration).digest("hex");
  const cachePath = join(output, `${item.id}.cache.json`);
  const cached = await readCached(cachePath, audioDir, inputHash);
  if (cached) return cached;
  const blob = await synthesize(item.narration);
  const validBlob = requireAudio(blob, item.id);
  const tempDir = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(join(output, ".encode-")),
  );
  try {
    const wav = join(tempDir, "input.wav");
    const mp3 = join(tempDir, "output.mp3");
    await writeFile(wav, Buffer.from(await validBlob.arrayBuffer()));
    await run([
      "ffmpeg",
      "-v",
      "error",
      "-y",
      "-i",
      wav,
      "-ac",
      "1",
      "-ar",
      "24000",
      "-b:a",
      "64k",
      "-id3v2_version",
      "3",
      mp3,
    ]);
    const duration = Number(
      (
        await run([
          "ffprobe",
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          mp3,
        ])
      ).trim(),
    );
    if (![duration > 0, Number.isFinite(duration)].every(Boolean))
      throw new Error("Invalid audio duration");
    const data = await readFile(mp3);
    const filename = `${item.id}-${createHash("sha256").update(data).digest("hex").slice(0, 12)}.mp3`;
    await writeFile(join(audioDir, filename), data);
    await writeFile(
      cachePath,
      JSON.stringify({ inputHash, filename, duration }),
    );
    return { filename, bytes: data.length, duration };
  } finally {
    const { rm } = await import("node:fs/promises");
    await rm(tempDir, { recursive: true, force: true });
  }
}
