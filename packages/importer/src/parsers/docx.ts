import type { FileParser, ParseResult, ImportAsset } from '../types';

export class DocxParser implements FileParser {
  // private turndown: TurndownService; // Remove static type dependency if possible, or use 'any' for lazy

  constructor() {
    // Lazy init in parse
  }

  accepts(file: File): boolean {
    return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx');
  }

  async parse(file: File): Promise<ParseResult> {
    // Dynamic Imports for Optimization
    const mammoth = await import('mammoth');
    const TurndownService = (await import('turndown')).default;

    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });

    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const assets: ImportAsset[] = [];

    // 1. Extract raw content to HTML using Mammoth with Image Handler
    const { value: html, messages } = await mammoth.convertToHtml(
      { arrayBuffer: arrayBuffer as any },
      {
        ignoreEmptyParagraphs: true,
        includeDefaultStyleMap: true,
        convertImage: (mammoth.images as any).inline((element: any) => {
          return element.read().then(async (buffer: any) => {
            const blob = new Blob([buffer], { type: element.contentType });
            const id = crypto.randomUUID();
            const filename = `image-${id}.${element.contentType.split('/')[1]}`;

            // Detect dimensions
            let width: number | undefined;
            let height: number | undefined;
            try {
              const url = URL.createObjectURL(blob);
              const img = new Image();
              img.src = url;
              await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              });
              width = img.naturalWidth;
              height = img.naturalHeight;
              URL.revokeObjectURL(url);
            } catch (e) {
              console.warn("Failed to detect image dimensions", e);
            }

            assets.push({
              id,
              originalName: filename,
              blob,
              mimeType: element.contentType,
              placementRef: filename,
              width,
              height
            });

            // Return the src that will be put into the <img> tag
            // Turndown will keep this as ![](src)
            return { src: filename };
          });
        })
      }
    );

    // 2. Convert HTML to Markdown for token-efficient Oracle input
    const text = turndown.turndown(html);

    const metadata = {
      messages: messages.map(m => m.message)
    };

    return {
      text,
      assets,
      metadata
    };
  }
}
