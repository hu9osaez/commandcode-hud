# commandcode-hud

Native [Command Code](https://commandcode.ai) mod that shows workspace and session state in the mods status line, right below the native footer.

```text
gpt-5.6-luna 🧠 xhigh · █░░░░░░░░░ 4% · 46.8k/1M · main* · 12m34s
5h 8% (4h26m) · wk 45% (3d2h) · $54.10
```

## What it shows

- **Model** selected and **reasoning effort** (`🧠 effort`).
- **Context used / limit** with a visual bar colored by threshold (green <70%, yellow 70–89%, red ≥90%, plus a warning glyph at 90%+). Computed from `usage.inputTokens` of the `model_request_end` event and the model's context window (mirrors Command Code's official registry, all 70 models as of v1.53.0).
- **Current Git branch** with a dirty marker (`main*`) when there are uncommitted changes; `no-branch` outside a repository.
- **Session duration** (`12m34s`, `1h5m` past the hour), hidden below one second.
- **Rate limit windows and credits** on a second line: 5-hour and weekly windows (same threshold colors, countdown to each reset) and the remaining monthly credit balance, fetched from Command Code's billing API using the CLI's existing local credentials — no extra setup.

State (model, effort, context, branch, dirty, session start) is persisted and restored when reopening a session or switching sessions.

## Usage

Run it once with `npx` — no global install needed:

```sh
npx @hu9osaez/commandcode-hud
```

This installs (or overwrites) the mod at `~/.commandcode/mods/commandcode-hud.ts` and verifies the install. It also patches the Command Code CLI dist (`sanitizeStatusText`) to allow line breaks in mod status text, which enables the two-line HUD; the patch is idempotent and safely reports when the vendor changed the pattern (the HUD then falls back to a single line).

> The CLI self-updates wipe the patch. Re-running `npx @hu9osaez/commandcode-hud` (or `--verify`) re-applies it.

Other commands:

```sh
npx @hu9osaez/commandcode-hud --verify      # Check the installed mod matches this package + patch state
npx @hu9osaez/commandcode-hud --uninstall   # Remove the installed mod
npx @hu9osaez/commandcode-hud --help        # Show usage
```

### Manual install

```sh
mkdir -p ~/.commandcode/mods
cp commandcode-hud.mod.ts ~/.commandcode/mods/commandcode-hud.ts
```

## Verification

```sh
cmd mods list
```

You should see:

```text
commandcode-hud · user · ~/.commandcode/mods/commandcode-hud.ts
```

Then start a new session:

```sh
cmd
```

The HUD appears as the mod status line, below the Command Code input.

## Sessions

- `/reload` reloads the mod in the current session.
- `/resume` restores an existing session.
- `/new` starts a new session.

## Context segment

- **Used**: `usage.inputTokens` from the `model_request_end` event (the same source the TUI uses for current context).
- **Limit**: per-model `contextWindow` map (mirror of Command Code's official registry). IDs match `cmd --list-models` / `config.json`.
- If the model is not in the map, the segment is omitted instead of showing a made-up value.

## Rate limit segments

- **Source**: `GET https://api.commandcode.ai/alpha/billing/credits` with the CLI API key from `~/.commandcode/auth.json` (HTTPS only; the key is never logged or persisted by the mod).
- **Cache**: 60s TTL, in-flight dedup, refreshed on session start and `run_end`.
- **Failure behavior**: missing credentials, network errors or unexpected payloads simply hide the segments; the rest of the HUD is unaffected.

## Command Code limitations

- There is no public event for the `/model` command: a model change is reflected right before the next model request, not necessarily the instant `/model` runs. The mod compensates by watching `~/.commandcode/config.json` and updating when it detects the change.
- `cmd.ui.widget` exists in the API but is a no-op (unwired). `cmd.ui.setStatus` is the supported surface, and the CLI strips line breaks from status text unless the installer patch is applied.

## Development

```sh
# Exercise mod helpers (branch, model, context limits, billing parse, render)
node --input-type=module -e "const m = await import('./commandcode-hud.mod.ts'); console.log(m.__test)"
```

## License

MIT.
