import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { referencePackage } from "../../../stores/oracle/tests/adventure-fixtures";
import {
  buildLedger,
  packageManager,
} from "../../../stores/oracle/tests/package-progress-ledger";
import AdventurePackageAudit from "./AdventurePackageAudit.svelte";

const pkg = referencePackage;
const LANDING = "ros-scene-1-landing";
const YARD = "ros-scene-2-yard";
const SECRET = "secret-filed-pin";

const progress = buildLedger(
  pkg,
  [
    [
      { recordId: YARD, to: "active", note: "YARD-NOTE" },
      {
        recordId: SECRET,
        to: "resolved",
        certainty: "claimed",
        note: "CLAIM-NOTE",
      },
    ],
    [
      {
        recordId: YARD,
        to: "skipped",
        supersedes: "t1:pkg:1",
        note: "FIX-NOTE",
      },
    ],
  ],
  LANDING,
);

/** A keyboard user focuses a button with Tab and presses Enter, which clicks it. */
async function press(button: HTMLElement) {
  button.focus();
  expect(document.activeElement).toBe(button);
  await fireEvent.click(button);
}

describe("AdventurePackageAudit", () => {
  it("is absent without a source package", async () => {
    render(AdventurePackageAudit, {
      manager: packageManager(null, progress, false),
    });
    await Promise.resolve();
    expect(screen.queryByTestId("adventure-package-audit")).toBeNull();
  });

  it("shows only the button by default", async () => {
    render(AdventurePackageAudit, { manager: packageManager(pkg, progress) });
    const button = await screen.findByRole("button", {
      name: "Show GM details",
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    const text =
      screen.getByTestId("adventure-package-audit").textContent ?? "";
    expect(text).not.toContain("YARD-NOTE");
    expect(text).not.toContain(pkg.secrets[0]!.text);
  });

  it("warns first, focuses the warning, and Cancel returns to default", async () => {
    render(AdventurePackageAudit, { manager: packageManager(pkg, progress) });
    await press(await screen.findByRole("button", { name: "Show GM details" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("GM-only");
    expect(document.activeElement).toBe(alert);
    expect(
      screen.getByTestId("adventure-package-audit").textContent,
    ).not.toContain("YARD-NOTE");
    await press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alert")).toBeNull();
    const showAgain = screen.getByRole("button", { name: "Show GM details" });
    expect(showAgain).toBeTruthy();
    expect(document.activeElement).toBe(showAgain);
  });

  it("reveals claims and superseded events, then hides again", async () => {
    render(AdventurePackageAudit, { manager: packageManager(pkg, progress) });
    await press(await screen.findByRole("button", { name: "Show GM details" }));
    await press(screen.getByRole("button", { name: "Reveal GM details" }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Hide GM details" }),
    );
    const root = screen.getByTestId("adventure-package-audit");
    expect(root.textContent).toContain("CLAIM-NOTE");
    expect(root.textContent).toContain("YARD-NOTE");
    expect(root.textContent).toContain("FIX-NOTE");
    expect(root.textContent).toContain("Claimed");
    expect(root.textContent).toContain("Superseded");
    expect(root.textContent).toContain("Confirmed");
    await press(screen.getByRole("button", { name: "Hide GM details" }));
    expect(root.textContent).not.toContain("YARD-NOTE");
    const showAgain = screen.getByRole("button", { name: "Show GM details" });
    expect(showAgain).toBeTruthy();
    expect(document.activeElement).toBe(showAgain);
  });

  it("shows an empty-ledger message when revealed with no events", async () => {
    render(AdventurePackageAudit, {
      manager: packageManager(pkg, { sceneId: LANDING }),
    });
    await press(await screen.findByRole("button", { name: "Show GM details" }));
    await press(screen.getByRole("button", { name: "Reveal GM details" }));
    expect(
      screen.getByText("No package records have been touched yet."),
    ).toBeTruthy();
  });

  it("resets to hidden when the session id or package hash changes", async () => {
    const first = packageManager(pkg, progress);
    const { rerender } = render(AdventurePackageAudit, { manager: first });
    await press(await screen.findByRole("button", { name: "Show GM details" }));
    await press(screen.getByRole("button", { name: "Reveal GM details" }));
    expect(screen.getByTestId("adventure-package-audit").textContent).toContain(
      "YARD-NOTE",
    );

    const next = packageManager(pkg, progress);
    next.session = { ...next.session!, id: "session-2" };
    await rerender({ manager: next });
    expect(
      await screen.findByRole("button", { name: "Show GM details" }),
    ).toBeTruthy();
    expect(
      screen.getByTestId("adventure-package-audit").textContent,
    ).not.toContain("YARD-NOTE");
  });

  it("keeps the audit revealed when the same session and package are replaced", async () => {
    const first = packageManager(pkg, progress);
    const { rerender } = render(AdventurePackageAudit, { manager: first });
    await press(await screen.findByRole("button", { name: "Show GM details" }));
    await press(screen.getByRole("button", { name: "Reveal GM details" }));

    const replacement = packageManager(pkg, progress);
    replacement.session = { ...first.session! };
    await rerender({ manager: replacement });

    expect(
      screen.getByRole("button", { name: "Hide GM details" }),
    ).toBeTruthy();
    expect(screen.getByTestId("adventure-package-audit").textContent).toContain(
      "YARD-NOTE",
    );
  });
});
