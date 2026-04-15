import { describe, expect, it } from "vitest";
import { mergeGuestEntityUpdate } from "./guest-entity-merge";

describe("mergeGuestEntityUpdate", () => {
  it("preserves hydrated content when the incoming guest update omits the body", () => {
    const merged = mergeGuestEntityUpdate(
      {
        id: "entity-1",
        title: "Faerun",
        content: "Hydrated chronicle",
        _path: ["faerun.md"],
      } as any,
      {
        id: "entity-1",
        title: "Faerun Revised",
        content: "",
      } as any,
    );

    expect(merged).toMatchObject({
      id: "entity-1",
      title: "Faerun Revised",
      content: "Hydrated chronicle",
      _path: ["faerun.md"],
    });
  });

  it("uses non-empty incoming content when the host sends a replacement", () => {
    const merged = mergeGuestEntityUpdate(
      {
        id: "entity-1",
        title: "Faerun",
        content: "Old content",
      } as any,
      {
        id: "entity-1",
        title: "Faerun Revised",
        content: "New shared chronicle",
      } as any,
    );

    expect(merged.content).toBe("New shared chronicle");
  });
});
