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
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=86400, immutable",
    );
  });

  it("returns manifest with standard max-age and no immutable directive", async () => {
    const get = async (key: string) =>
      key === "starter-tile-decks/kenney-scribble-dungeons/manifest.json"
        ? {
            body: new Response("{}").body!,
            httpMetadata: { contentType: "application/json; charset=utf-8" },
            etag: "manifest-etag",
          }
        : null;

    const response = await handleGetStarterTileDeck(
      { BUCKET: { get } },
      "kenney-scribble-dungeons",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
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
