import { describe, expect, it, vi } from "vitest";
import {
  EntityTemplateDirectoryError,
  PublicEntityTemplateDirectoryService,
} from "./PublicEntityTemplateDirectoryService";

const pkg = {
  kind: "entity-template" as const,
  formatVersion: 1,
  template: {
    name: "Guild Hall",
    entityType: "location",
    markdown: "## Rooms\n",
  },
};
const listing = {
  schemaVersion: 1,
  templateKind: "entity",
  listingId: "L1",
  title: "Guild Hall",
  description: "d",
  entityType: "location",
  labels: ["Fantasy"],
  packageVersion: 1,
  status: "active",
  listingCreatedAt: "2026-01-01T00:00:00.000Z",
  listingUpdatedAt: "2026-01-01T00:00:00.000Z",
};
const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const make = (fetchImpl: (...a: any[]) => Promise<Response>) =>
  new PublicEntityTemplateDirectoryService({
    fetch: fetchImpl as any,
    baseUrl: "https://dir.test",
  });
const input = {
  package: pkg,
  description: "d",
  labels: ["Fantasy"],
  ownerDisplayName: "Ada",
};

describe("publishEntityTemplate", () => {
  it("sends the package and metadata with the acknowledgment and returns the token", async () => {
    const fetch = vi.fn(async () => ok({ listing, ownerToken: "tok" }, 201));
    const result = await make(fetch).publishEntityTemplate(input);
    expect(result.ownerToken).toBe("tok");
    expect(result.listing.listingId).toBe("L1");
    const [url, init] = fetch.mock.calls[0] as any[];
    expect(url).toBe("https://dir.test/api/template-directory/listings");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      package: pkg,
      metadata: {
        description: "d",
        labels: ["Fantasy"],
        ownerDisplayName: "Ada",
        rightsAcknowledged: true,
      },
    });
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("throws a plain-language error and returns no token on failure", async () => {
    await expect(
      make(async () =>
        ok(
          {
            error: {
              message:
                "Add a short description so people know what this template is for.",
            },
          },
          400,
        ),
      ).publishEntityTemplate(input),
    ).rejects.toThrow(/short description/);
    const err = await make(async () => ok({}, 503))
      .publishEntityTemplate(input)
      .catch((e) => e);
    expect(err).toBeInstanceOf(EntityTemplateDirectoryError);
    expect(err.message).toBe("Could not publish the template.");
  });

  it("rejects a response without a token", async () => {
    await expect(
      make(async () => ok({ listing }, 201)).publishEntityTemplate(input),
    ).rejects.toThrow();
  });

  it("reports a retryable error when offline", async () => {
    const err = await make(async () => {
      throw new TypeError("offline");
    })
      .publishEntityTemplate(input)
      .catch((e) => e);
    expect(err.code).toBe("network");
  });
});

describe("owner actions", () => {
  it.each([
    [
      "updateEntityTemplate",
      (s: any) => s.updateEntityTemplate("L1", input, "tok"),
      "PUT",
      "/listings/L1",
    ],
    [
      "unpublishEntityTemplate",
      (s: any) => s.unpublishEntityTemplate("L1", "tok"),
      "POST",
      "/listings/L1/unpublish",
    ],
    [
      "deleteEntityTemplate",
      (s: any) => s.deleteEntityTemplate("L1", "tok"),
      "DELETE",
      "/listings/L1",
    ],
    [
      "verifyOwner",
      (s: any) => s.verifyOwner("L1", "tok"),
      "GET",
      "/listings/L1/owner",
    ],
  ])(
    "%s sends the Bearer token to the right route",
    async (_name, run, method, path) => {
      const fetch = vi.fn(async () =>
        ok(
          _name === "updateEntityTemplate"
            ? listing
            : _name === "verifyOwner"
              ? { listing, package: pkg }
              : { success: true },
        ),
      );
      await run(make(fetch));
      const [url, init] = fetch.mock.calls[0] as any[];
      expect(url).toBe(`https://dir.test/api/template-directory${path}`);
      expect(init?.method ?? "GET").toBe(method);
      expect(init.headers.Authorization).toBe("Bearer tok");
    },
  );

  it.each([
    [
      "updateEntityTemplate",
      (s: any) => s.updateEntityTemplate("L1", input, "tok"),
    ],
    [
      "unpublishEntityTemplate",
      (s: any) => s.unpublishEntityTemplate("L1", "tok"),
    ],
    ["deleteEntityTemplate", (s: any) => s.deleteEntityTemplate("L1", "tok")],
    ["verifyOwner", (s: any) => s.verifyOwner("L1", "tok")],
  ])("%s maps 401, 403 and 404 to distinct errors", async (_name, run) => {
    const code = async (status: number, body: unknown = {}) =>
      (await run(make(async () => ok(body, status))).catch((e: any) => e)).code;
    expect(await code(401)).toBe("unauthorized");
    expect(
      await code(403, { error: { code: "removed_by_operator", message: "x" } }),
    ).toBe("removed_by_operator");
    expect(await code(404)).toBe("not_found");
    expect(await code(500)).toBe("unknown");
  });

  it("explains that an operator removal is final and offers a fresh publish", async () => {
    const err = await make(async () =>
      ok({ error: { code: "removed_by_operator", message: "x" } }, 403),
    )
      .updateEntityTemplate("L1", input, "tok")
      .catch((e) => e);
    expect(err.message).toMatch(/removed by the operator/i);
    expect(err.message).toMatch(/new listing/i);
  });

  it("verifyOwner returns the listing and a validated package", async () => {
    const r = await make(async () => ok({ listing, package: pkg })).verifyOwner(
      "L1",
      "tok",
    );
    expect(r.package.template.markdown).toBe("## Rooms\n");
    await expect(
      make(async () =>
        ok({
          listing,
          package: {
            kind: "entity-template",
            formatVersion: 1,
            template: { name: "x", entityType: "y", markdown: "" },
          },
        }),
      ).verifyOwner("L1", "tok"),
    ).rejects.toThrow();
  });

  it("a network failure is retryable and distinct", async () => {
    const err = await make(async () => {
      throw new TypeError("offline");
    })
      .deleteEntityTemplate("L1", "tok")
      .catch((e) => e);
    expect(err.code).toBe("network");
  });
});
