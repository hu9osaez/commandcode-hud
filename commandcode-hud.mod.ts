import {readFileSync} from 'node:fs';
import type {ModApi} from '@commandcode/harness';

/**
 * Command Code 1.14.1 UI surfaces (docs + dist/cli.mjs):
 *
 * Native footer (inside InputBox):
 *   `» permission bypass on [shift+tab]` / `? for shortcuts` / `taste on`
 *   → ModeIndicator + TasteStateBadge. Mods cannot write into that row.
 *
 * Mod footer line (BELOW the input box):
 *   `cmd.ui.setStatus(text)` → ModStatusLine
 *   One segment per mod; multiple mods join with "  ".
 *   Updates replace THAT mod's segment only; they do NOT wipe native indicators.
 *   Render: segments.map(s => s.text).join("  ") under the input.
 *   ModStatusLine has hardcoded paddingLeft:2 and sits AFTER a divider line
 *   (`lt.line.repeat(width)`), so it will always appear one row below the footer.
 *
 * `cmd.ui.widget` / `refreshWidgets`:
 *   Public API exists, but runtime is a no-op in 1.14.1 (wire-up pending).
 *
 * `cmd.addRenderer` + `cmd.showEntry`:
 *   Feed rows ABOVE the input. Append-only; no update/replace entry API.
 *
 * Notes on persistence across /reload and /resume:
 *   - `setStatus(null)` clears the segment; calling it onSessionEnd wipes the
 *     status before the new session repaints → avoided.
 *   - State is persisted via cmd.session.appendCustomEntry and re-read on start.
 */
const ANSI_CYAN = '\u001b[36m';
const ANSI_DIM = '\u001b[2m';
const ANSI_RESET = '\u001b[0m';
const BRAIN = '\uD83E\uDDE0';

const STATE_ENTRY_TYPE = 'commandcode-hud/state-v1';

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const branchNameFromStatus = (stdout: string): string | undefined => {
  const header = stdout.split(/\r?\n/).find(line => line.startsWith('## '));
  const headerText = header?.slice(3).trim() ?? '';
  if (!headerText) return undefined;
  if (headerText.startsWith('No commits yet on ')) {
    return headerText.slice('No commits yet on '.length).trim() || undefined;
  }
  const name = headerText.split('...')[0]?.trim() ?? '';
  return name === 'HEAD (no branch)' ? 'detached' : name || undefined;
};

const resolveModelName = (model: unknown, fallback = ''): string => {
  if (typeof model === 'string') return model || fallback;
  const m = record(model);
  return (
    text(m.displayName) ??
    text(m.display_name) ??
    text(m.name) ??
    text(m.id) ??
    fallback
  );
};

const shortModel = (full: string): string => {
  const lower = full.toLowerCase();
  if (lower.includes('sonnet')) return 'Sonnet';
  if (lower.includes('opus')) return 'Opus';
  if (lower.includes('haiku')) return 'Haiku';
  const slash = full.lastIndexOf('/');
  if (slash >= 0) return full.slice(slash + 1);
  return full;
};

const modelFromArgs = (): string | undefined => {
  const args = process.argv;
  const index = args.indexOf('--model');
  return index >= 0 ? text(args[index + 1]) : undefined;
};

const effortFromConfig = (model: string): string | undefined => {
  try {
    const config = JSON.parse(readFileSync(`${process.env.HOME}/.commandcode/config.json`, 'utf8')) as Record<string, unknown>;
    const efforts = record(config.reasoningEffort);
    return text(efforts[model]) ?? text(config.effort);
  } catch {
    return undefined;
  }
};

const modelFromConfig = (): string | undefined => {
  try {
    const config = JSON.parse(readFileSync(`${process.env.HOME}/.commandcode/config.json`, 'utf8')) as Record<string, unknown>;
    return text(config.model);
  } catch {
    return undefined;
  }
};

export default function (cmd: ModApi): void {
  let lastPublished = '';
  let currentBranch: string | undefined;
  const explicitModel = modelFromArgs();
  let currentModel = explicitModel ?? modelFromConfig() ?? 'gpt-5.6-luna';
  let currentEffort: string | undefined = effortFromConfig(currentModel);

  const render = (): string => {
    const parts: string[] = [];
    if (currentModel) {
      parts.push(`${ANSI_CYAN}${shortModel(currentModel)}${ANSI_RESET}`);
      if (currentEffort) parts.push(`${BRAIN} ${currentEffort}`);
    }
    if (currentBranch) parts.push(`${ANSI_CYAN}${currentBranch}${ANSI_RESET}`);
    else parts.push(`${ANSI_DIM}no-branch${ANSI_RESET}`);
    return parts.join('  ');
  };

  const publish = (force = false): void => {
    const next = render().trim();
    if (!force && next === lastPublished) return;
    lastPublished = next;
    cmd.ui.setStatus(next);
  };

  const persist = (): void => {
    cmd.session?.appendCustomEntry({
      customType: STATE_ENTRY_TYPE,
      data: {branch: currentBranch, model: currentModel, effort: currentEffort},
    });
  };

  const restore = (): void => {
    const session = cmd.session;
    if (!session) return;
    const last = session
      .getCustomEntries({customType: STATE_ENTRY_TYPE})
      .map(entry => record(entry).data)
      .at(-1);
    if (!last) return;
    currentBranch = text(last['branch']);
    currentModel = explicitModel ?? text(last['model']) ?? currentModel;
    currentEffort = text(last['effort']) ?? currentEffort ?? effortFromConfig(currentModel);
    lastPublished = '';
    publish(true);
  };

  const refreshBranch = async (): Promise<void> => {
    try {
      const result = await cmd.exec({
        command: 'git',
        args: ['status', '--porcelain=1', '--branch'],
        cwd: cmd.cwd,
      });
      currentBranch = result.code === 0 ? branchNameFromStatus(result.stdout) : undefined;
      persist();
      publish();
    } catch {
      currentBranch = undefined;
      persist();
      publish();
    }
  };

  const captureModelAndEffort = (event: unknown, forcePublish = false): void => {
    const value = record(event);
    const modelRaw = resolveModelName(value.model);
    // Effort comes as event.effort (string level) in 1.14.1; check string and object forms
    const effortDirect = text(value.effort);
    const effortObj = text(record(value.effort).level);
    const effortNew = effortDirect ?? effortObj;
    let changed = false;
    if (modelRaw) {
      currentModel = modelRaw;
      changed = true;
    }
    // Only overwrite effort if present; don't clear an earlier effort on empty events
    if (effortNew) {
      currentEffort = effortNew;
      changed = true;
    }
    if (changed) {
      persist();
      publish(forcePublish);
    }
  };

  cmd.hooks({
    onSessionStart: () => {
      restore();
      void refreshBranch();
    },
  });

  // No onSessionEnd setStatus(null): it wipes the segment on /reload before the
  // new session repaints. Persist instead so /resume and /new recover it.

  cmd.on('model_request_start', event => {
    captureModelAndEffort(event, true);
  });

  cmd.on('model_request_end', event => {
    captureModelAndEffort(event, true);
  });

  cmd.on('config_setting_changed', event => {
    const value = record(event);
    if (value.setting !== 'model') return;
    const model = resolveModelName(value.value, currentModel);
    if (!model) return;
    currentModel = model;
    currentEffort = effortFromConfig(model) ?? currentEffort;
    persist();
    publish(true);
  });

  cmd.on('run_end', () => {
    void refreshBranch();
  });

  // Immediate first paint for interactive sessions.
  restore();
  void refreshBranch();
  // Also publish model context early if we restored it, before any model event fires
  publish(true);
}
