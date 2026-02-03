import type { FileParser, ParseResult } from '../types';

// Ensure worker is set up (though in browser env this might need CDN or local build)
// For Node/Test env we might skip this or polyfill.
// pdfjs.GlobalWorkerOptions.workerSrc = '...';

export class PdfParser implements FileParser {
  accepts(file: File): boolean {
    return file.type === 'application/pdf' || file.name.endsWith('.pdf');
  }

  async parse(file: File): Promise<ParseResult> {
    const pdfjs = await import('pdfjs-dist');
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const loadingTask = pdfjs.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    
    let text = '';
    const metadata: Record<string, any> = {
      numPages: pdf.numPages
    };

    // Sequential page extraction to maintain order
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      text += pageText + '\n\n';
    }

    return {
      text: text.trim(),
      assets: [], // PDF image extraction is complex, skipped for MVP as per plan/research (text layer only)
      metadata
    };
  }
}
