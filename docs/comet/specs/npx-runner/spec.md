# Spec: npx-runnable commandcode-hud package

## Capability overview

`commandcode-hud` is distributed as an npm package that ships a Node CLI bin. Running `npx @hu9osaez/commandcode-hud` (or the equivalent local `node bin/commandcode-hud.js`) installs the native Command Code mod (`commandcode-hud.mod.ts`) into `~/.commandcode/mods/commandcode-hud.ts`, overwriting any existing file, and verifies the install. The package has no `install` script and is not meant to be installed globally.

## Behavior

### Bin

- `bin` in package.json maps `commandcode-hud` -> `bin/commandcode-hud.js`.
- Script has shebang `#!/usr/bin/env node`, ESM (`type: module`), no runtime deps, Node >= 20.
- Commands:
  - default / `install`: `mkdir -p ~/.commandcode/mods`, copy `commandcode-hud.mod.ts` -> `~/.commandcode/mods/commandcode-hud.ts` (overwrite), then verify.
  - `--verify`: compare installed file content with the packaged mod; print OK or mismatch; exit 0 if OK, non-zero if missing/mismatch.
  - `--uninstall`: remove `~/.commandcode/mods/commandcode-hud.ts` if present; print result.
  - `--help`, `--version`.
- Idempotent install; never touches other files under `~/.commandcode/mods/`.
- `~` resolved via `os.homedir()`; works with `HOME` env override (for tests).

### package.json

- `files`: `["commandcode-hud.mod.ts", "bin", "README.md", "LICENSE"]`.
- Remove `scripts.install:mod`. Keep name/version/license/engines/keywords/repository.

### README (English)

- Documents `npx @hu9osaez/commandcode-hud` one-shot usage, what it installs, `--verify`, `--uninstall`, session usage (`cmd`, `/reload`, `/resume`, `/new`), the rendered line format, and Command Code 1.14.1 limitations (`/model` no public event, `cmd.ui.widget` not rendering).

## Acceptance mapping

- AC1: `npm pack --dry-run` includes `bin/commandcode-hud.js`, `commandcode-hud.mod.ts`, `README.md`, `LICENSE`.
- AC2: `node bin/commandcode-hud.js --help` exits 0 and prints usage text (English).
- AC3: With `HOME` set to a temp dir, running the bin installs the mod (overwriting an existing copy) and prints a verification line.
- AC4: `node bin/commandcode-hud.js --verify` exits 0 when installed content matches, non-zero when missing/mismatch.
- AC5: `node bin/commandcode-hud.js --uninstall` removes the installed mod and prints a message.
- AC6: README is entirely in English.
