import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("DelveRoomNode connection handles", () => {
  it("preserves old handle IDs through the centered connection mechanism", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/components/canvas/DelveRoomNode.svelte"),
      "utf8",
    );

    expect(source).toContain(
      'legacyTargetHandleIds={["target-top", "target-left"]}',
    );
    expect(source).toContain(
      'legacySourceHandleIds={["source-bottom", "source-right"]}',
    );
  });
});
