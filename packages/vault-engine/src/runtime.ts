/**
 * Re-export of the shared runtime seams (Constitution VIII). Kept as a local
 * module so package-internal imports stay `./runtime` / `../runtime`.
 */
export {
  type Clock,
  type IdGenerator,
  systemClock,
  systemIdGenerator,
} from "@codex/runtime";
