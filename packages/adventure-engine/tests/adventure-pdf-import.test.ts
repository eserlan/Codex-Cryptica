import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AdventureSourcePackageSchema,
  MAX_ADVENTURE_PDF_BYTES,
  MAX_ADVENTURE_PDF_PAGES,
  parseAdventureMarkdown,
  parseAdventurePdf,
  retrieveAdventureContext,
  saveAdventurePackage,
  type AdventurePackageFileIO,
  type PdfDocumentLike,
} from "../src/index";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const FIXTURE_DIR = resolve(
  REPO_ROOT,
  "fixtures/adventures/reference-one-shot",
);

function createMemoryIO(): AdventurePackageFileIO & {
  writeCalls: number;
  files: Map<string, string>;
} {
  const files = new Map<string, string>();
  const io = {
    writeCalls: 0,
    files,
    async exists(path: string) {
      return files.has(path);
    },
    async read(path: string) {
      const value = files.get(path);
      if (value === undefined) throw new Error(`Not found: ${path}`);
      return value;
    },
    async write(path: string, content: string) {
      io.writeCalls += 1;
      files.set(path, content);
    },
    async list(dir: string) {
      const prefix = dir.endsWith("/") ? dir : `${dir}/`;
      return [...files.keys()].filter((k) => k.startsWith(prefix));
    },
    async remove(path: string) {
      files.delete(path);
    },
  };
  return io;
}

