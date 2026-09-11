#!/usr/bin/env bun
import { publishInstagramPost } from "./release-comms-instagram.ts";

export interface InstagramCliOptions {
  imageUrl: string;
  caption: string;
  dryRun: boolean;
}

export function parseInstagramCliArgs(args: string[]): InstagramCliOptions {
  let imageUrl = "";
  let dryRun = false;
  const captionParts: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--image") {
      const value = args[index + 1];
      if (!value) throw new Error("--image requires an R2 image URL");
      imageUrl = value;
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      captionParts.push(arg);
    }
  }
  // A quoted shell argument reaches Bun as one value, preserving every space
  // and newline in the final Bluesky caption.
  if (!imageUrl) throw new Error("--image is required");
  if (captionParts.length !== 1 || !captionParts[0]) {
    throw new Error("Pass the exact Bluesky caption as one quoted argument");
  }
  return { imageUrl, caption: captionParts[0], dryRun };
}

function usage(error: Error): never {
  console.error(
    `${error.message}\nusage: bun run post:instagram -- --image <R2 JPEG image URL> [--dry-run] "<exact Bluesky caption>"`,
  );
  process.exit(1);
}

if (import.meta.main) {
  let options: InstagramCliOptions;
  try {
    options = parseInstagramCliArgs(process.argv.slice(2));
  } catch (error) {
    usage(error instanceof Error ? error : new Error(String(error)));
  }

  const publication = await publishInstagramPost({
    asset: {
      pageUrl: "https://codexcryptica.com",
      imageUrl: options.imageUrl,
      imageAlt: "",
    },
    caption: options.caption,
    dryRun: options.dryRun,
  });
  console.log(
    `${options.dryRun ? "Dry run" : "Published"}: ${publication.url}`,
  );
}
