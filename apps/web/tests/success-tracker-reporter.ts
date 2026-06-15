import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import fs from "fs";
import path from "path";

export default class SuccessTrackerReporter implements Reporter {
  private failedFiles = new Set<string>();
  private passedFiles = new Set<string>();

  onTestEnd(test: TestCase, result: TestResult) {
    // Normalize relative path of test file
    const relativePath = path.relative(process.cwd(), test.location.file);
    if (result.status !== "passed" && result.status !== "skipped") {
      this.failedFiles.add(relativePath);
    } else if (result.status === "passed") {
      this.passedFiles.add(relativePath);
    }
  }

  async onEnd(_result: FullResult) {
    const cachePath = path.join(process.cwd(), ".e2e-success.json");
    let successfulFiles: string[] = [];

    if (fs.existsSync(cachePath)) {
      try {
        successfulFiles = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      } catch {
        successfulFiles = [];
      }
    }

    // A file is successful if it has passed tests and no failed tests in this run
    const newSuccesses = Array.from(this.passedFiles).filter(
      (file) => !this.failedFiles.has(file),
    );

    // Merge with existing success list
    const updatedSuccesses = Array.from(
      new Set([...successfulFiles, ...newSuccesses]),
    );

    // If there are failures in a file that was previously marked successful, remove it
    const finalSuccesses = updatedSuccesses.filter(
      (file) => !this.failedFiles.has(file),
    );

    fs.writeFileSync(
      cachePath,
      JSON.stringify(finalSuccesses, null, 2),
      "utf-8",
    );
    console.log(
      `\n[SuccessTracker] Saved ${finalSuccesses.length} successful test files to .e2e-success.json`,
    );
  }
}
