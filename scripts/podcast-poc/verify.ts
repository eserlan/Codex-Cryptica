export function verifyResponse(
  response: Response,
  kind: "head" | "range",
  size: number,
  mime: string,
): void {
  verifyHeaders(response, kind, mime);
  if (kind === "head") verifyHead(response, size);
  else verifyRange(response, size);
}

function verifyHeaders(
  response: Response,
  kind: "head" | "range",
  mime: string,
): void {
  const expectedStatus = { head: 200, range: 206 }[kind];
  if (response.status !== expectedStatus)
    throw new Error(`${kind} returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith(mime))
    throw new Error(`${kind}: unexpected content type`);
}

function verifyHead(response: Response, size: number): void {
  if (Number(response.headers.get("content-length")) !== size)
    throw new Error("HEAD: incorrect content length");
}

function verifyRange(response: Response, size: number): void {
  if (
    !new RegExp(`^bytes 0-${Math.min(1023, size - 1)}/${size}$`).test(
      response.headers.get("content-range") ?? "",
    )
  )
    throw new Error("Invalid content range");
}
