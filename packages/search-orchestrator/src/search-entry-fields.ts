type SearchEntryEntity = {
  labels?: unknown;
  tags?: unknown;
  lore?: unknown;
  metadata?: unknown;
  aliases?: unknown;
};

const isNotNullish = (value: unknown): value is NonNullable<unknown> =>
  value !== null && value !== undefined;

const asString = (value: unknown): string =>
  typeof value === "string" ? value : String(value);

export function buildSearchKeywords(entity: SearchEntryEntity): string {
  const keywordBuffer: string[] = [];

  const labelsOrTags = entity.labels || entity.tags;
  if (Array.isArray(labelsOrTags)) {
    for (let i = 0; i < labelsOrTags.length; i++) {
      const tag = labelsOrTags[i];
      if (isNotNullish(tag)) {
        keywordBuffer.push(asString(tag));
      }
    }
  }

  if (isNotNullish(entity.lore)) {
    keywordBuffer.push(asString(entity.lore));
  }

  if (entity.metadata && typeof entity.metadata === "object") {
    const vals = Object.values(entity.metadata);
    for (let i = 0; i < vals.length; i++) {
      const val = vals[i];
      if (Array.isArray(val)) {
        for (let j = 0; j < val.length; j++) {
          const innerVal = val[j];
          if (isNotNullish(innerVal)) {
            keywordBuffer.push(asString(innerVal));
          }
        }
      } else if (isNotNullish(val)) {
        keywordBuffer.push(asString(val));
      }
    }
  }

  return keywordBuffer.join(" ");
}

export function buildSearchAliases(entity: SearchEntryEntity): string {
  if (!Array.isArray(entity.aliases)) return "";

  const aliasesBuffer: string[] = [];
  for (let i = 0; i < entity.aliases.length; i++) {
    const alias = entity.aliases[i];
    if (isNotNullish(alias)) {
      aliasesBuffer.push(asString(alias));
    }
  }

  return aliasesBuffer.join(" ");
}
