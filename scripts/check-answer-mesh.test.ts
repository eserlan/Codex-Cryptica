import { describe, expect, test } from "bun:test";
import {
  analyzeAnswerMesh,
  fixMissingReciprocalLinks,
  type MeshFinding,
} from "./check-answer-mesh";
import type { AnswerConfigInput } from "../apps/web/src/lib/content/answers/schema";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("analyzeAnswerMesh", () => {
  test("identifies reciprocal and missing reciprocal links", () => {
    const mockRegistry: Record<string, AnswerConfigInput> = {
      "page-a": {
        slug: "page-a",
        category: "session-prep",
        question: "What is A?",
        kind: "definition",
        shortAnswer: "A is a valid testing page with sufficient content.",
        sections: [{ kind: "prose", paragraphs: ["Sample content"] }],
        relatedAnswers: ["page-b"],
        seo: { title: "Page A", description: "Desc A" },
      },
      "page-b": {
        slug: "page-b",
        category: "session-prep",
        question: "What is B?",
        kind: "definition",
        shortAnswer: "B is a valid testing page with sufficient content.",
        sections: [{ kind: "prose", paragraphs: ["Sample content"] }],
        relatedAnswers: ["page-a", "page-c"],
        seo: { title: "Page B", description: "Desc B" },
      },
      "page-c": {
        slug: "page-c",
        category: "session-prep",
        question: "What is C?",
        kind: "definition",
        shortAnswer: "C is a valid testing page with sufficient content.",
        sections: [{ kind: "prose", paragraphs: ["Sample content"] }],
        relatedAnswers: [],
        seo: { title: "Page C", description: "Desc C" },
      },
    };

    const result = analyzeAnswerMesh(mockRegistry);

    // Page A <-> Page B is reciprocal
    expect(result.reciprocalCount).toBe(1);

    // Page B -> Page C, but Page C does not link to Page B
    expect(result.missingReciprocal.length).toBe(1);
    expect(result.missingReciprocal[0].sourceSlug).toBe("page-b");
    expect(result.missingReciprocal[0].targetSlug).toBe("page-c");
  });

  test("detects broken links to non-existent answer pages", () => {
    const mockRegistry: Record<string, AnswerConfigInput> = {
      "page-a": {
        slug: "page-a",
        category: "session-prep",
        question: "What is A?",
        kind: "definition",
        shortAnswer: "A is a valid testing page with sufficient content.",
        sections: [{ kind: "prose", paragraphs: ["Sample content"] }],
        relatedAnswers: ["non-existent-page"],
        seo: { title: "Page A", description: "Desc A" },
      },
    };

    const result = analyzeAnswerMesh(mockRegistry);
    expect(result.brokenLinks.length).toBe(1);
    expect(result.brokenLinks[0].targetSlug).toBe("non-existent-page");
  });

  test("detects alias conflicts with other answers' primary intents", () => {
    const mockRegistry: Record<string, AnswerConfigInput> = {
      "page-a": {
        slug: "page-a",
        category: "session-prep",
        question: "How do you prep?",
        kind: "definition",
        shortAnswer: "A is a valid testing page with sufficient content.",
        sections: [{ kind: "prose", paragraphs: ["Sample content"] }],
        discovery: {
          parentCluster: "session-prep",
          intentAliases: ["how to build a point crawl"],
        },
        seo: { title: "Page A", description: "Desc A" },
      },
      "page-b": {
        slug: "page-b",
        category: "session-prep",
        question: "How to build a point crawl?",
        kind: "definition",
        shortAnswer: "B is a valid testing page with sufficient content.",
        sections: [{ kind: "prose", paragraphs: ["Sample content"] }],
        discovery: {
          parentCluster: "session-prep",
          primaryIntent: "how to build a point crawl",
        },
        seo: { title: "Page B", description: "Desc B" },
      },
    };

    const result = analyzeAnswerMesh(mockRegistry);
    expect(result.aliasConflicts.length).toBe(1);
    expect(result.aliasConflicts[0].sourceSlug).toBe("page-a");
    expect(result.aliasConflicts[0].targetSlug).toBe("page-b");
  });
});

describe("fixMissingReciprocalLinks", () => {
  test("appends missing reciprocal links into target answer files", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mesh-test-"));
    try {
      const pageCContent = `import type { AnswerConfigInput } from "../schema";

export const pageC: AnswerConfigInput = {
  slug: "page-c",
  category: "session-prep",
  question: "What is C?",
  kind: "definition",
  shortAnswer: "C is a valid testing page with sufficient content.",
  sections: [{ kind: "prose", paragraphs: ["Sample content"] }],
  relatedAnswers: [
    "existing-link",
  ],
  seo: { title: "Page C", description: "Desc C" },
};
`;
      fs.writeFileSync(path.join(tempDir, "page-c.ts"), pageCContent, "utf-8");

      const findings: MeshFinding[] = [
        {
          type: "missing-reciprocal",
          sourceSlug: "page-b",
          targetSlug: "page-c",
          message: "test",
        },
      ];

      const fixResult = fixMissingReciprocalLinks(findings, tempDir);
      expect(fixResult.fixed).toBe(1);

      const updated = fs.readFileSync(path.join(tempDir, "page-c.ts"), "utf-8");
      expect(updated).toContain('"page-b"');
      expect(updated).toContain('"existing-link"');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
