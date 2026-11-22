import { describe, expect, it } from "vitest";
import { LightboxStore, lightboxStore } from "./lightbox.svelte";
import { modalUIStore } from "./modal-ui.svelte";

describe("LightboxStore", () => {
  it("opens and closes while preserving and clearing originRect and imagePath", () => {
    const store = new LightboxStore();
    expect(store.state).toEqual({
      show: false,
      imageUrl: "",
      originRect: null,
      imagePath: "",
    });

    const rect = { x: 12, y: 24, width: 120, height: 80 };
    store.open(
      "https://example.com/map.webp",
      "World Map",
      rect,
      "maps/world.webp",
    );

    expect(store.state).toEqual({
      show: true,
      imageUrl: "https://example.com/map.webp",
      title: "World Map",
      originRect: rect,
      imagePath: "maps/world.webp",
    });

    store.close();
    expect(store.state.show).toBe(false);
    expect(store.state.originRect).toBeNull();
    expect(store.state.imagePath).toBe("");
    expect(store.state.imageUrl).toBe("https://example.com/map.webp");
  });

  it("treats close when already closed as a safe no-op", () => {
    const store = new LightboxStore();
    store.close();
    expect(store.state).toEqual({
      show: false,
      imageUrl: "",
      originRect: null,
      imagePath: "",
    });
  });

  it("shares state between lightboxStore and modalUIStore.lightbox", () => {
    lightboxStore.close();

    lightboxStore.open("https://example.com/blog.png", "Blog Illustration", {
      x: 1,
      y: 2,
      width: 30,
      height: 40,
    });
    expect(modalUIStore.lightbox.show).toBe(true);
    expect(modalUIStore.lightbox.imageUrl).toBe("https://example.com/blog.png");
    expect(modalUIStore.panelDialogOpen).toBe(true);

    modalUIStore.closeLightbox();
    expect(lightboxStore.state.show).toBe(false);
    expect(lightboxStore.state.originRect).toBeNull();
    expect(modalUIStore.panelDialogOpen).toBe(false);
  });
});
