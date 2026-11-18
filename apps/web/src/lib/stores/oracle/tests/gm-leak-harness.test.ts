import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  MAX_ADVENTURE_RETRIEVAL_CHARS,
  retrieveAdventureJsonContext,
  validateAdventureJson,
} from "@codex/adventure-engine";
import { minimalPackage } from "./adventure-fixtures";
import { canaries, canaryReferencePackage } from "./gm-canary-fixture";
import {
  SHORT_NAME_ALLOWLIST,
  assertNoGmLeak,
  collectGmOnlyStrings,
} from "./gm-leak-harness";

const guarded = collectGmOnlyStrings(canaryReferencePackage);

describe("canary fixture", () => {
  it("is a valid package", () => {
    expect(() =>
      AdventureJsonV1Schema.parse(canaryReferencePackage),
    ).not.toThrow();
    const result = validateAdventureJson(canaryReferencePackage);
    expect(result.ok).toBe(true);
  });

  it("is not targeted by any scene branch", () => {
    const targets = canaryReferencePackage.scenes.flatMap((scene) =>
      (scene.branches ?? []).map((branch) => branch.targetSceneId),
    );
    expect(targets).not.toContain("canary-scene");
  });
});

describe("collectGmOnlyStrings", () => {
  it("returns nothing for the minimal package", () => {
    expect(collectGmOnlyStrings(minimalPackage)).toEqual([]);
  });

  it.each(canaries)(
    "guards the $type canary on its record and field",
    (canary) => {
      expect(guarded).toContainEqual({
        recordId: canary.recordId,
        field: canary.field,
        text: canary.token,
      });
    },
  );

  it("guards the rumour truth in both forms it can appear in", () => {
    const truths = guarded.filter(
      (entry) => entry.recordId === "canary-rumour" && entry.field === "truth",
    );
    expect(truths.map((entry) => entry.text)).toEqual([
      "Truth: false",
      '"truth":"false"',
    ]);
  });

  it("guards the truth verdict true even though its label is short", () => {
    const pkg = structuredClone(canaryReferencePackage);
    pkg.rumours = [{ ...pkg.rumours[0]!, id: "r-true", truth: "true" }];
    const truths = collectGmOnlyStrings(pkg)
      .filter((entry) => entry.recordId === "r-true" && entry.field === "truth")
      .map((entry) => entry.text);
    expect(truths).toEqual(["Truth: true", '"truth":"true"']);
    expect(() =>
      assertNoGmLeak(collectGmOnlyStrings(pkg), "Truth: true", "label"),
    ).toThrow(/r-true, field truth/);
  });

  it("guards a gm-only rumour's verdict only in its two label forms", () => {
    const pkg = structuredClone(canaryReferencePackage);
    pkg.rumours = [
      {
        ...pkg.rumours[0]!,
        id: "r-partial",
        text: "short",
        truth: "partially-true",
        visibility: "gm-only",
      },
    ];
    const entries = collectGmOnlyStrings(pkg).filter(
      (entry) => entry.recordId === "r-partial",
    );
    expect(entries.map((entry) => entry.text)).toEqual([
      "Truth: partially-true",
      '"truth":"partially-true"',
    ]);
    expect(() =>
      assertNoGmLeak(
        collectGmOnlyStrings(pkg),
        "The rumour was only partially-true, they say.",
        "bare phrase",
      ),
    ).not.toThrow();
  });

  it("keeps the reference secrets and drops nothing that is player-visible", () => {
    const reference = guarded.filter(
      (entry) => !entry.recordId.startsWith("canary-"),
    );
    expect(reference.length).toBeGreaterThanOrEqual(5);
  });

  it("keeps short protected values and de-duplicates", () => {
    const pkg = structuredClone(canaryReferencePackage);
    pkg.secrets = [
      { ...pkg.secrets[0]!, id: "short", text: "Red key" },
      { ...pkg.secrets[0]!, id: "dup", text: "A long enough secret." },
      { ...pkg.secrets[0]!, id: "dup", text: "A long enough secret." },
    ];
    pkg.actors = [
      {
        ...pkg.actors[0]!,
        id: "short-actor",
        name: "Aldous Holt",
        visibility: "gm-only",
      },
    ];
    pkg.clues = [{ ...pkg.clues[0]!, id: "short-clue", reveals: "Red key" }];
    const secrets = collectGmOnlyStrings(pkg).filter((e) =>
      ["short", "dup", "short-actor", "short-clue"].includes(e.recordId),
    );
    expect(secrets).toContainEqual({
      recordId: "short",
      field: "text",
      text: "Red key",
    });
    expect(secrets).toContainEqual({
      recordId: "short-actor",
      field: "name",
      text: "Aldous Holt",
      match: "word",
    });
    expect(secrets).toContainEqual({
      recordId: "short-clue",
      field: "reveals",
      text: "Red key",
    });
    expect(secrets.filter((entry) => entry.recordId === "dup")).toHaveLength(1);
    for (const token of ["Red key", "Aldous Holt"]) {
      expect(() =>
        assertNoGmLeak(secrets, token, "short protected value"),
      ).toThrow();
    }
  });
});

