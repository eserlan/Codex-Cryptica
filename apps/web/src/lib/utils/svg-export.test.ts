/** @vitest-environment jsdom */

import { describe, it, expect } from "vitest";
import { blobToFile, blobToDataUrl, dataUrlToFile } from "./svg-export";

describe("blobToFile", () => {
  it("wraps a blob as a File with the given name and type", () => {
    const blob = new Blob(["hello"], { type: "image/png" });
    const file = blobToFile(blob, "diagram.png");
    expect(file.name).toBe("diagram.png");
    expect(file.type).toBe("image/png");
  });
});

describe("blobToDataUrl / dataUrlToFile round trip", () => {
  it("recovers the original bytes and mime type", async () => {
    const original = new Blob(["star-system-diagram-bytes"], {
      type: "image/png",
    });
    const dataUrl = await blobToDataUrl(original);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);

    const file = dataUrlToFile(dataUrl, "diagram.png");
    expect(file.type).toBe("image/png");
    expect(file.name).toBe("diagram.png");
    const text = await file.text();
    expect(text).toBe("star-system-diagram-bytes");
  });

  it("defaults to image/png when the data URL has no parseable mime type", () => {
    const file = dataUrlToFile(`data:;base64,${btoa("x")}`, "fallback.png");
    expect(file.type).toBe("image/png");
  });
});
