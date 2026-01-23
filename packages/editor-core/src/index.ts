import { Extension } from '@tiptap/core';

export interface WikiLinkOptions {
  onLinkCreated?: (linkText: string) => void;
}

export const WikiLink = Extension.create<WikiLinkOptions>({
  name: 'wikiLink',

  addOptions() {
    return {
      onLinkCreated: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      // simplified plugin logic for detecting [[Link]]
      // Real implementation would use InputRules or Plugin keydown handlers
    ];
  },

  addInputRules() {
    return [
      // Rule to auto-convert [[Text]] to a link node would go here
    ];
  },
});