describe("assertNoGmLeak", () => {
  const first = canaries[0]!;

  it("throws for a string output and names the record and field", () => {
    expect(() =>
      assertNoGmLeak(guarded, `She whispers ${first.token}.`, "narration"),
    ).toThrow(
      `GM-only leak in "narration": record ${first.recordId}, field ${first.field}`,
    );
  });

  it("throws for a nested object output and names the record and field", () => {
    const secret = canaries.find((c) => c.type === "secret")!;
    expect(() =>
      assertNoGmLeak(
        guarded,
        { turns: [{ narration: { text: secret.token } }] },
        "transcript",
      ),
    ).toThrow(
      `GM-only leak in "transcript": record ${secret.recordId}, field ${secret.field}`,
    );
  });

  it("ignores case and whitespace runs", () => {
    expect(() =>
      assertNoGmLeak(
        [{ recordId: "r", field: "text", text: "The vault holds a key" }],
        "the   VAULT\n holds a key",
        "spacing",
      ),
    ).toThrow(/record r, field text/);
  });

  it("catches the rumour verdict in its flattened JSON form", () => {
    expect(() =>
      assertNoGmLeak(guarded, { rumour: { truth: "false" } }, "json"),
    ).toThrow(/canary-rumour, field truth/);
  });

  it("catches a pretty-printed JSON string containing a rumour verdict", () => {
    expect(() =>
      assertNoGmLeak(
        guarded,
        JSON.stringify({ rumour: { truth: "false" } }, null, 2),
        "pretty JSON string",
      ),
    ).toThrow(/canary-rumour, field truth/);
  });

  it("throws for leaked nested text of a GM-only record", () => {
    for (const type of ["branch", "solution", "connection"]) {
      const canary = canaries.find((c) => c.type === type)!;
      expect(() =>
        assertNoGmLeak(guarded, { a: [canary.token] }, "nested"),
      ).toThrow(`record ${canary.recordId}, field ${canary.field}`);
    }
  });

  it("passes a clean output", () => {
    expect(() =>
      assertNoGmLeak(
        guarded,
        { narration: "A lantern flickers at the road's end." },
        "clean",
      ),
    ).not.toThrow();
  });
});

const gmOnly = { visibility: "gm-only", epistemicStatus: "explicit" } as const;

function variant() {
  return structuredClone(canaryReferencePackage);
}

