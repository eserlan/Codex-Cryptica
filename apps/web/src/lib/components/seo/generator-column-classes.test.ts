import { describe, expect, it } from "vitest";
import { getGeneratorColumnClasses } from "./generator-column-classes";

describe("getGeneratorColumnClasses", () => {
  it("uses the default three-column layout", () => {
    const classes = getGeneratorColumnClasses(false, false);
    expect(classes).toMatchObject({
      form: "lg:col-span-3 2xl:col-span-1",
      output: "lg:col-span-6 2xl:col-span-1",
      table: "lg:col-span-3 2xl:col-span-1",
    });
  });

  it("uses the wide canvas, and gives ultra-wide screens extra room to the output only", () => {
    const { container } = getGeneratorColumnClasses(false, false);
    expect(container).toContain("max-w-7xl");
    expect(container).not.toContain("max-w-6xl");
    expect(container).toContain("2xl:max-w-[96rem]");
    // Fixed-width form and rail; the middle track takes the rest.
    expect(container).toContain("2xl:grid-cols-[19rem_minmax(0,1fr)_19rem]");
  });

  it("keeps the ultra-wide track template off the other layouts", () => {
    for (const [single, wide] of [
      [true, false],
      [false, true],
    ] as const) {
      const { container } = getGeneratorColumnClasses(single, wide);
      expect(container).toContain("max-w-7xl");
      expect(container).not.toContain("2xl:grid-cols");
    }
  });

  it("widens the form and output when requested", () => {
    expect(getGeneratorColumnClasses(false, true)).toMatchObject({
      form: "lg:col-span-5",
      output: "lg:col-span-7",
      table: "lg:col-span-12",
    });
  });

  it("uses one centred column when singleColumn is enabled", () => {
    const fullWidth =
      "lg:col-span-12 lg:w-full lg:max-w-3xl lg:justify-self-center";
    expect(getGeneratorColumnClasses(true, false)).toMatchObject({
      form: fullWidth,
      output: fullWidth,
      table: fullWidth,
    });
  });

  it("gives singleColumn precedence when both layout options are enabled", () => {
    expect(getGeneratorColumnClasses(true, true)).toEqual(
      getGeneratorColumnClasses(true, false),
    );
  });
});
