# commandcode-hud

Native [Command Code](https://commandcode.ai) mod that shows workspace and session state in the mods status line, right below the native footer.

```text
gpt-5.6-luna 🧠 xhigh · ctx 4% · 46.8k/1M · main
```

## What it shows

- **Model** selected and **reasoning effort** (`🧠 effort`).
- **Context used / limit** (`ctx % · used/limit`), computed from `usage.inputTokens` of the `model_request_end` event and the model's context window (all 52 official models).
- **Current Git branch** (or `no-branch` when not in a repository).
- State is persisted and restored when reopening a session or switching sessions.

The mod publishes a single line via `cmd.ui.setStatus`; the native permission/shortcuts/taste rows are never replaced.

## Usage

Run it once with `npx` — no global install needed:

```sh
npx @hu9osaez/commandcode-hud
```

This installs (or overwrites) the mod at `~/.commandcode/mods/commandcode-hud.ts` and verifies the install.

Other commands:

```sh
npx @hu9osaez/commandcode-hud --verify      # Check the installed mod matches this package
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

The mod persists its latest model, effort, context usage and branch via `cmd.session.appendCustomEntry`.

## Context segment

- **Used**: `usage.inputTokens` from the `model_request_end` event (the same source the TUI uses for current context).
- **Limit**: per-model `contextWindow` map (mirror of Command Code's official registry). IDs match `cmd --list-models` / `config.json`.
- If the model is not in the map, the `ctx` segment is omitted instead of showing a made-up value.

## Command Code 1.14.1 limitations

- There is no public event for the `/model` command: a model change is reflected right before the next model request, not necessarily the instant `/model` runs. The mod compensates by watching `~/.commandcode/config.json` and updating when it detects the change.
- `cmd.ui.widget` exists in the API but does not render in 1.14.1. `cmd.ui.setStatus` is the supported surface.

## Development

```sh
# Exercise mod helpers (branch, model, context limits)
node --input-type=module -e "const m = await import('./commandcode-hud.mod.ts'); console.log(m.__test)"
```

## License

MIT.