describe("gap 1: source anchors", () => {
  it("guards a short GM-only spoiler anchor", () => {
    const pkg = variant();
    pkg.secrets = [
      {
        ...pkg.secrets[0]!,
        id: "short-anchor",
        text: "x",
        sourceRef: { section: "s", anchor: "The Heir" },
      },
    ];
    expect(() =>
      assertNoGmLeak(
        collectGmOnlyStrings(pkg),
        "The Heir has returned.",
        "short anchor",
      ),
    ).toThrow(/record short-anchor, field sourceRef\.anchor/);
  });

  it("guards a GM-only anchor that is a spoiler heading", () => {
    const pkg = variant();
    pkg.secrets = [
      {
        ...pkg.secrets[0]!,
        id: "anchored",
        text: "x",
        sourceRef: { section: "s", anchor: "The Mayor Is The Cultist" },
      },
    ];
    expect(() =>
      assertNoGmLeak(
        collectGmOnlyStrings(pkg),
        "See the mayor is the cultist heading.",
        "anchor",
      ),
    ).toThrow(/record anchored, field sourceRef\.anchor/);
  });

  it("does not guard an anchor equal to a player-visible record ID or anchor", () => {
    const pkg = variant();
    pkg.secrets = [
      {
        ...pkg.secrets[0]!,
        id: "anchored",
        text: "x",
        sourceRef: { section: "s", anchor: "ROS-SCENE-2-YARD" },
      },
      {
        ...pkg.secrets[0]!,
        id: "anchored-id",
        text: "x",
        sourceRef: { section: "s", anchor: "loc-mill-yard" },
      },
    ];
    const entries = collectGmOnlyStrings(pkg);
    expect(entries.filter((e) => e.field === "sourceRef.anchor")).toEqual([]);
    expect(() =>
      assertNoGmLeak(entries, "ros-scene-2-yard loc-mill-yard", "shared"),
    ).not.toThrow();
  });
});

describe("gap 2: readable IDs", () => {
  const withSecret = (id: string) => {
    const pkg = variant();
    pkg.secrets = [{ ...pkg.secrets[0]!, id, text: "x" }];
    return collectGmOnlyStrings(pkg);
  };

  it.each([
    "secret mayor is the cultist",
    "Secret-Mayor-Is-The-Cultist",
    "secret_mayor_is_the_cultist",
  ])("guards the ID when an output says %j", (output) => {
    expect(() =>
      assertNoGmLeak(
        withSecret("secret-mayor-is-the-cultist"),
        { note: `Remember: ${output}.` },
        "id",
      ),
    ).toThrow(/record secret-mayor-is-the-cultist, field id/);
  });

  it("matches whole words only", () => {
    expect(() =>
      assertNoGmLeak(
        withSecret("secret-mayor-is-the-cultist"),
        "supersecret mayor is the cultists",
        "id",
      ),
    ).not.toThrow();
  });

  it("does not guard single-word or short IDs", () => {
    for (const id of ["r-partial", "mystery", "secret-key"]) {
      const entries = withSecret(id);
      expect(entries.some((e) => e.recordId === id && e.field === "id")).toBe(
        false,
      );
      expect(() =>
        assertNoGmLeak(entries, id.replace(/-/g, " "), "short id"),
      ).not.toThrow();
    }
  });
});

