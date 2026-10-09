import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { publicEntityTemplateDirectoryService } from "$lib/services/publishing/PublicEntityTemplateDirectoryService";

export const ssr = false;

/**
 * Entity template listings have their own page. If someone opens one through
 * the Stat Sheet address, send them to the right place. Anything else, and any
 * failure to check, carries on to the Stat Sheet page unchanged.
 */
export const load = async ({ params }: { params: { listingId: string } }) => {
  let isEntity = false;
  try {
    const probe = await publicEntityTemplateDirectoryService.probeListing(
      params.listingId,
    );
    isEntity = probe.kind === "entity";
  } catch {
    // Let the Stat Sheet page load and report its own error.
  }
  if (isEntity) {
    redirect(307, resolve(`/templates/entity/${params.listingId}` as any));
  }
  return {};
};