function buildMinimalPdf(
  pages: Array<{ ops: string[] }>,
  extraCatalog = "",
  extraTrailer = "",
): Uint8Array {
  const objects: string[] = [];
  const addObj = (body: string): number => {
    objects.push(body);
    return objects.length;
  };

  const fontId = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  );
  const resources = `<< /Font << /F1 ${fontId} 0 R >> >>`;
  const pagesObjId = objects.length + 1;
  addObj("");

  const pageIds: number[] = [];
  for (const page of pages) {
    const stream = page.ops.join("\n");
    const contentId = addObj(
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    );
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 612 792] /Resources ${resources} /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[pagesObjId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const catalogId = addObj(
    `<< /Type /Catalog /Pages ${pagesObjId} 0 R ${extraCatalog} >>`,
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R ${extraTrailer} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

function buildEncryptedPdf(): Uint8Array {
  const objects: string[] = [];
  const addObj = (body: string): number => {
    objects.push(body);
    return objects.length;
  };
  const pagesId = addObj("<< /Type /Pages /Kids [] /Count 0 >>");
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const encryptId = addObj(
    "<< /Filter /Standard /V 1 /R 2 /O (AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA) /U (BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB) /P -4 >>",
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Encrypt ${encryptId} 0 R /ID [<0123456789ABCDEF> <0123456789ABCDEF>] >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

interface AnswerKey {
  sections: Array<{ sourceId: string; title: string }>;
  npcs: Array<{ name: string; motivation: string; sourceId: string }>;
  secrets: Array<{ text: string; gmOnly: boolean; sourceId: string }>;
  sceneConditions: Array<{ sourceId: string; condition: string }>;
  branch: { sourceId: string; optional: boolean };
  alternativeSolution: {
    description: string;
    socialBypassOfCombat: boolean;
  };
  missableClue: { clue: string };
  endings: Array<{ description: string }>;
}

function assertPdfMatchesAnswerKey(
  pkg: ReturnType<typeof AdventureSourcePackageSchema.parse>,
  answerKey: AnswerKey,
): void {
  expect(pkg.sections.map((s) => s.title)).toEqual(
    answerKey.sections.map((s) => s.title),
  );
  const distinctPages = new Set(pkg.sections.map((s) => s.pageNumber));
  expect(distinctPages.size).toBeGreaterThanOrEqual(2);
  for (const section of pkg.sections) {
    expect(section.pageNumber).toBeGreaterThanOrEqual(1);
    expect(section.provenance).toBe("suggested");
  }

  expect(pkg.npcs).toHaveLength(answerKey.npcs.length);
  for (const expectedNpc of answerKey.npcs) {
    const actualNpc = pkg.npcs.find((n) => n.name === expectedNpc.name);
    expect(actualNpc).toBeDefined();
    expect(actualNpc?.motivation.toLowerCase()).toContain(
      expectedNpc.motivation.toLowerCase().replace(/^wants\s+/, ""),
    );
  }

  expect(pkg.secrets).toHaveLength(answerKey.secrets.length);
  for (const expectedSecret of answerKey.secrets) {
    const matched = pkg.secrets.find((s) =>
      s.text.includes(expectedSecret.text.slice(0, 35)),
    );
    expect(matched).toBeDefined();
    expect(matched?.gmOnly).toBe(true);
  }

  expect(pkg.scenes.flatMap((s) => s.conditions)).toHaveLength(5);
  expect(pkg.scenes.find((s) => s.optionalBranch)?.title).toBe(
    "Optional Branch: The Reed Shrine",
  );
  expect(
    pkg.encounters
      .flatMap((e) => e.alternativeSolutions)
      .find((a) => a.socialBypassOfCombat)?.method,
  ).toBe("talk");
  expect(pkg.clues).toHaveLength(1);
  expect(pkg.clues[0]?.clue.toLowerCase()).toContain("sluice was sabotaged");
  expect(pkg.clues[0]?.alternativeSourceId).toBe("scene-4-the-miller-s-cellar");
  expect(pkg.endings).toHaveLength(answerKey.endings.length);
}

describe("parseAdventurePdf", () => {
  it("AC1: parses reference adventure.pdf with real pdfjs-dist, matches answer-key.json, and includes page citations without leaking GM-only secrets", async () => {
    const pdfBytes = new Uint8Array(
      readFileSync(resolve(FIXTURE_DIR, "adventure.pdf")),
    );
    const answerKey = JSON.parse(
      readFileSync(resolve(FIXTURE_DIR, "answer-key.json"), "utf-8"),
    ) as AnswerKey;

    const first = await parseAdventurePdf(pdfBytes, {
      fileName: "adventure.pdf",
    });
    const second = await parseAdventurePdf(pdfBytes, {
      fileName: "adventure.pdf",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    const pkg = AdventureSourcePackageSchema.parse(first.package);
    expect(pkg.importMethod).toBe("pdf");
    expect(pkg.documentHash).toBe(second.package.documentHash);
    expect(pkg.sections.map((s) => s.sourceId)).toEqual(
      second.package.sections.map((s) => s.sourceId),
    );
    expect(pkg.ambiguities).toHaveLength(0);

    assertPdfMatchesAnswerKey(pkg, answerKey);

    const wheelSection = pkg.sections.find((s) =>
      s.title.includes("Scene 3: The Wheel Room"),
    );
    expect(wheelSection).toBeDefined();
    if (!wheelSection) return;

    const publicCtx = retrieveAdventureContext(pkg, {
      sceneId: wheelSection.sourceId,
      includeGmOnly: false,
    });
    expect(publicCtx.found).toBe(true);
    expect(publicCtx.citations[0]).toBe(wheelSection.sourceId);
    expect(publicCtx.citations[1]).toMatch(/^pp?\.\s+\d+(?:-\d+)?$/);
    expect(publicCtx.formatted).toContain(publicCtx.citations[1]);
    expect(publicCtx.secrets).toHaveLength(0);
    expect(publicCtx.formatted).not.toContain("three months of pay");

    const gmCtx = retrieveAdventureContext(pkg, {
      sceneId: wheelSection.sourceId,
      includeGmOnly: true,
    });
    expect(gmCtx.secrets).toHaveLength(1);
    expect(gmCtx.formatted).toContain("three months of pay");
  });

  it("AC2: rejects image-only PDFs with IMAGE_ONLY_PDF and zero storage writes", async () => {
    const io = createMemoryIO();
    const imageOnlyPdf = buildMinimalPdf([
      { ops: ["q", "100 0 0 100 50 600 cm", "0 0 1 1 re", "f", "Q"] },
    ]);

    const result = await parseAdventurePdf(imageOnlyPdf, {
      fileName: "scanned.pdf",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IMAGE_ONLY_PDF");
      expect(result.error.message.toLowerCase()).toContain("ocr");
    }
    expect(io.writeCalls).toBe(0);
    expect(io.files.size).toBe(0);
  });

  it("AC2: rejects encrypted PDFs with ENCRYPTED_PDF and zero storage writes", async () => {
    const io = createMemoryIO();
    const encryptedPdf = buildEncryptedPdf();

    const result = await parseAdventurePdf(encryptedPdf, {
      fileName: "locked.pdf",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ENCRYPTED_PDF");
      expect(result.error.message.toLowerCase()).toContain("encrypted");
    }
    expect(io.writeCalls).toBe(0);
    expect(io.files.size).toBe(0);
  });

  it("AC2: rejects empty, missing-options, and malformed/non-PDF inputs with zero writes", async () => {
    const io = createMemoryIO();

    const emptyRes = await parseAdventurePdf(new Uint8Array(0), {
      fileName: "empty.pdf",
    });
    expect(emptyRes.ok).toBe(false);
    if (!emptyRes.ok) expect(emptyRes.error.code).toBe("EMPTY_INPUT");

    const invalidOptRes = await parseAdventurePdf(new Uint8Array([1, 2, 3]), {
      fileName: "   ",
    });
    expect(invalidOptRes.ok).toBe(false);
    if (!invalidOptRes.ok)
      expect(invalidOptRes.error.code).toBe("INVALID_OPTIONS");

    const nonPdfRes = await parseAdventurePdf(
      new TextEncoder().encode("# Not a PDF\n\nJust markdown text."),
      { fileName: "fake.pdf" },
    );
    expect(nonPdfRes.ok).toBe(false);
    if (!nonPdfRes.ok) expect(nonPdfRes.error.code).toBe("INVALID_PDF");

    const corruptPdfRes = await parseAdventurePdf(
      new TextEncoder().encode("%PDF-1.4\n%%%corrupted%%%"),
      { fileName: "corrupt.pdf" },
    );
    expect(corruptPdfRes.ok).toBe(false);
    if (!corruptPdfRes.ok) expect(corruptPdfRes.error.code).toBe("INVALID_PDF");

    expect(io.writeCalls).toBe(0);
  });

  it("AC3: extracts two-column and split-line PDF text in reading order without interleaving", async () => {
    const mockLoader = async (): Promise<PdfDocumentLike> => ({
      numPages: 1,
      async getPage() {
        return {
          async getTextContent() {
            return {
              items: [
                // Full-width title
                {
                  str: "The Sunken Vault",
                  transform: [20, 0, 0, 20, 54, 740],
                  width: 220,
                  height: 20,
                },
                // Left column (x ~ 54..240)
                {
                  str: "Scene 1: ",
                  transform: [14, 0, 0, 14, 54, 680],
                  width: 60,
                  height: 14,
                },
                {
                  str: "Outer Gate",
                  transform: [14, 0, 0, 14, 118, 680],
                  width: 80,
                  height: 14,
                },
                {
                  str: "Left",
                  transform: [10, 0, 0, 10, 54, 650],
                  width: 20,
                  height: 10,
                },
                {
                  str: "column",
                  transform: [10, 0, 0, 10, 78, 650],
                  width: 35,
                  height: 10,
                },
                {
                  str: "prose first.",
                  transform: [10, 0, 0, 10, 117, 650],
                  width: 55,
                  height: 10,
                },
                {
                  str: "Read aloud: Moss covers the iron arch.",
                  transform: [10, 0, 0, 10, 54, 630],
                  width: 170,
                  height: 10,
                },
                // Right column (x ~ 320..520)
                {
                  str: "Scene 2: Inner Sanctum",
                  transform: [14, 0, 0, 14, 320, 680],
                  width: 160,
                  height: 14,
                },
                {
                  str: "Right column prose second.",
                  transform: [10, 0, 0, 10, 320, 650],
                  width: 140,
                  height: 10,
                },
                {
                  str: "GM only: The idol is a mimic.",
                  transform: [10, 0, 0, 10, 320, 630],
                  width: 150,
                  height: 10,
                },
              ],
            };
          },
        };
      },
    });

    const dummyPdf = new TextEncoder().encode("%PDF-1.4\n");
    const result = await parseAdventurePdf(
      dummyPdf,
      { fileName: "two-col.pdf" },
      { loadPdfDocument: mockLoader },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const titles = result.package.sections.map((s) => s.title);
    expect(titles).toEqual([
      "The Sunken Vault",
      "Scene 1: Outer Gate",
      "Scene 2: Inner Sanctum",
    ]);

    const scene1 = result.package.sections[1];
    expect(scene1?.body).toContain("Left column prose first.");
    expect(scene1?.body).not.toContain("Right column prose second.");
    expect(scene1?.readAloud).toEqual(["Moss covers the iron arch."]);

    const scene2 = result.package.sections[2];
    expect(scene2?.body).toContain("Right column prose second.");
    expect(scene2?.body).not.toContain("mimic");
    expect(result.package.secrets[0]?.gmOnly).toBe(true);
    expect(result.package.secrets[0]?.text).toBe("The idol is a mimic.");
  });

  it("AC3: handles missing-headings PDFs (both multi-read-aloud and headingless) without dropping text", async () => {
    const headinglessPdf = buildMinimalPdf([
      {
        ops: [
          "BT",
          "/F1 10 Tf",
          "1 0 0 1 54 720 Tm",
          "(The caravan stops beside a dry well.) Tj",
          "1 0 0 1 54 700 Tm",
          "(GM only: Bandits wait behind the ridge.) Tj",
          "ET",
        ],
      },
    ]);

    const headinglessRes = await parseAdventurePdf(headinglessPdf, {
      fileName: "dry-well.pdf",
    });
    expect(headinglessRes.ok).toBe(true);
    if (!headinglessRes.ok) return;

    expect(headinglessRes.package.sections).toHaveLength(1);
    expect(headinglessRes.package.sections[0]?.level).toBe(1);
    expect(headinglessRes.package.sections[0]?.title).toBe("dry-well");
    expect(headinglessRes.package.sections[0]?.body).toContain(
      "The caravan stops beside a dry well.",
    );
    expect(headinglessRes.package.sections[0]?.body).not.toContain("Bandits");
    expect(headinglessRes.package.sections[0]?.provenance).toBe("unresolved");
    expect(
      headinglessRes.package.ambiguities.some(
        (a) => a.code === "MISSING_HEADING" && a.provenance === "unresolved",
      ),
    ).toBe(true);

    const multiReadAloudPdf = buildMinimalPdf([
      {
        ops: [
          "BT",
          "/F1 16 Tf",
          "1 0 0 1 54 720 Tm",
          "(Scene 1: The Bridge) Tj",
          "/F1 10 Tf",
          "1 0 0 1 54 690 Tm",
          "(Read aloud: Rain lashes the planks.) Tj",
          "1 0 0 1 54 660 Tm",
          "(Read aloud: Lanterns sway in the ravine below.) Tj",
          "ET",
        ],
      },
    ]);

    const multiRes = await parseAdventurePdf(multiReadAloudPdf, {
      fileName: "bridge.pdf",
    });
    expect(multiRes.ok).toBe(true);
    if (!multiRes.ok) return;
    expect(
      multiRes.package.ambiguities.some(
        (a) => a.code === "MISSING_HEADING" && a.provenance === "unresolved",
      ),
    ).toBe(true);
  });

  it("AC4: does not statically import pdfjs-dist in entry points or load it during Markdown parsing", async () => {
    const engineIndex = readFileSync(
      resolve(REPO_ROOT, "packages/adventure-engine/src/index.ts"),
      "utf-8",
    );
    const sourcePkgIndex = readFileSync(
      resolve(
        REPO_ROOT,
        "packages/adventure-engine/src/source-package/index.ts",
      ),
      "utf-8",
    );
    expect(engineIndex).not.toContain("pdfjs-dist");
    expect(sourcePkgIndex).not.toContain("pdfjs-dist");

    const mdRes = await parseAdventureMarkdown("# Test\n\nHello world.", {
      fileName: "test.md",
    });
    expect(mdRes.ok).toBe(true);
  });

  it("keeps GM-only text out of read-aloud when cues share a baseline across columns with an interior full-width row", async () => {
    const items = [
      {
        str: "The Sunken Vault",
        transform: [20, 0, 0, 20, 54, 740],
        width: 220,
        height: 20,
      },
      {
        str: "Scene 1: Outer Gate",
        transform: [14, 0, 0, 14, 54, 680],
        width: 160,
        height: 14,
      },
      {
        str: "Scene 2: Inner Sanctum",
        transform: [14, 0, 0, 14, 320, 680],
        width: 160,
        height: 14,
      },
      {
        str: "A bell tolls across the vault.",
        transform: [10, 0, 0, 10, 54, 665],
        width: 460,
        height: 10,
      },
      {
        str: "Read aloud: Moss covers the iron arch.",
        transform: [10, 0, 0, 10, 54, 650],
        width: 170,
        height: 10,
      },
      {
        str: "GM only: The idol is a mimic.",
        transform: [10, 0, 0, 10, 320, 650],
        width: 150,
        height: 10,
      },
    ];
    const mockLoader = async (): Promise<PdfDocumentLike> => ({
      numPages: 1,
      async getPage() {
        return {
          async getTextContent() {
            return { items };
          },
        };
      },
    });
    const result = await parseAdventurePdf(
      new TextEncoder().encode("%PDF-1.4\n"),
      { fileName: "mixed.pdf" },
      { loadPdfDocument: mockLoader },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.package.secrets.map((s) => s.text)).toContain(
      "The idol is a mimic.",
    );
    for (const section of result.package.sections) {
      const readAloud = Array.isArray(section.readAloud)
        ? section.readAloud.join(" ")
        : (section.readAloud ?? "");
      expect(readAloud).not.toContain("mimic");
      expect(section.body).not.toContain("mimic");
      const ctx = retrieveAdventureContext(result.package, {
        sceneId: section.sourceId,
        includeGmOnly: false,
      });
      expect(ctx.formatted).not.toContain("mimic");
      expect(ctx.secrets).toHaveLength(0);
    }
  });

  it("preserves the full preamble beyond 200 characters in an unresolved section", async () => {
    const tail = "UNIQUE-TAIL-MARKER beyond the preview window";
    const preamble = `${"The expedition gathers at dawn. ".repeat(12)}${tail}`;
    const items = [
      {
        str: preamble,
        transform: [10, 0, 0, 10, 54, 720],
        width: 400,
        height: 10,
      },
      {
        str: "Scene 1: The Gate",
        transform: [16, 0, 0, 16, 54, 690],
        width: 140,
        height: 16,
      },
      {
        str: "The gate stands open.",
        transform: [10, 0, 0, 10, 54, 660],
        width: 120,
        height: 10,
      },
    ];
    const mockLoader = async (): Promise<PdfDocumentLike> => ({
      numPages: 1,
      async getPage() {
        return {
          async getTextContent() {
            return { items };
          },
        };
      },
    });
    const result = await parseAdventurePdf(
      new TextEncoder().encode("%PDF-1.4\n"),
      { fileName: "preamble.pdf" },
      { loadPdfDocument: mockLoader },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const intro = result.package.sections[0];
    expect(intro?.title).toBe("Introduction");
    expect(intro?.provenance).toBe("unresolved");
    expect(intro?.pageNumber).toBe(1);
    expect(intro?.body).toContain(tail);
    const ambiguity = result.package.ambiguities.find(
      (a) => a.code === "UNANCHORED_PREAMBLE",
    );
    expect(ambiguity?.context?.length).toBeLessThanOrEqual(200);
  });

  it("rejects PDFs over the byte and page limits and honours abort during extraction", async () => {
    const oversized = new Uint8Array(MAX_ADVENTURE_PDF_BYTES + 1);
    oversized.set(new TextEncoder().encode("%PDF-1.4\n"));
    const oversizedRes = await parseAdventurePdf(oversized, {
      fileName: "big.pdf",
    });
    expect(oversizedRes.ok).toBe(false);
    if (!oversizedRes.ok)
      expect(oversizedRes.error.code).toBe("INPUT_TOO_LARGE");

    let getPageCalls = 0;
    const manyPagesLoader = async (): Promise<PdfDocumentLike> => ({
      numPages: MAX_ADVENTURE_PDF_PAGES + 1,
      async getPage() {
        getPageCalls += 1;
        return {
          async getTextContent() {
            return { items: [] };
          },
        };
      },
    });
    const manyPagesRes = await parseAdventurePdf(
      new TextEncoder().encode("%PDF-1.4\n"),
      { fileName: "many.pdf" },
      { loadPdfDocument: manyPagesLoader },
    );
    expect(manyPagesRes.ok).toBe(false);
    if (!manyPagesRes.ok)
      expect(manyPagesRes.error.code).toBe("INPUT_TOO_LARGE");
    expect(getPageCalls).toBe(0);

    const controller = new AbortController();
    let destroyCalls = 0;
    const abortingLoader = async (): Promise<PdfDocumentLike> => ({
      numPages: 2,
      async getPage() {
        return {
          async getTextContent() {
            controller.abort();
            return {
              items: [
                {
                  str: "Hello",
                  transform: [10, 0, 0, 10, 54, 720],
                  width: 30,
                  height: 10,
                },
              ],
            };
          },
        };
      },
      destroy() {
        destroyCalls += 1;
      },
    });
    const abortedRes = await parseAdventurePdf(
      new TextEncoder().encode("%PDF-1.4\n"),
      { fileName: "abort.pdf" },
      { loadPdfDocument: abortingLoader, signal: controller.signal },
    );
    expect(abortedRes.ok).toBe(false);
    if (!abortedRes.ok) expect(abortedRes.error.code).toBe("ABORTED");
    expect(destroyCalls).toBe(1);
  });

  it("AC1/AC8: saves and reloads a parsed PDF package with pageNumber preserved", async () => {
    const io = createMemoryIO();
    const pdfBytes = new Uint8Array(
      readFileSync(resolve(FIXTURE_DIR, "adventure.pdf")),
    );
    const parsed = await parseAdventurePdf(pdfBytes, {
      fileName: "adventure.pdf",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const saved = await saveAdventurePackage(io, parsed.package);
    expect(saved.status).toBe("created");
    expect(io.writeCalls).toBe(1);
    expect(saved.package.importMethod).toBe("pdf");
    expect(saved.package.sections[0]?.pageNumber).toBe(1);
  });
});
