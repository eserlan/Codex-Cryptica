import { describe, expect, it } from "vitest";
import { cifMood } from "./cif-mood";

describe("cifMood", () => {
  it("is curious on an empty conversation", () => {
    expect(cifMood({ status: "idle", messageCount: 0 })).toBe("curious");
  });

  it("thinks while an answer is pending", () => {
    expect(cifMood({ status: "pending", messageCount: 1 })).toBe("thinking");
  });

  it("beams just after an answer arrives, then explains", () => {
    expect(
      cifMood({ status: "answered", messageCount: 2, delighted: true }),
    ).toBe("delighted");
    expect(
      cifMood({ status: "answered", messageCount: 2, delighted: false }),
    ).toBe("explaining");
  });

  it("never beams on a failure, even if the flag is stale", () => {
    expect(
      cifMood({ status: "fallback", messageCount: 2, delighted: true }),
    ).toBe("confused");
  });

  it("explains once an answer arrives", () => {
    expect(cifMood({ status: "answered", messageCount: 2 })).toBe("explaining");
  });

  it.each(["no-match", "out-of-scope", "fallback"] as const)(
    "is confused when it could not help (%s)",
    (status) => {
      expect(cifMood({ status, messageCount: 2 })).toBe("confused");
    },
  );

  it("settles back to idle after a cancelled question", () => {
    expect(cifMood({ status: "idle", messageCount: 1 })).toBe("idle");
  });
});
