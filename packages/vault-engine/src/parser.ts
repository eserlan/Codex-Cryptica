import { EntitySchema } from "schema";
import * as yaml from "js-yaml";

const MarkdownFrontmatterSchema = EntitySchema.partial()
  .omit({ tags: true })
  .passthrough()
  .refine((data) => !("tags" in data), {
    message: "Use labels instead of tags in imported frontmatter",
    path: ["tags"],
  });

export function validateMarkdownFrontmatter(text: string): {
  success: boolean;
  error?: unknown;
} {
  const frontmatterRegex = /^\s*---\r?\n([\s\S]*?)\r?\n---\s*/;
  const match = text.match(frontmatterRegex);

  if (match) {
    try {
      const yamlContent = match[1];
      const parsed = yaml.load(yamlContent) ?? {};

      const validationResult = MarkdownFrontmatterSchema.safeParse(parsed);
      if (!validationResult.success) {
        return { success: false, error: validationResult.error };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  return { success: true };
}
