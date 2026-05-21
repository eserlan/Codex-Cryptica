import fs from "fs";
import path from "path";

const BUILD_DIR = path.resolve("build");

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const runes = ["\\$state", "\\$derived", "\\$effect", "\\$props", "\\$inspect"];
const runesRegex = new RegExp(`(?<![\\w$])(${runes.join("|")})(?![\\w$])`, "g");

let foundErrors = false;

if (!fs.existsSync(BUILD_DIR)) {
  console.error(
    `Build directory not found at: ${BUILD_DIR}. Please run build first.`,
  );
  process.exit(1);
}

walkDir(BUILD_DIR, (filePath) => {
  if (path.extname(filePath) !== ".js") return;
  // Svelte's own library/runtime code (which runs on the client/main thread) contains
  // literal strings and symbols like Symbol("$state") and Ia=["$state",...].
  // We only scan worker scripts because workers do not load the Svelte runtime
  // and will throw runtime ReferenceErrors if Svelte runes bleed into them.
  if (!filePath.includes("/workers/")) return;

  const content = fs.readFileSync(filePath, "utf8");
  let match;
  while ((match = runesRegex.exec(content)) !== null) {
    foundErrors = true;
    const index = match.index;
    const lineNum = content.substring(0, index).split("\n").length;
    const context = content
      .substring(Math.max(0, index - 40), Math.min(content.length, index + 40))
      .replace(/\n/g, " ");
    console.error(
      `❌ [Error] Found uncompiled Svelte 5 rune "${match[0]}" in compiled file:`,
    );
    console.error(`   File: ${filePath}:${lineNum}`);
    console.error(`   Context: "...${context}..."\n`);
  }
});

if (foundErrors) {
  console.error(
    "Build check failed: Uncompiled Svelte 5 runes were found in the production build output!",
  );
  console.error(
    "This will cause fatal runtime errors (e.g., in Web Worker threads).",
  );
  process.exit(1);
} else {
  console.log(
    "✅ Build verification complete: No uncompiled Svelte 5 runes found in client assets!",
  );
  process.exit(0);
}
