import { describe, it, expect } from "vitest";
import {
  isSupportedImportExtension,
  isSupportedMarkdownImportExtension,
  isSupportedTextImportExtension,
  validateImportFile,
  validateMarkdownImportFile,
} from "../src/utils/validation";

describe("Importer File Extension Validation", () => {
  it("should accept .md and .markdown", () => {
    expect(isSupportedImportExtension("test.md")).toBe(true);
    expect(isSupportedImportExtension("test.markdown")).toBe(true);
    expect(isSupportedImportExtension("TEST.MD")).toBe(true);
    expect(isSupportedMarkdownImportExtension("test.md")).toBe(true);
  });

  it("should accept existing importer file extensions", () => {
    expect(isSupportedImportExtension("test.txt")).toBe(true);
    expect(isSupportedImportExtension("test.json")).toBe(true);
    expect(isSupportedImportExtension("test.pdf")).toBe(true);
    expect(isSupportedImportExtension("test.docx")).toBe(true);
  });

  it("should restrict TextParser extensions to text and markdown inputs", () => {
    expect(isSupportedTextImportExtension("test.txt")).toBe(true);
    expect(isSupportedTextImportExtension("test.md")).toBe(true);
    expect(isSupportedTextImportExtension("test.json")).toBe(false);
    expect(isSupportedTextImportExtension("test.pdf")).toBe(false);
  });

  it("should reject unsupported extensions", () => {
    expect(isSupportedImportExtension("test.csv")).toBe(false);
    expect(isSupportedImportExtension("test")).toBe(false);
  });

  it("should reject empty markdown files before parsing", () => {
    const file = new File([], "empty.md", { type: "text/markdown" });

    expect(validateImportFile(file)).toEqual({
      success: false,
      reason: "Empty file",
    });
    expect(validateMarkdownImportFile(file)).toEqual({
      success: false,
      reason: "Empty file",
    });
  });
});
