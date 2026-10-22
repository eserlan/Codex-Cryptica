import { describe, expect, it } from "vitest";
import { makeStore } from "./biome-explorer.test-helpers";
import { MAX_ATTACHMENT_BYTES } from "./biome-explorer.svelte";

const png = (name = "flats.png", size = 10) =>
  new File([new Uint8Array(size)], name, { type: "image/png" });

async function saved() {
  const made = makeStore();
  made.store.startFromReference("tundra");
  made.store.setTitle("Ashen Flats");
  await made.store.save();
  return made;
}

describe("BiomeExplorerStore illustration prompt", () => {
  it("builds a prompt that starts with the fixed prefix and copies it", async () => {
    const { store, copied } = await saved();
    expect(
      store.illustrationPromptText().startsWith("fantasy, illustration of"),
    ).toBe(true);
    expect(store.illustrationPromptText()).toContain("Ashen Flats");
    const result = await store.copyPrompt();
    expect(result.ok).toBe(true);
    expect(copied[0]).toBe(store.illustrationPromptText());
  });

  it("returns the text for the user to copy by hand when the clipboard is unavailable", async () => {
    const { store, breakClipboard } = await saved();
    breakClipboard();
    const result = await store.copyPrompt();
    expect(result.ok).toBe(false);
    expect(store.copyFallbackText).toBe(result.text);
  });

  it("keeps or drops the prompt with the biome and marks the draft changed", async () => {
    const { store } = await saved();
    expect(store.draft?.dirty).toBe(false);
    store.keepPrompt();
    expect(store.draft?.profile.illustrationPrompt).toBe(
      store.illustrationPromptText(),
    );
    expect(store.draft?.dirty).toBe(true);
    store.dropPrompt();
    expect(store.draft?.profile.illustrationPrompt).toBeUndefined();
  });

  it("includes fictional changes in the prompt", async () => {
    const { store } = await saved();
    store.addAlteration({ aspect: "climate", description: "It rains ash" });
    expect(store.illustrationPromptText()).toContain("It rains ash");
  });
});

describe("BiomeExplorerStore reference links", () => {
  it("adds and removes https links", () => {
    const { store } = makeStore();
    store.startBlank();
    expect(store.addReferenceLink("https://example.com/a", "Mine")).toBe("ok");
    expect(store.draft?.profile.referenceLinks).toHaveLength(1);
    expect(store.draft?.dirty).toBe(true);
    store.removeReferenceLink(0);
    expect(store.draft?.profile.referenceLinks).toEqual([]);
  });

  it("rejects links that are not https and says why", () => {
    const { store } = makeStore();
    store.startBlank();
    for (const url of [
      "http://example.com",
      "javascript:alert(1)",
      "nope",
      "",
    ]) {
      expect(store.addReferenceLink(url, "x")).toBe("invalid");
    }
    expect(store.draft?.profile.referenceLinks).toEqual([]);
  });

  it("stops at ten links", () => {
    const { store } = makeStore();
    store.startBlank();
    for (let i = 0; i < 10; i++) {
      expect(store.addReferenceLink(`https://example.com/${i}`, "")).toBe("ok");
    }
    expect(store.addReferenceLink("https://example.com/extra", "")).toBe(
      "full",
    );
  });
});

describe("BiomeExplorerStore pictures", () => {
  it("attaches a picture to a saved biome and shows it", async () => {
    const { store, vault } = await saved();
    expect(await store.attachImage(png())).toBe(true);
    expect(vault.images.get(store.draft!.entityId!)).toBe("flats.png");
    expect(store.attachedImageUrl).toBe("blob:flats.png");
    expect(store.attachError).toBeNull();
  });

  it("asks to save first when the biome has not been saved", async () => {
    const { store, vault } = makeStore();
    store.startBlank();
    expect(await store.attachImage(png())).toBe(false);
    expect(store.attachError).toMatch(/Save the biome first/);
    expect(vault.images.size).toBe(0);
  });

  it("rejects a file that is not an image, leaving the biome unchanged", async () => {
    const { store, vault } = await saved();
    const text = new File(["hi"], "notes.txt", { type: "text/plain" });
    expect(await store.attachImage(text)).toBe(false);
    expect(store.attachError).toMatch(/image file/);
    expect(vault.images.size).toBe(0);
  });

  it("rejects an oversize image with a plain message", async () => {
    const { store, vault } = await saved();
    const big = png("big.png", MAX_ATTACHMENT_BYTES + 1);
    expect(await store.attachImage(big)).toBe(false);
    expect(store.attachError).toMatch(/too large/i);
    expect(vault.images.size).toBe(0);
  });

  it("reports a failed save and keeps the previous picture", async () => {
    const { store, vault } = await saved();
    await store.attachImage(png("first.png"));
    vault.failWrites = true;
    expect(await store.attachImage(png("second.png"))).toBe(false);
    expect(store.attachError).toMatch(/couldn't save the picture/i);
    expect(vault.images.get(store.draft!.entityId!)).toBe("first.png");
  });

  it("removes the picture", async () => {
    const { store, vault } = await saved();
    await store.attachImage(png());
    expect(await store.removeImage()).toBe(true);
    expect(vault.images.size).toBe(0);
    expect(store.attachedImageUrl).toBe("");
  });

  it("shows the picture when a saved biome is reopened", async () => {
    const { store } = await saved();
    await store.attachImage(png());
    const id = store.draft!.entityId!;
    store.discardDraft(true);
    expect(store.attachedImageUrl).toBe("");
    await store.openProfile(id);
    expect(store.attachedImageUrl).toBe("blob:flats.png");
  });

  it("does not show a picture for a biome that was closed while it loaded", async () => {
    const { store, vault } = await saved();
    await store.attachImage(png());
    const id = store.draft!.entityId!;
    store.discardDraft(true);

    const original = vault.imageUrl.bind(vault);
    let started: () => void = () => {};
    const imageRequested = new Promise<void>((resolve) => (started = resolve));
    vault.imageUrl = async (imageId) => {
      started();
      await new Promise((resolve) => setTimeout(resolve, 10));
      return original(imageId);
    };
    const opening = store.openProfile(id);
    await imageRequested;
    store.discardDraft(true);
    await opening;
    expect(store.attachedImageUrl).toBe("");
  });
});
