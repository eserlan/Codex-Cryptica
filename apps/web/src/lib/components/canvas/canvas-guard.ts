/** Returns `value` when `condition` holds, otherwise `undefined`. */
export function when<T>(condition: unknown, value: T): T | undefined {
  return condition ? value : undefined;
}
