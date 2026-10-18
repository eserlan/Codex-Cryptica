import { getCorsHeaders, getWriteToken } from "./publish";

export interface DirectoryEnv {
  BUCKET?: any; // R2Bucket
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
}

export async function authorizeListingMutation(
  request: Request,
  env: DirectoryEnv,
  publishId: string,
) {
  const clientToken = getWriteToken(request);
  if (!clientToken) {
    return new Response(
      JSON.stringify({ error: { message: "Unauthorized: Missing token" } }),
      {
        status: 401,
        headers: {
          ...getCorsHeaders(request.headers, env),
          "Content-Type": "application/json",
        },
      },
    );
  }

  const bundleHead = await env.BUCKET?.head(
    `published/${publishId}/bundle.json`,
  );
  if (!bundleHead) {
    return new Response(
      JSON.stringify({ error: { message: "Snapshot not found" } }),
      {
        status: 404,
        headers: {
          ...getCorsHeaders(request.headers, env),
          "Content-Type": "application/json",
        },
      },
    );
  }

  const serverToken = bundleHead.customMetadata?.writeToken;
  if (!serverToken || serverToken !== clientToken) {
    return new Response(
      JSON.stringify({ error: { message: "Unauthorized listing mutation" } }),
      {
        status: 401,
        headers: {
          ...getCorsHeaders(request.headers, env),
          "Content-Type": "application/json",
        },
      },
    );
  }

  return null;
}
