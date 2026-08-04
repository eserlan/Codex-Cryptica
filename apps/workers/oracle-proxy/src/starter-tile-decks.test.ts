import { describe, expect, it } from "vitest";
import { handleGetStarterTileDeck } from "./starter-tile-decks";

describe("starter tile deck R2 reads", () => {
  it("returns a cached image from the catalog prefix", async () => {
    const get = async (key: string) =>
      key ===
      "starter-tile-decks/kenney-scribble-dungeons/assets/rooms/room.png"
        ? {
            body: new Blob(["png"]).stream(),
            httpMetadata: { contentType: "image/png" },
            etag: "asset-etag",
          }
        : null;

    const response = await handleGetStarterTileDeck(
      { BUCKET: { get } },
      "kenney-scribble-dungeons",
      "rooms/room.png",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("immutable");
  });

  it("rejects traversal paths before accessing R2", async () => {
    const get = async () => {
      throw new Error("must not be called");
    };

    const response = await handleGetStarterTileDeck(
      { BUCKET: { get } },
      "kenney-scribble-dungeons",
      "../manifest.json",
    );

    expect(response.status).toBe(404);
  });
});
