import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readCanvasComponent(name: string) {
  return readFileSync(
    resolve(process.cwd(), `src/lib/components/canvas/${name}.svelte`),
    "utf8",
  );
}

describe("centered canvas connection handles", () => {
  it("uses a full-card source handle whose bounds resolve to the node center", () => {
    const source = readCanvasComponent("CanvasCenterConnectionHandles");

    expect(source).toContain('class="full-card-handle');
    expect(source).toContain("inset: 0");
    expect(source).toContain("width: 100%");
    expect(source).toContain("height: 100%");
    expect(source).toContain("transform: none !important");
  });

  it.each(["AdventureNode", "DelveRoomNode"])(
    "uses the shared centered connection mechanism in %s",
    (componentName) => {
      const source = readCanvasComponent(componentName);

      expect(source).toContain("<CanvasCenterConnectionHandles");
      expect(source).not.toContain("<Handle");
    },
  );
});
