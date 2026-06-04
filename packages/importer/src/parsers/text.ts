import type { FileParser, ParseResult } from "../types";
import { isSupportedTextImportExtension } from "../utils/validation";

export class TextParser implements FileParser {
  accepts(file: File): boolean {
    return isSupportedTextImportExtension(file.name);
  }

  async parse(file: File): Promise<ParseResult> {
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });

    return {
      text,
      assets: [],
      metadata: {},
    };
  }
}
