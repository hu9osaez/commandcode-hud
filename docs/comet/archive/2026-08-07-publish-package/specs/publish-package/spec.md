# Spec: Publishable npm package for commandcode-hud

## Capability overview

`commandcode-hud` is distributed as an npm package that ships the native Command Code mod (`commandcode-hud.mod.ts`) plus documentation. The package does not build or transpile TypeScript; the mod is installed as source into `~/.commandcode/mods/commandcode-hud.ts` and loaded by Command Code 1.14.1.

## Files

### package.json

- `name`: `@hu9osaez/commandcode-hud` (scope del usuario).
- `version`: `0.1.0`.
- `description`: "Native Command Code mod that shows model, reasoning effort, context usage and Git branch in the mods status line."
- `type`: `module`.
- `license`: `MIT`.
- `engines.node`: `>=20`.
- `files`: `["commandcode-hud.mod.ts", "README.md", "LICENSE"]`.
- `keywords`: `["commandcode", "mod", "hud", "statusline", "context"]`.
- `repository`: `{ type: "git", url: "https://github.com/hu9osaez/commandcode-hud" }`.
- `scripts.install:mod`: `mkdir -p "$HOME/.commandcode/mods" && cp commandcode-hud.mod.ts "$HOME/.commandcode/mods/commandcode-hud.ts"` (idempotent).
- No `bin` binary: the mod is not a CLI.

### README.md

Documents:

1. What the mod shows: `Model 🧠 effort · ctx % · used/limit · branch` (single `cmd.ui.setStatus` line).
2. Installation: `npm i -g @hu9osaez/commandcode-hud` (or `npm i -D` + `npm run install:mod`), plus manual `mkdir -p ~/.commandcode/mods && cp commandcode-hud.mod.ts ~/.commandcode/mods/commandcode-hud.ts`.
3. Verification: `cmd mods list` shows `commandcode-hud · user`.
4. Session usage: `cmd`, `/reload`, `/resume`, `/new`.
5. Context segment: sourced from `model_request_end.usage.inputTokens` and a per-model context-window map (52 official models); the `ctx` segment is omitted for unknown models.
6. Known limitations of Command Code 1.14.1: no public `/model` event (reflected before the next request), `cmd.ui.widget` does not render yet.

## Behavior constraints

- Mod must load with zero `mod_error`.
- `cmd.ui.setStatus` is the only supported render surface.
- Native permission/shortcuts/taste rows are never replaced.
- Context data never fabricates a value for unknown models.

## Acceptance mapping

- AC1: `package.json` valid JSON with `name @hu9osaez/commandcode-hud`, `engines.node >=20`, `files` including the mod and README.
- AC2: `npm pack --dry-run` lists `commandcode-hud.mod.ts`, `README.md` (and `LICENSE` if present).
- AC3: README documents install, verify (`cmd mods list`), session start/reload, context segment, and 1.14.1 limitations.
- AC4: Mod loads with 0 `mod_error` after copying to `~/.commandcode/mods/`.
