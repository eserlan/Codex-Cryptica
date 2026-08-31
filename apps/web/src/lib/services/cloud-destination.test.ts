import { describe, expect, it } from "vitest";
import {
  resolveCloudDestination,
  canSelectDestination,
  DESTINATION_LABEL,
} from "./cloud-destination";

describe("resolveCloudDestination", () => {
  it("reports no destination for a vault with neither set up", () => {
    expect(
      resolveCloudDestination({ driveConnected: false, cloudBackupOn: false }),
    ).toEqual({ active: "none", conflict: false });
  });

  it("reads the destination from what is actually connected", () => {
    expect(
      resolveCloudDestination({ driveConnected: true, cloudBackupOn: false }),
    ).toEqual({ active: "drive", conflict: false });
    expect(
      resolveCloudDestination({ driveConnected: false, cloudBackupOn: true }),
    ).toEqual({ active: "cc-cloud", conflict: false });
  });

  it("flags a vault that has both rather than hiding one", () => {
    // Reachable for vaults set up before the choice became exclusive. Silently
    // dropping one would misreport where the user's data actually is.
    expect(
      resolveCloudDestination({ driveConnected: true, cloudBackupOn: true }),
    ).toEqual({ active: "drive", conflict: true });
  });
});

describe("canSelectDestination", () => {
  const none = { active: "none", conflict: false } as const;
  const onDrive = { active: "drive", conflict: false } as const;

  it("allows any choice when nothing is set up yet", () => {
    expect(canSelectDestination("drive", none).allowed).toBe(true);
    expect(canSelectDestination("cc-cloud", none).allowed).toBe(true);
  });

  it("allows re-selecting the destination already in use", () => {
    expect(canSelectDestination("drive", onDrive).allowed).toBe(true);
  });

  it("blocks switching to the other cloud while one is live", () => {
    const verdict = canSelectDestination("cc-cloud", onDrive);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain(DESTINATION_LABEL.drive);
  });

  it("allows stepping back to no cloud so the user is never stuck", () => {
    expect(canSelectDestination("none", onDrive).allowed).toBe(true);
  });
});
