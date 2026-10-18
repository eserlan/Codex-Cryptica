import { describe, expect, it, vi } from "vitest";
import {
  linksNewExternalImage,
  localizeExternalImage,
  type ExternalImageLocalizerDeps,
} from "./external-image-localizer";

const url = "https://img.example/hero.png";

function deps(
  entity: Record<string, unknown> | undefined,
  imported: { image: string; thumbnail: string } | null | Error,
) {
  const updateEntity = vi.fn();
  const value: ExternalImageLocalizerDeps = {
    getEntity: () => entity as never,
    importExternalImage: vi.fn(async () => {
      if (imported instanceof Error) throw imported;
      return imported;
    }),
    updateEntity,
  };
  return { value, updateEntity };
}

describe("linksNewExternalImage", () => {
  it("detects a newly linked external image", () => {
    expect(linksNewExternalImage(undefined, { image: ` ${url} ` })).toBe(url);
    expect(linksNewExternalImage("images/old.webp", { image: url })).toBe(url);
  });

  it("ignores unchanged links, local paths and updates without an image", () => {
    expect(linksNewExternalImage(url, { image: url })).toBeNull();
    expect(
      linksNewExternalImage(undefined, { image: "images/a.webp" }),
    ).toBeNull();
    expect(linksNewExternalImage(undefined, { title: "x" })).toBeNull();
  });
});

describe("localizeExternalImage", () => {
  it("points the entity at the local copy and its thumbnail", async () => {
    const local = {
      image: "images/hero.webp",
      thumbnail: "images/hero_thumb.webp",
    };
    const { value, updateEntity } = deps({ id: "hero", image: url }, local);

    expect(await localizeExternalImage(value, "hero", url)).toBe("localized");
    expect(updateEntity).toHaveBeenCalledWith("hero", local);
  });

  it("keeps a newer image the user picked while copying", async () => {
    const { value, updateEntity } = deps(
      { id: "hero", image: "images/newer.webp" },
      { image: "images/hero.webp", thumbnail: "images/hero_thumb.webp" },
    );

    expect(await localizeExternalImage(value, "hero", url)).toBe("superseded");
    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("keeps the link but retires a stale thumbnail when copying fails", async () => {
    const { value, updateEntity } = deps(
      { id: "hero", image: url, thumbnail: "images/old_thumb.webp" },
      new TypeError("CORS"),
    );

    expect(await localizeExternalImage(value, "hero", url)).toBe("linked");
    expect(updateEntity).toHaveBeenCalledWith("hero", { thumbnail: url });
  });

  it("changes nothing when copying fails and the thumbnail already matches", async () => {
    const { value, updateEntity } = deps(
      { id: "hero", image: url, thumbnail: url },
      null,
    );

    expect(await localizeExternalImage(value, "hero", url)).toBe("linked");
    expect(updateEntity).not.toHaveBeenCalled();
  });
});
