import { EntitySchema } from "schema";
import { load as yamlLoad } from "js-yaml";

const MarkdownFrontmatterSchema = EntitySchema.partial().passthrough();

export function validateMarkdownFrontmatter(text: string): {
  success: boolean;
  error?: unknown;
} {
  const frontmatterRegex = /^\s*---\r?\n([\s\S]*?)\r?\n---\s*/;
  const match = text.match(frontmatterRegex);

  if (match) {
    try {
      const yamlContent = match[1];
      const parsed = yamlLoad(yamlContent) ?? {};

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
