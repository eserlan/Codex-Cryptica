import { getCorsHeaders, type CorsEnv } from "./cors";
import {
  handleAdminSuspendTemplateListing,
  handleCreateTemplateListing,
  handleDeleteTemplateListing,
  handleGetTemplateListing,
  handleGetTemplatePackage,
  handleListTemplateListings,
  handleReportTemplateListing,
  handleUpdateTemplateListing,
} from "./template-directory";
import {
  handleGetEntityTemplateListing,
  handleGetEntityTemplatePackage,
  handleListEntityTemplateListings,
  handleRebuildEntityTemplateIndex,
} from "./entity-template-directory";
import {
  handleCreateEntityTemplateListing,
  handleDeleteEntityTemplateListing,
  handleEntityTemplateOwner,
  handleUnpublishEntityTemplateListing,
  handleUpdateEntityTemplateListing,
  isEntityPublishRequest,
} from "./entity-template-directory-write";
import {
  handleAdminEntityTemplateReports,
  handleReportEntityTemplateListing,
} from "./entity-template-directory-report";
import type { TemplateDirectoryEnv } from "./template-directory-shared";

type RoutesEnv = TemplateDirectoryEnv & CorsEnv;

/** Answers a listing request, or `null` for "that id is not one of mine". */
type ListingHandler = (
  request: Request,
  env: RoutesEnv,
  listingId: string,
) => Promise<Response | null> | Response | Promise<Response>;

const PREFIX = "/api/template-directory/";
const notFound = () => new Response("Not found", { status: 404 });

function methodNotAllowed(request: Request, env: RoutesEnv) {
  return new Response("Method not allowed", {
    status: 405,
    headers: getCorsHeaders(request.headers, env),
  });
}

/** An entity listing answers first; `null` means "not one of mine". */
const entityFirst =
  (entity: ListingHandler, stat: ListingHandler): ListingHandler =>
  async (request, env, listingId) =>
    (await entity(request, env, listingId)) ?? stat(request, env, listingId);

/** Entity-only actions: any other id is simply not found. */
const entityOnly =
  (entity: ListingHandler): ListingHandler =>
  async (request, env, listingId) =>
    (await entity(request, env, listingId)) ?? notFound();

/** Requests on `/listings/:id`, keyed by method. */
const LISTING_ROOT: Record<string, ListingHandler> = {
  GET: entityFirst(handleGetEntityTemplateListing, handleGetTemplateListing),
  PUT: entityFirst(
    handleUpdateEntityTemplateListing,
    handleUpdateTemplateListing,
  ),
  DELETE: entityFirst(
    handleDeleteEntityTemplateListing,
    handleDeleteTemplateListing,
  ),
};

/** Requests on `/listings/:id/<sub>`, keyed by "METHOD sub". */
const LISTING_SUB: Record<string, ListingHandler> = {
  "GET package": entityFirst(
    handleGetEntityTemplatePackage,
    handleGetTemplatePackage,
  ),
  "POST report": entityFirst(
    handleReportEntityTemplateListing,
    handleReportTemplateListing,
  ),
  "POST unpublish": entityOnly(handleUnpublishEntityTemplateListing),
  "GET owner": entityOnly(handleEntityTemplateOwner),
};

async function routeCollection(request: Request, env: RoutesEnv) {
  if (request.method === "GET") {
    // `kind=entity` selects entity listings; anything else is the stat sheet
    // directory, exactly as before.
    return new URL(request.url).searchParams.get("kind") === "entity"
      ? handleListEntityTemplateListings(request, env)
      : handleListTemplateListings(request, env);
  }
  if (request.method === "POST") {
    // An entity template package is published by the entity handler; any other
    // body goes to the stat sheet handler exactly as before.
    return (await isEntityPublishRequest(request))
      ? handleCreateEntityTemplateListing(request, env)
      : handleCreateTemplateListing(request, env);
  }
  return methodNotAllowed(request, env);
}

async function routeListing(request: Request, env: RoutesEnv, parts: string[]) {
  const [, listingId, sub] = parts;
  if (!listingId) return notFound();
  const handler =
    parts.length === 2
      ? LISTING_ROOT[request.method]
      : parts.length === 3
        ? LISTING_SUB[`${request.method} ${sub}`]
        : undefined;
  return handler
    ? handler(request, env, listingId)
    : methodNotAllowed(request, env);
}

function routeAdmin(request: Request, env: RoutesEnv, action: string) {
  const key = `${request.method} ${action}`;
  if (key === "POST suspensions")
    return handleAdminSuspendTemplateListing(request, env);
  if (key === "POST rebuild-index")
    return handleRebuildEntityTemplateIndex(request, env);
  if (key === "GET reports")
    return handleAdminEntityTemplateReports(request, env);
  return null;
}

/**
 * Routes every `/api/template-directory/*` request. Returns `null` for any
 * other path so the caller can carry on with its own routing. The origin
 * check and rate limiting stay with the caller, before this runs.
 */
export async function handleTemplateDirectoryRoutes(
  request: Request,
  env: RoutesEnv,
  pathname: string,
): Promise<Response | null> {
  if (!pathname.startsWith(PREFIX)) return null;
  const parts = pathname.slice(PREFIX.length).split("/");
  if (parts[0] === "admin" && parts.length === 2) {
    return routeAdmin(request, env, parts[1]);
  }
  if (parts[0] !== "listings") return null;
  return parts.length === 1
    ? routeCollection(request, env)
    : routeListing(request, env, parts);
}
