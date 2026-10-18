import { describe, expect, it } from "vitest";
import { handleTemplateDirectoryRoutes } from "../template-directory-routes";
import { Bucket } from "./r2-memory-bucket";

const base = "https://oracle.test";
const call = (
  method: string,
  path: string,
  env: any = { BUCKET: new Bucket() },
) =>
  handleTemplateDirectoryRoutes(
    new Request(`${base}${path}`, { method }),
    env,
    path,
  );

describe("handleTemplateDirectoryRoutes", () => {
  it("returns null for unrelated paths so the caller keeps routing", async () => {
    expect(await call("GET", "/api/other")).toBeNull();
  });

  it("lists listings", async () => {
    const res = await call("GET", "/api/template-directory/listings");
    expect(res?.status).toBe(200);
  });

  it("answers 405 for unsupported methods", async () => {
    expect(
      (await call("PATCH", "/api/template-directory/listings"))?.status,
    ).toBe(405);
    expect(
      (await call("PATCH", "/api/template-directory/listings/abc"))?.status,
    ).toBe(405);
  });

  it("answers 404 for a missing listing and package", async () => {
    expect(
      (await call("GET", "/api/template-directory/listings/missing"))?.status,
    ).toBe(404);
    expect(
      (await call("GET", "/api/template-directory/listings/missing/package"))
        ?.status,
    ).toBe(404);
  });

  it("requires the operator token for suspensions", async () => {
    const res = await call("POST", "/api/template-directory/admin/suspensions");
    expect(res?.status).toBe(401);
  });

  it("requires an owner token to update", async () => {
    expect(
      (await call("PUT", "/api/template-directory/listings/abc"))?.status,
    ).toBe(401);
  });
});
