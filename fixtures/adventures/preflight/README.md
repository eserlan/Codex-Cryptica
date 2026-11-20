# Preflight fixtures

Each file is a copy of `apps/web/static/schemas/adventure-json/examples/minimal.v1.json` with one defect, for `bun scripts/preflight-adventure-json.ts`.

- `unresolved-reference.v1.json`: the scene `locationId` names `loc-missing`, which does not exist.
- `wrong-target.v1.json`: the scene `locationId` is the actor ID `actor-reeve-tomas`, not a location.
- `duplicate-id.v1.json`: the actor and the location share the ID `loc-watchtower`.
- `malformed-field.v1.json`: `title` is a number instead of a string.
- `unparseable.json`: the JSON is cut off partway.
