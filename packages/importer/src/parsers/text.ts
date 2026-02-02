import type { FileParser, ParseResult } from '../types';

export class TextParser implements FileParser {
  accepts(file: File): boolean {
    return file.type === 'text/plain' ||
      file.type === 'text/markdown' ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md');
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
      metadata: {}
    };
  }
}
