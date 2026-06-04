import type { FileParser, ParseResult } from "../types";

const PDFJS_VERSION = "5.6.205";
const PDFJS_CDN = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_CDN = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export class PdfParser implements FileParser {
  private workerSrc: string;

  constructor(workerSrc?: string) {
    this.workerSrc = workerSrc || PDFJS_WORKER_CDN;
  }

  accepts(file: File): boolean {
    return file.type === "application/pdf" || file.name.endsWith(".pdf");
  }

  async parse(file: File): Promise<ParseResult> {
    const pdfjs = await import(/* @vite-ignore */ PDFJS_CDN);

    if (typeof window !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerSrc = this.workerSrc;
    }

    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const loadingTask = pdfjs.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;

    let text = "";
    const metadata: Record<string, any> = {
      numPages: pdf.numPages,
    };

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      text += textContent.items.map((item: any) => item.str).join(" ") + "\n\n";
    }

    return {
      text: text.trim(),
      assets: [],
      metadata,
    };
  }
}
