import type { FileParser, ParseResult } from '../types';

export class JsonParser implements FileParser {
  accepts(file: File): boolean {
    return file.type === 'application/json' || file.name.endsWith('.json');
  }

  async parse(file: File): Promise<ParseResult> {
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });

    const metadata: Record<string, any> = {
      isStructured: true,
      isArray: false,
      itemCount: 0
    };

    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        metadata.isArray = true;
        metadata.itemCount = json.length;

        // Detect if this looks like a Midjourney or entity export
        const firstItem = json[0];
        if (firstItem && typeof firstItem === 'object') {
          metadata.hasEntityStructure = !!(firstItem.title || firstItem.name);
          metadata.hasImageUrls = json.some((item: any) => item.imageURL || item.imageUrl);
        }
      } else {
        metadata.itemCount = 1;
        if (json && typeof json === 'object') {
          metadata.hasImageUrls = !!(json.imageURL || json.imageUrl);
        }
      }
    } catch {
      metadata.isStructured = false;
      metadata.error = 'Invalid JSON';
    }

    return {
      text,
      assets: [],
      metadata
    };
  }
}
