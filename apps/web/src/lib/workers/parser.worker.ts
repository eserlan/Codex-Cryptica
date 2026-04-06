/// <reference lib="webworker" />

import { marked } from "marked";
import * as Comlink from "comlink";

export class ParserEngine {
  async parse(content: string): Promise<string> {
    return marked.parse(content) as string;
  }

  async parseInline(content: string): Promise<string> {
    return marked.parseInline(content) as string;
  }
}

Comlink.expose(new ParserEngine());
