/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import FanContentDisclaimer from "./FanContentDisclaimer.svelte";
import { PUBLIC_WORLDS_NOTICE } from "$lib/config/public-worlds-notice";

describe("FanContentDisclaimer", () => {
  it("renders nothing when fanContent is false or undefined", () => {
    const { container } = render(FanContentDisclaimer, {
      props: { fanContent: false },
    });
    expect(
      container.querySelector('[data-testid="fan-content-disclaimer"]'),
    ).toBeNull();
  });

  it("renders default fan-content disclaimer when fanContent is true and customDisclaimer is missing/empty", () => {
    render(FanContentDisclaimer, {
      props: { fanContent: true, customDisclaimer: "" },
    });
    const container = screen.getByTestId("fan-content-disclaimer");
    expect(container).toBeDefined();
    expect(container.textContent).toContain(
      PUBLIC_WORLDS_NOTICE.DEFAULT_FAN_CONTENT_DISCLAIMER,
    );
  });

  it("renders custom rights-holder disclaimer wording when provided", () => {
    const customText =
      "Unofficial Fan Content permitted under Wizards of the Coast Fan Content Policy.";
    render(FanContentDisclaimer, {
      props: { fanContent: true, customDisclaimer: customText },
    });
    const container = screen.getByTestId("fan-content-disclaimer");
    expect(container.textContent).toContain(customText);
    expect(container.textContent).not.toContain(
      PUBLIC_WORLDS_NOTICE.DEFAULT_FAN_CONTENT_DISCLAIMER,
    );
  });

  it("renders custom wording as plain text without HTML injection", () => {
    const maliciousInput = '<script>alert("xss")</script><b>Not bold</b>';
    render(FanContentDisclaimer, {
      props: { fanContent: true, customDisclaimer: maliciousInput },
    });
    const container = screen.getByTestId("fan-content-disclaimer");
    // Should render the literal characters including tags, not actual DOM elements
    expect(container.textContent).toContain(
      '<script>alert("xss")</script><b>Not bold</b>',
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
  });

  it("bounds custom disclaimer length to 500 characters", () => {
    const longText = "a".repeat(600);
    render(FanContentDisclaimer, {
      props: { fanContent: true, customDisclaimer: longText },
    });
    const container = screen.getByTestId("fan-content-disclaimer");
    expect(container.textContent).toContain("a".repeat(500));
    expect(container.textContent).not.toContain("a".repeat(501));
  });
});
