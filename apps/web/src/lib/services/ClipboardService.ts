import { marked as defaultMarked } from "marked";
import defaultDOMPurify from "dompurify";
import type { Entity } from "schema";

const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i;

export interface SmartCopyContent {
  markdown: string;
  html?: string;
  imageBlob?: Blob;
}

type ClipboardLike = Partial<Pick<Clipboard, "write" | "writeText">>;
type ClipboardItemFactory = (data: Record<string, Blob>) => ClipboardItem;
type DomPurifyLike = {
  sanitize: (html: string, config?: Record<string, unknown>) => string;
};

export interface ClipboardDependencies {
  clipboard?: ClipboardLike;
  createClipboardItem?: ClipboardItemFactory;
  fetch?: typeof fetch;
  document?: Document;
  marked?: typeof defaultMarked;
  domPurify?: DomPurifyLike | typeof defaultDOMPurify;
}

function getDefaultClipboardItemFactory(): ClipboardItemFactory | undefined {
  if (typeof ClipboardItem === "undefined") return undefined;
  return (data) => new ClipboardItem(data);
}

export class ClipboardService {
  private readonly clipboard: ClipboardLike;
  private readonly createClipboardItem?: ClipboardItemFactory;
  private readonly fetch: typeof fetch;
  private readonly document: Document;
  private readonly marked: typeof defaultMarked;
  private readonly domPurify: DomPurifyLike;

  constructor(deps: ClipboardDependencies = {}) {
    this.clipboard =
      deps.clipboard ??
      (typeof navigator !== "undefined" ? navigator.clipboard : {});
    this.createClipboardItem =
      deps.createClipboardItem ?? getDefaultClipboardItemFactory();
    this.fetch =
      deps.fetch ??
      (typeof globalThis.fetch === "function"
        ? globalThis.fetch.bind(globalThis)
        : ({} as typeof fetch));
    this.document =
      deps.document ??
      (typeof document !== "undefined" ? document : ({} as Document));
    this.marked = deps.marked ?? defaultMarked;
    this.domPurify = this.resolveDomPurify(deps.domPurify ?? defaultDOMPurify);
  }

  async copyContent(content: SmartCopyContent): Promise<boolean> {
    try {
      if (
        !this.createClipboardItem ||
        typeof this.clipboard.write !== "function"
      ) {
        throw new Error("Rich clipboard writing is unavailable");
      }

      const rawHtml =
        content.html ?? String(await this.marked.parse(content.markdown));
      const html = this.sanitise(rawHtml);
      const clipboardData: Record<string, Blob> = {
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([content.markdown], { type: "text/plain" }),
      };

      if (content.imageBlob) clipboardData["image/png"] = content.imageBlob;

      await this.clipboard.write([this.createClipboardItem(clipboardData)]);
      return true;
    } catch (error) {
      console.error("[ClipboardService] Failed to copy rich content", error);
      return this.writePlainText(content.markdown);
    }
  }

  async copyEntity(
    entity: Entity,
    resolvedImageUrl?: string,
  ): Promise<boolean> {
    const title = entity.title || "Untitled";
    const chronicle = entity.content || "";
    const lore = entity.lore || "";
    const markdown = [
      title,
      "",
      "CHRONICLE:",
      chronicle,
      "",
      ...(lore ? ["DEEP LORE:", lore] : []),
    ].join("\n");

    let imageHtml = "";
    let imageBlob: Blob | undefined;

    if (resolvedImageUrl) {
      try {
        const response = await this.fetch(resolvedImageUrl);
        const originalBlob = await response.blob();
        const img = new Image();
        img.src = URL.createObjectURL(originalBlob);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Image could not be loaded"));
        });

        const canvas = this.document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        imageBlob =
          (await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png"),
          )) ?? undefined;
        imageHtml = `<img src="entity-image.png" alt="${this.escapeHtml(title)}" /><br/>`;
        URL.revokeObjectURL(img.src);
      } catch (error) {
        console.warn(
          "[ClipboardService] Could not process image for copy",
          error,
        );
      }
    }

    const chronicleHtml = String(await this.marked.parse(chronicle));
    const loreHtml = lore ? String(await this.marked.parse(lore)) : "";
    const html = [
      "<html><body>",
      `<h1>${this.escapeHtml(title)}</h1>`,
      imageHtml,
      "<h2>Chronicle</h2>",
      chronicleHtml,
      loreHtml ? "<h2>Deep Lore</h2>" : "",
      loreHtml,
      "</body></html>",
    ].join("");

    return this.copyContent({ markdown, html, imageBlob });
  }

  copyHtmlAndText(html: string, text: string): Promise<boolean> {
    return this.copyContent({ html, markdown: text });
  }

  private sanitise(html: string): string {
    return this.domPurify.sanitize(html, {
      ALLOWED_URI_REGEXP,
    });
  }

  private resolveDomPurify(
    candidate: DomPurifyLike | typeof defaultDOMPurify,
  ): DomPurifyLike {
    if (typeof candidate === "object" && candidate !== null) {
      return candidate as DomPurifyLike;
    }

    const ownerDocument = this.document.defaultView;
    if (!ownerDocument) {
      return { sanitize: (html: string) => html };
    }
    return candidate(ownerDocument as Parameters<typeof candidate>[0]);
  }

  private async writePlainText(text: string): Promise<boolean> {
    if (typeof this.clipboard.writeText !== "function") return false;
    try {
      await this.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error("[ClipboardService] Total copy failure", error);
      return false;
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export const clipboardService = new ClipboardService();
