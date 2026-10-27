/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/svelte";
import BlogTableOfContents from "./BlogTableOfContents.svelte";

describe("BlogTableOfContents", () => {
  it("renders table of contents when there are 2 or more headings", () => {
    const headings = [
      { level: 2, text: "Section One", id: "section-one" },
      { level: 2, text: "Section Two", id: "section-two" },
    ];
    const { getByTestId, getByText } = render(BlogTableOfContents, {
      props: { headings },
    });
    expect(getByTestId("blog-toc")).toBeTruthy();
    expect(getByText("Section One")).toBeTruthy();
    expect(getByText("Section Two")).toBeTruthy();
  });

  it("does not render when fewer than 2 headings", () => {
    const headings = [{ level: 2, text: "Single Section", id: "single" }];
    const { queryByTestId } = render(BlogTableOfContents, {
      props: { headings },
    });
    expect(queryByTestId("blog-toc")).toBeNull();
  });
});
