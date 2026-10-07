import { describe, expect, it } from "vitest";
import { getGeneratorColumnClasses } from "./generator-column-classes";

describe("getGeneratorColumnClasses", () => {
  it("uses the default three-column layout", () => {
    expect(getGeneratorColumnClasses(false, false)).toEqual({
      form: "lg:col-span-3",
      output: "lg:col-span-6",
      table: "lg:col-span-3",
    });
  });

  it("widens the form and output when requested", () => {
    expect(getGeneratorColumnClasses(false, true)).toEqual({
      form: "lg:col-span-5",
      output: "lg:col-span-7",
      table: "lg:col-span-12",
    });
  });

  it("uses one centred column when singleColumn is enabled", () => {
    const fullWidth =
      "lg:col-span-12 lg:w-full lg:max-w-3xl lg:justify-self-center";
    expect(getGeneratorColumnClasses(true, false)).toEqual({
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
