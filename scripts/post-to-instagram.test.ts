import { describe, expect, it } from "bun:test";
import { parseInstagramCliArgs } from "./post-to-instagram.ts";

describe("parseInstagramCliArgs", () => {
  it("preserves a quoted multiline caption byte-for-byte", () => {
    const caption =
      "A finished Bluesky caption\n\n#ttrpg  \nhttps://codexcryptica.com/answers/example";

    expect(
      parseInstagramCliArgs([
        "--dry-run",
        "--image",
        "https://assets.codexcryptica.com/og/example.jpg",
        caption,
      ]),
    ).toEqual({
      dryRun: true,
      imageUrl: "https://assets.codexcryptica.com/og/example.jpg",
      caption,
    });
  });

  it("rejects a missing image value", () => {
    expect(() => parseInstagramCliArgs(["--image"])).toThrow(
      "--image requires an R2 image URL",
    );
  });

  it("rejects unknown flags and split captions", () => {
    expect(() =>
      parseInstagramCliArgs([
        "--image",
        "https://assets.codexcryptica.com/og/example.jpg",
        "--alt",
        "description",
        "caption",
      ]),
    ).toThrow("Unknown option: --alt");
    expect(() =>
      parseInstagramCliArgs([
        "--image",
        "https://assets.codexcryptica.com/og/example.jpg",
        "split",
        "caption",
      ]),
    ).toThrow("one quoted argument");
  });
});
