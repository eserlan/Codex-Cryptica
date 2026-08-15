import { describe, expect, it } from "vitest";
import {
  isImageFile,
  matchCardImages,
  titleFromFileName,
} from "../../src/import/card-images";

describe("matchCardImages", () => {
  it("matches on the file name, ignoring case and separators", () => {
    const matches = matchCardImages(
      ["The Tower", "The Star"],
      ["the-star.jpg", "The_Tower.PNG"],
    );

    expect(matches).toEqual([
      { cardIndex: 0, fileIndex: 1, method: "name" },
      { cardIndex: 1, fileIndex: 0, method: "name" },
    ]);
  });

  it("ignores a numeric prefix on the file name", () => {
    const matches = matchCardImages(["The Hermit"], ["09 - the hermit.webp"]);

    expect(matches).toEqual([{ cardIndex: 0, fileIndex: 0, method: "name" }]);
  });

  it("falls back to a close name", () => {
    const matches = matchCardImages(["The Hanged Man"], ["hanged-man.jpg"]);

    expect(matches).toEqual([
      { cardIndex: 0, fileIndex: 0, method: "similar" },
    ]);
  });

  it("matches by position when every leftover picture is numbered", () => {
    const matches = matchCardImages(
      ["Ace of Cups", "Two of Cups"],
      ["02.jpg", "01.jpg"],
    );

    expect(matches).toEqual([
      { cardIndex: 0, fileIndex: 1, method: "order" },
      { cardIndex: 1, fileIndex: 0, method: "order" },
    ]);
  });

  it("leaves a card unmatched rather than guessing wildly", () => {
    const matches = matchCardImages(["The Tower"], ["holiday-photo.jpg"]);

    expect(matches).toEqual([]);
  });

  it("never gives one picture to two cards", () => {
    const matches = matchCardImages(
      ["The Tower", "The Towers"],
      ["the-tower.jpg"],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.fileIndex).toBe(0);
  });
});

describe("titleFromFileName", () => {
  it("reads a title out of a file name", () => {
    expect(titleFromFileName("03_the-hanged-man.jpg")).toBe("The Hanged Man");
  });

  it("keeps a purely numeric name rather than returning nothing", () => {
    expect(titleFromFileName("07.png")).toBe("07");
  });
});

describe("isImageFile", () => {
  it("accepts pictures and rejects the rest of a folder", () => {
    expect(isImageFile({ name: "tower.webp" })).toBe(true);
    expect(isImageFile({ name: "scan", type: "image/png" })).toBe(true);
    expect(isImageFile({ name: ".DS_Store" })).toBe(false);
    expect(isImageFile({ name: "readme.md" })).toBe(false);
  });
});
