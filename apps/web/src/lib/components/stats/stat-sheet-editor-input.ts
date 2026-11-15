/** Empty numeric bounds remain unset; dice-pool bounds use whole numbers. */
export function parseOptionalNumber(
  raw: string,
  whole = false,
): number | undefined {
  if (raw === "") return undefined;
  const value = Number(raw);
  return whole ? Math.floor(value) : value;
}