describe("gap 3: companion lines", () => {
  const prose = "She mutters about hid-9 when alone.";

  function withLeakyActor() {
    const pkg = variant();
    pkg.secrets = [
      ...pkg.secrets,
      { ...pkg.secrets[0]!, id: "hid-9", text: "Zzyzx quandary" },
    ];
    pkg.actors = pkg.actors.map((actor) =>
      actor.id === "actor-tobiah-reed"
        ? { ...actor, description: prose }
        : actor,
    );
    return pkg;
  }

  it("guards a player-visible line that names a hidden ID", () => {
    expect(() =>
      assertNoGmLeak(
        collectGmOnlyStrings(withLeakyActor()),
        { text: prose },
        "companion",
      ),
    ).toThrow(/record actor-tobiah-reed, field description/);
  });

  it("does not guard a player-visible line that names no hidden ID", () => {
    const pkg = withLeakyActor();
    pkg.actors = pkg.actors.map((actor) =>
      actor.id === "actor-tobiah-reed"
        ? { ...actor, description: "A calm, tidy man." }
        : actor,
    );
    expect(() =>
      assertNoGmLeak(
        collectGmOnlyStrings(pkg),
        { text: "A calm, tidy man." },
        "plain",
      ),
    ).not.toThrow();
  });

  it("guards the same line retrieval moves into a GM-only companion", () => {
    const pkg = withLeakyActor();
    const result = retrieveAdventureJsonContext(pkg, {
      sceneId: "ros-scene-1-landing",
      actorIds: ["actor-tobiah-reed"],
    });
    expect(
      result.gmOnly.some(
        (e) => e.id === "actor-tobiah-reed" && e.text.includes(prose),
      ),
    ).toBe(true);
    expect(
      result.playerSafe.some((e) => JSON.stringify(e).includes(prose)),
    ).toBe(false);
    expect(collectGmOnlyStrings(pkg)).toContainEqual({
      recordId: "actor-tobiah-reed",
      field: "description",
      text: prose,
    });
  });

  it("guards sibling text in a composed connection line moved to a companion", () => {
    const pkg = variant();
    pkg.secrets = [
      ...pkg.secrets,
      { ...pkg.secrets[0]!, id: "hid-9", text: "Zzyzx quandary" },
    ];
    const condition = "At low tide";
    pkg.locations = pkg.locations.map((location, index) =>
      index === 0
        ? {
            ...location,
            connections: [
              ...(location.connections ?? []),
              {
                targetLocationId: pkg.locations[1]!.id,
                description: "A chart marks hid-9 at this crossing.",
                travelConditions: [condition],
              },
            ],
          }
        : location,
    );
    const entries = collectGmOnlyStrings(pkg);
    expect(entries).toContainEqual({
      recordId: pkg.locations[0]!.id,
      field: `connections[${pkg.locations[0]!.connections!.length - 1}].travelConditions[0]`,
      text: condition,
    });
    expect(() =>
      assertNoGmLeak(entries, "The passage is open At low tide.", "condition"),
    ).toThrow(/field connections\[\d+\]\.travelConditions\[0\]/);
  });

  it("allows public connection prose beyond hidden-ID bound", () => {
    const pkg = variant();
    pkg.secrets = [
      ...pkg.secrets,
      { ...pkg.secrets[0]!, id: "hid-9", text: "Zzyzx quandary" },
    ];
    const publicDescription =
      "The bridge stands open for weary travellers returning home from the coast.";
    const locationId = pkg.locations[0]!.id;
    pkg.locations = pkg.locations.map((location, index) =>
      index === 0
        ? {
            ...location,
            connections: [
              ...(location.connections ?? []),
              {
                targetLocationId: pkg.locations[1]!.id,
                description: publicDescription,
                // Retrieval stops matching after the bounded line prefix.
                travelConditions: [
                  `far-off notes ${"x".repeat(MAX_ADVENTURE_RETRIEVAL_CHARS + 100)} hid-9`,
                ],
              },
            ],
          }
        : location,
    );
    const entries = collectGmOnlyStrings(pkg);
    const connectionIndex = pkg.locations[0]!.connections!.length - 1;
    expect(entries).not.toContainEqual({
      recordId: locationId,
      field: `connections[${connectionIndex}].description`,
      text: publicDescription,
    });
    expect(() =>
      assertNoGmLeak(
        entries,
        "bridge stands open for weary travellers returning home",
        "public connection quote",
      ),
    ).not.toThrow();
  });

  it("catches an 8-word quote from a companion when ID punctuation changes", () => {
    const pkg = withLeakyActor();
    const companionLine =
      "The keeper hid-9 records the mayor's sealed letter behind the old chapel door.";
    pkg.actors = pkg.actors.map((actor) =>
      actor.id === "actor-tobiah-reed"
        ? { ...actor, description: companionLine }
        : actor,
    );
    const guarded = collectGmOnlyStrings(pkg);

    // Retrieval moves this source line to GM-only because it names hid-9.
    const result = retrieveAdventureJsonContext(pkg, {
      sceneId: "ros-scene-1-landing",
      actorIds: ["actor-tobiah-reed"],
    });
    expect(
      result.gmOnly.some(
        (excerpt) =>
          excerpt.id === "actor-tobiah-reed" &&
          excerpt.text.includes(companionLine),
      ),
    ).toBe(true);

    // The changed ID punctuation avoids a full-line substring match, so the
    // partial-quote guard must catch the shared eight-word run.
    expect(() =>
      assertNoGmLeak(
        guarded,
        "keeper hid 9 records the mayor's sealed letter",
        "companion quote",
      ),
    ).toThrow(/record actor-tobiah-reed, field description \(partial quote\)$/);
  });
});

