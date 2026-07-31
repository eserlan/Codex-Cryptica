export const validTemplatePackage = {
  schemaVersion: 1,
  template: {
    name: "Night Watch",
    description: "A compact watch template.",
    system: "Homebrew",
    labels: ["npc"],
    fields: [
      { id: "section", label: "Combat", type: "heading" },
      { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 20 },
      { id: "attack", label: "Attack", type: "dice", formula: "1d20+3" },
    ],
  },
};

export const privateDataTemplatePackage = {
  ...validTemplatePackage,
  template: {
    ...validTemplatePackage.template,
    fields: [
      ...validTemplatePackage.template.fields,
      { id: "secret", label: "Secret", type: "text", value: "private" },
    ],
  },
};

export const legacyTemplatePackage = {
  schemaVersion: 1,
  template: {
    ...validTemplatePackage.template,
    name: "Legacy Watch",
    fields: [{ id: "title", label: "Title", type: "text" }],
  },
};
