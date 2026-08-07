# Outcome

`commandcode-hud` runs via `npx` as a one-shot command: `npx @hu9osaez/commandcode-hud` installs the mod into `~/.commandcode/mods/` and verifies it. The package ships an executable Node bin (no global install, no `install` script), and the README documents usage in English.

# Scope

- Add a Node CLI bin (`commandcode-hud`) that:
  - default: installs `commandcode-hud.mod.ts` -> `~/.commandcode/mods/commandcode-hud.ts`, **overwriting** an existing file (D3), and verifies via `cmd mods list`.
  - `--verify`: only checks whether the installed mod matches and reports.
  - `--uninstall`: removes `~/.commandcode/mods/commandcode-hud.ts`.
- Add `bin` to package.json; remove the `install:mod` script.
- Translate README to English; document `npx` usage.
- Keep the mod itself unchanged.

# Non-goals

- No publish to npm in this change.
- No changes to mod behavior/render.
- No interactive prompts beyond clear CLI output.

# Acceptance examples

- `npm pack --dry-run` includes the bin script, mod, README, LICENSE.
- `node bin/commandcode-hud.js --help` exits 0 and prints usage.
- Running the bin copies the mod to `~/.commandcode/mods/` and prints verification result.
- README is fully in English.

# Constraints and invariants

- Node >= 20, ESM, no runtime deps.
- Bin script has `#!/usr/bin/env node`.
- Idempotent install; never deletes unrelated files in `~/.commandcode/mods/`.
- All docs and comments in English.

# Decisions

- D1: Run via `npx` one-shot; no global install, no `install` script.
- D2: Bin supports `install` (default), `--verify`, `--uninstall`.
- D3: On existing `~/.commandcode/mods/commandcode-hud.ts`, install overwrites it unconditionally.

# Open questions

- [resolved] Q1: Behavior of the bin when `~/.commandcode/mods/commandcode-hud.ts` already exists (overwrite with the packaged version vs. keep existing + warn)?

- [resolved] CONFIRM: Shared understanding approved by user.

# Verification expectations

- Real run of the bin in a temp HOME.
