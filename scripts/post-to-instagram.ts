#!/usr/bin/env bun
import { publishInstagramPost } from "./release-comms-instagram.ts";

function usage(): never {
  console.error(
    'usage: bun run post:instagram -- --image <R2 image URL> --alt <image description> [--dry-run] "<exact Bluesky caption>"',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
let imageUrl = "";
let imageAlt = "";
let dryRun = false;
const captionParts: string[] = [];
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--dry-run") {
    dryRun = true;
  } else if (arg === "--image" || arg === "--alt") {
    const value = args[index + 1];
    if (!value) usage();
    if (arg === "--image") imageUrl = value;
    else imageAlt = value;
    index += 1;
  } else if (arg.startsWith("--")) {
    usage();
  } else {
    captionParts.push(arg);
  }
}
const caption = captionParts.join(" ");
// The caller must pass one quoted argument so argument parsing cannot alter
// whitespace in the Bluesky caption before it reaches Instagram.
if (!imageUrl || !imageAlt || !caption || captionParts.length !== 1) usage();

const publication = await publishInstagramPost({
  asset: { pageUrl: "https://codexcryptica.com", imageUrl, imageAlt },
  caption,
  dryRun,
});
console.log(`${dryRun ? "Dry run" : "Published"}: ${publication.url}`);
