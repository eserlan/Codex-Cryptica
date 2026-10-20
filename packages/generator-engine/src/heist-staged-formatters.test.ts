import { describe, expect, it } from "vitest";
import {
  formatAlarmTrack,
  formatCasing,
  formatComplications,
  formatFlashbacks,
  formatGetaway,
  formatSecurityRings,
  getRingText,
} from "./heist-staged-formatters";
import { buildHeistPrompt } from "./public-heist";

const resolved = buildHeistPrompt({ heistType: "Theft" }).resolved;

describe("heist stage formatters", () => {
  it("formats casing strings and objects without duplicating bullets", () => {
    expect(
      formatCasing([
        "  - Gate  ",
        " Shift ",
        { title: "**Door**", text: " Locked " },
        null,
      ]),
    ).toBe("- Gate\n- Shift\n- **Door**: Locked");
    expect(formatCasing("  Existing intel  ")).toBe("Existing intel");
    expect(formatCasing(4)).toBe("");
  });

  it("prefers nested rings, then direct fields, aliases and combined text", () => {
    expect(
      getRingText(
        { rings: { perimeter: " Nested " }, perimeter: "Direct" },
        "perimeter",
      ),
    ).toBe("Nested");
    expect(getRingText({ access: " Direct " }, "access")).toBe("Direct");
    expect(getRingText({ rings: { vault: " Alias " } }, "inner", "Vault")).toBe(
      "Alias",
    );
    const combined =
      "- **Perimeter**: Guard patrol.\nA second line.\n- **Access**: Key door.";
    expect(getRingText({ securityRings: combined }, "perimeter")).toBe(
      "Guard patrol.\nA second line.",
    );
    expect(getRingText({}, "inner")).toBe("");
    expect(formatSecurityRings({ securityRings: combined }, resolved)).toBe(
      combined,
    );
    expect(
      formatSecurityRings(
        { perimeter: "Guard", access: "Key", inner: "Seal" },
        resolved,
      ),
    ).toBe(
      `- **Perimeter**: Guard\n- **Access**: Key\n- **${resolved.innerRingLabel}**: Seal`,
    );
  });

  it("formats alarm levels using explicit or positional labels", () => {
    expect(
      formatAlarmTrack([
        { detail: "Routine" },
        { level: 4, text: "Hunt" },
        "- Existing",
      ]),
    ).toBe(
      "- **0 — Quiet**: Routine\n- **4 — Lethal Response**: Hunt\n- Existing",
    );
    expect(
      formatAlarmTrack([
        { level: 7, label: "Custom", detail: "Wait" },
        { level: 8 },
      ]),
    ).toBe("- **7 — Custom**: Wait\n- **8 — Level 8**: ");
  });

  it("adds a default complication only when none is authored", () => {
    expect(
      formatComplications([
        { label: "Bells", detail: "Early" },
        "- **Rival**: Arrives",
      ]),
    ).toBe("- **Bells (default)**: Early\n- **Rival**: Arrives");
    expect(
      formatComplications([
        "- **Bells**: Early",
        { label: "Rival (default)", text: "Arrives" },
      ]),
    ).toBe("- **Bells**: Early\n- **Rival (default)**: Arrives");
    expect(formatComplications(" - **Bells**: Early ")).toBe(
      "- **Bells (default)**: Early",
    );
  });

  it("formats escape routes and offers flashbacks without assuming them", () => {
    expect(
      formatGetaway({
        status: " Compromised ",
        routes: ["- Gate", { text: "Dock" }],
        pursuit: " Guards ",
      }),
    ).toBe("Compromised\n- Gate\n- **Route**: Dock\n**Pursuit**: Guards");
    expect(formatFlashbacks([" Bribed guard ", "- Copied key"])).toBe(
      "Offer these; never assume the players used them.\n- Bribed guard\n- Copied key",
    );
    const authored = "Offer these; an authored menu.";
    expect(formatFlashbacks(authored)).toBe(authored);
    expect(formatFlashbacks(" Copied key ")).toBe(
      "Offer these; never assume the players used them.\nCopied key",
    );
  });

  it("returns empty sections for missing or unsupported inputs", () => {
    for (const format of [
      formatCasing,
      formatAlarmTrack,
      formatComplications,
      formatGetaway,
      formatFlashbacks,
    ]) {
      expect(format(undefined)).toBe("");
      expect(format(42)).toBe("");
      expect(format("  Authored text  ")).toContain("Authored text");
    }
  });
});
