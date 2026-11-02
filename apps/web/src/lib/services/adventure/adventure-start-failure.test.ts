import { describe, expect, it } from "vitest";
import {
  AI_DISABLED_START,
  describeAdventureStartFailure,
  describeStartOutcome,
  startPrecheck,
} from "./adventure-start-failure";

describe("startPrecheck", () => {
  it("allows a start when online with AI enabled", () => {
    expect(startPrecheck({ aiDisabled: false, online: true })).toBeNull();
  });

  it("blocks on AI Disabled before checking the connection", () => {
    expect(startPrecheck({ aiDisabled: true, online: false })).toBe(
      AI_DISABLED_START,
    );
  });

  it("blocks when offline", () => {
    expect(startPrecheck({ aiDisabled: false, online: false })).toMatch(
      /Connect to the internet/,
    );
  });
});

describe("describeStartOutcome", () => {
  it("returns null only when an opening was committed", () => {
    expect(
      describeStartOutcome({
        errorCause: null,
        committed: true,
        readOnly: false,
      }),
    ).toBeNull();
  });

  it("maps a typed cause even if a session exists", () => {
    expect(
      describeStartOutcome({
        errorCause: "storage-full",
        committed: true,
        readOnly: false,
      }),
    ).toBe(describeAdventureStartFailure("storage-full"));
  });

  it("explains a lost lease when nothing was committed", () => {
    expect(
      describeStartOutcome({
        errorCause: null,
        committed: false,
        readOnly: true,
      }),
    ).toMatch(/Another tab controls/);
  });

  it("reports an unwritten opening otherwise", () => {
    expect(
      describeStartOutcome({
        errorCause: null,
        committed: false,
        readOnly: false,
      }),
    ).toMatch(/opening scene has not been written/);
  });
});
