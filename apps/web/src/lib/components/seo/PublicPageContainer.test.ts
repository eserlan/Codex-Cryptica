/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
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

  it("renders children before the aside when both snippets are provided", () => {
    const children = createRawSnippet(() => ({
      render: () => "<p>Main content</p>",
    }));
    const aside = createRawSnippet(() => ({
      render: () => "<p>Aside content</p>",
    }));

    const { getByText } = render(PublicPageContainer, {
      props: { children, aside },
    });

    const mainContent = getByText("Main content");
    const asideContent = getByText("Aside content");
    expect(mainContent).toBeTruthy();
    expect(asideContent).toBeTruthy();
    expect(
      mainContent.compareDocumentPosition(asideContent) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
