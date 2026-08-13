import { describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({ base: "" }));

import { buildGuestEntityUrl } from "./guest-link";

describe("buildGuestEntityUrl", () => {
  it("builds the guest deep link with an explicit origin", () => {
    expect(buildGuestEntityUrl("pub-1", "aglarond", "https://codex.app")).toBe(
      "https://codex.app/guest/pub-1?entity=aglarond",
    );
  });

  it("URL-encodes the entity id", () => {
    expect(buildGuestEntityUrl("pub-1", "a b/c", "https://codex.app")).toBe(
      "https://codex.app/guest/pub-1?entity=a%20b%2Fc",
    );
  });

  it("URL-encodes the publish id", () => {
    expect(buildGuestEntityUrl("pub 1", "aglarond", "https://codex.app")).toBe(
      "https://codex.app/guest/pub%201?entity=aglarond",
    );
  });
});