describe("gap 4: short names", () => {
  const withName = (kind: "actors" | "locations", name: string) => {
    const pkg = variant();
    pkg[kind] = [
      ...pkg[kind],
      { ...pkg[kind][0]!, id: "short-name", name, ...gmOnly },
    ] as never;
    return collectGmOnlyStrings(pkg);
  };

  it("matches a short GM-only name as a whole word", () => {
    expect(() =>
      assertNoGmLeak(
        withName("actors", "Mara Voss"),
        "and mara voss smiled",
        "short",
      ),
    ).toThrow(/record short-name, field name/);
  });

  it("does not match a short name inside a longer word", () => {
    expect(() =>
      assertNoGmLeak(withName("actors", "Ash"), "Ashford is nearby.", "inside"),
    ).not.toThrow();
    expect(() =>
      assertNoGmLeak(withName("actors", "Ash"), "Ash is nearby.", "word"),
    ).toThrow(/record short-name/);
  });

  it("matches punctuation between name words without matching a longer token", () => {
    const entries = withName("actors", "Mara Voss");
    expect(() =>
      assertNoGmLeak(entries, "Mara-Voss was seen.", "hyphenated name"),
    ).toThrow(/record short-name, field name/);
    expect(() =>
      assertNoGmLeak(entries, "Mara-Vossley was seen.", "longer token"),
    ).not.toThrow();
  });

  it("does not guard an allowlisted short name", () => {
    expect(SHORT_NAME_ALLOWLIST.has("cellar")).toBe(true);
    const entries = withName("locations", "Cellar");
    expect(
      entries.some((e) => e.recordId === "short-name" && e.field === "name"),
    ).toBe(false);
    expect(() =>
      assertNoGmLeak(entries, "Down in the cellar.", "allow"),
    ).not.toThrow();
  });
});

describe("gap 5: partial quotes", () => {
  const secretText =
    "The mayor quietly pays the night watch to look away from the harbour";
  const withSecret = (visibleText?: string) => {
    const pkg = variant();
    pkg.secrets = [{ ...pkg.secrets[0]!, id: "quoted", text: secretText }];
    if (visibleText)
      pkg.actors = pkg.actors.map((a, i) =>
        i === 0 ? { ...a, description: visibleText } : a,
      );
    return collectGmOnlyStrings(pkg);
  };

  it("throws on 8 consecutive words despite case, punctuation and breaks", () => {
    expect(() =>
      assertNoGmLeak(
        withSecret(),
        "Rumour: PAYS the night-watch,\nto look away -- from the harbour!",
        "quote",
      ),
    ).toThrow(/record quoted, field text \(partial quote\)$/);
  });

  it("does not throw on 7 consecutive words", () => {
    expect(() =>
      assertNoGmLeak(
        withSecret(),
        "the mayor quietly pays the night watch",
        "seven",
      ),
    ).not.toThrow();
  });

  it("does not throw on a run that is also player-visible text", () => {
    expect(() =>
      assertNoGmLeak(
        withSecret(
          "Everyone knows the mayor quietly pays the night watch to look away.",
        ),
        "the mayor quietly pays the night watch to look",
        "visible",
      ),
    ).not.toThrow();
  });
});
