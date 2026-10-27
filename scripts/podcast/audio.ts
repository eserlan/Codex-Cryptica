import { createHash } from "node:crypto";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GeminiTTSService } from "../../packages/oracle-engine/src/tts/gemini-tts-service";

export type Synthesizer = (text: string) => Promise<Blob | null>;
export type CommandRunner = (args: string[]) => Promise<string>;

const VOICE = {
  gender: "female",
  ageRange: "young-adult",
  accent: "Standard",
  tone: "Clear and expressive",
} as const;

/**
 * Everything that changes the audio besides the narration. Part of the audio
 * key, so changing the voice, model or encoder yields a new enclosure URL.
 */
export const AUDIO_SIGNATURE = [
  "gemini-2.5-flash-preview-tts",
  ...Object.values(VOICE),
  "mp3-mono-24000-64k",
].join("|");

export const geminiSynthesizer =
  (apiKey: string): Synthesizer =>
  (text) =>
    new GeminiTTSService().synthesize(text, { ...VOICE }, apiKey);

/** Runs a command, returning stdout; its stderr is passed through on failure. */
export const runCommand: CommandRunner = async (args) => {
  const child = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exit !== 0) throw new Error(`${args[0]} failed: ${stderr.trim()}`);
  return stdout;
};

/** The R2 key for a narration: same input, same key, so retries can skip TTS. */
export function audioKey(slug: string, narration: string): string {
  const hash = createHash("sha256")
    .update(`${AUDIO_SIGNATURE}\n${narration}`)
    .digest("hex")
    .slice(0, 12);
  return `podcast/answers/audio/${slug}-${hash}.mp3`;
}

/** Duration in seconds of a local file or a public URL. */
export async function probeDuration(
  source: string,
  run: CommandRunner = runCommand,
): Promise<number> {
  const output = await run([
    "ffprobe",
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    source,
  ]);
  const duration = Number(output.trim());
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error(`Invalid audio duration for ${source}`);
  return duration;
}

export interface Mp3 {
  path: string;
  bytes: number;
  duration: number;
  /** Removes the temporary directory holding the file. */
  cleanup: () => Promise<void>;
}

/** Narrates `text` and encodes it to a temporary MP3. Never returns silence on failure. */
export async function createMp3(
  text: string,
  synthesize: Synthesizer,
  run: CommandRunner = runCommand,
): Promise<Mp3> {
  const blob = await synthesize(text);
  if (!blob?.size) throw new Error("Audio synthesis failed");
  const dir = await mkdtemp(join(tmpdir(), "podcast-"));
  const cleanup = () => rm(dir, { recursive: true, force: true });
  try {
    const wav = join(dir, "input.wav");
    const path = join(dir, "episode.mp3");
    await writeFile(wav, Buffer.from(await blob.arrayBuffer()));
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
      path,
    ]);
    const { size } = await stat(path);
    return {
      path,
      bytes: size,
      duration: await probeDuration(path, run),
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
