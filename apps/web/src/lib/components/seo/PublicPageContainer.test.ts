/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/svelte";
import PublicPageContainer from "./PublicPageContainer.svelte";

describe("PublicPageContainer", () => {
  it("renders with default canvas width", () => {
    const { getByTestId } = render(PublicPageContainer);
    const container = getByTestId("public-page-container");
    expect(container.className).toContain("max-w-4xl");
    expect(container.className).toContain("mx-auto");
  });

  it("renders with full widescreen canvas width", () => {
    const { getByTestId } = render(PublicPageContainer, {
      props: { width: "full" },
    });
    const container = getByTestId("public-page-container");
    expect(container.className).toContain("max-w-7xl");
    expect(container.className).toContain("px-4 sm:px-6 lg:px-8");
  });

  it("renders with narrow canvas width", () => {
    const { getByTestId } = render(PublicPageContainer, {
      props: { width: "narrow" },
    });
    const container = getByTestId("public-page-container");
    expect(container.className).toContain("max-w-2xl");
  });

  it("renders with wide canvas width", () => {
    const { getByTestId } = render(PublicPageContainer, {
      props: { width: "wide" },
    });
    const container = getByTestId("public-page-container");
    expect(container.className).toContain("max-w-6xl");
  });
});
