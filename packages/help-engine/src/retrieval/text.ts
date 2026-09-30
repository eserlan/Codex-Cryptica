const STOPWORDS = new Set(
  (
    "a an and are as at be been but by can could did do does for from had has have how i if in into is it its " +
    "just me my of on or our should so some than that the their them then there these they this to up us was " +
    "we were what when where which who why will with would you your here page"
  ).split(" "),
);

/**
 * Words that mean the same thing for help purposes. Kept tiny on purpose.
 * "related" is deliberately absent: "Generate related entries" is a different
 * feature from connecting two entries, and folding them together sent
 * generator questions to the Connections help.
 */
const SYNONYMS: Record<string, string> = {
  link: "connect",
  linked: "connect",
  links: "connect",
  linking: "connect",
  entry: "entity",
  entries: "entity",
  entities: "entity",
  relationship: "connect",
  relationships: "connect",
};

const SUFFIXES = [
  "ations",
  "ation",
  "ions",
  "ion",
  "ings",
  "ing",
  "ed",
  "es",
  "s",
];

/** A deliberately simple stemmer; enough to match connect/connections/connecting. */
export function stem(word: string): string {
  let w = SYNONYMS[word] ?? word;
  for (const suffix of SUFFIXES) {
    if (w.length - suffix.length >= 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

/** Lower-cased content terms (stopwords removed, stemmed). */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}
