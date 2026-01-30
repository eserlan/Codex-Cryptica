import { Extension, InputRule } from "@tiptap/core";

export interface WikiLinkOptions {
  onLinkCreated?: (linkText: string) => void;
}

export const WikiLink = Extension.create<WikiLinkOptions>({
  name: "wikiLink",

  addOptions() {
    return {
      onLinkCreated: undefined,
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ match }) => {
          const linkText = match[1];

          if (this.options.onLinkCreated) {
            this.options.onLinkCreated(linkText);
          }

          // We don't necessarily want to change the text here
          // yet, just detect the creation of a potential link
          return null;
        },
      }),
    ];
  },
});

export * from './parsing/oracle';
