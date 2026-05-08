import fs from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, "apps/web/src/lib/content/blog");
const outputDir = path.join(repoRoot, "blog");

const frontmatterRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*([\s\S]*)$/;

const readArticles = () => {
  const files = fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  const articles = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(sourceDir, file), "utf8");
    const match = raw.match(frontmatterRegex);
    if (!match) {
      throw new Error(`Missing frontmatter in blog article: ${file}`);
    }

    const metadata = loadYaml(match[1]);
    if (!metadata || typeof metadata !== "object") {
      throw new Error(`Invalid frontmatter in blog article: ${file}`);
    }

    if (
      !metadata.id ||
      !metadata.slug ||
      !metadata.title ||
      !metadata.description ||
      !metadata.publishedAt
    ) {
      throw new Error(`Missing required fields in blog article: ${file}`);
    }

    articles.push({
      metadata: {
        id: String(metadata.id),
        slug: String(metadata.slug),
        title: String(metadata.title),
        description: String(metadata.description),
        publishedAt:
          metadata.publishedAt instanceof Date
            ? metadata.publishedAt.toISOString()
            : String(metadata.publishedAt),
      },
      raw,
    });
  }

  articles.sort(
    (a, b) =>
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime(),
  );

  return articles;
};

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const articles = readArticles();

for (const article of articles) {
  const filePath = path.join(outputDir, `${article.metadata.slug}.md`);
  fs.writeFileSync(filePath, article.raw, "utf8");
}

const index = articles.map(({ metadata }) => metadata);
fs.writeFileSync(
  path.join(outputDir, "index.json"),
  `${JSON.stringify(index, null, 2)}\n`,
  "utf8",
);
