import {readFileSync, statSync} from 'node:fs';
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
const ANSI_YELLOW = '\u001b[33m';
const ANSI_GREEN = '\u001b[32m';
const ANSI_RED = '\u001b[31m';
const BRAIN = '\uD83E\uDDE0';

// Context windows per model, mirroring the official list at
// https://commandcode.ai/models (70 models) and Command Code 1.53.0's canonical
// registry (dist/cli.mjs getKnownModelContextWindow). Used to render `ctx used/limit`.
// IDs match `cmd --list-models` / config.json (lowercase).
// GLM-5.1, MiniMax M2.7 (paid) and Qwen 3.6.x are absent from the dist table;
// their values come from the official website.
const CONTEXT_LIMITS: Record<string, number> = {
  // GPT-6 / GPT-5.x
  'gpt-6-astra': 1_050_000,
  'gpt-5.6-luna': 1_050_000,
  'gpt-5.6-sol': 1_050_000,
  'gpt-5.6-terra': 1_050_000,
  'gpt-5.5': 400_000,
  'gpt-5.4': 400_000,
  'gpt-5.4-mini': 400_000,
  'gpt-5.3-codex': 400_000,
  // Claude
  'claude-opus-5': 1_000_000,
  'claude-opus-4-8': 1_000_000,
  'claude-opus-4-7': 1_000_000,
  'claude-sonnet-5': 1_000_000,
  'claude-sonnet-4-6': 1_000_000,
  'claude-fable-5-1': 1_000_000,
  'claude-fable-5': 1_000_000,
  'claude-haiku-4-5-20251001': 200_000,
  // DeepSeek
  'deepseek/deepseek-v4.1-flash': 1_000_000,
  'deepseek/deepseek-v4-flash-vision-exp': 1_000_000,
  'deepseek/deepseek-v4-flash-fast': 1_000_000,
  'deepseek/deepseek-v4-pro': 1_000_000,
  'deepseek/deepseek-v4-flash': 1_000_000,
  // Gemini
  'google/gemini-3.8-flash': 1_000_000,
  'google/gemini-3.7-flash': 1_048_576,
  'google/gemini-3.6-flash': 1_000_000,
  'google/gemini-3.5-flash': 1_000_000,
  'google/gemini-3.5-flash-lite': 1_000_000,
  'google/gemini-3.1-flash-lite': 1_000_000,
  // Grok
  'xai/grok-4.6': 500_000,
  'xai/grok-4.5': 500_000,
  // Kimi
  'moonshotai/kimi-k3': 1_000_000,
  'moonshotai/kimi-k2.7-code-highspeed': 262_000,
  'moonshotai/kimi-k2.7-code': 256_000,
  'moonshotai/kimi-k2.6': 256_000,
  'moonshotai/kimi-k2.5': 256_000,
  // GLM
  'z-ai/glm-5.3-flash': 1_048_576,
  'zai-org/glm-5.3': 1_000_000,
  'zai-org/glm-5.2': 1_000_000,
  'zai-org/glm-5.2-fast': 1_000_000,
  'zai-org/glm-5.1': 200_000,
  'zai-org/glm-5': 200_000,
  // Qwen
  'qwen/qwen3.8-max-0902': 1_000_000,
  'qwen/qwen3.8-flash': 1_000_000,
  'qwen/qwen3.8-27b': 262_144,
  'qwen/qwen3.8-max': 1_000_000,
  'qwen/qwen3.7-max': 1_000_000,
  'qwen/qwen3.7-plus': 1_000_000,
  'qwen/qwen3.7-flash': 1_000_000,
  'qwen/qwen3.6-max-preview': 200_000,
  'qwen/qwen3.6-plus': 200_000,
  // Muse
  'meta/muse-spark-1.3': 1_048_576,
  'meta/muse-spark-1.3-contributor': 1_048_576,
  'meta/muse-spark-1.1': 1_048_576,
  'meta/muse-spark-1.2': 1_048_576,
  'meta/muse-spark-1.2-contributor': 1_048_576,
  // MiniMax
  'minimaxai/minimax-m3': 1_000_000,
  'minimaxai/minimax-m3-free': 1_000_000,
  'minimaxai/minimax-m2.7-free': 197_000,
  'minimaxai/minimax-m2.7': 200_000,
  'minimaxai/minimax-m2.5': 200_000,
  // Step
  'stepfun/step-3.7-flash': 256_000,
  'stepfun/step-3.5-flash': 1_000_000,
  // Tencent
  'tencent/hy4-preview': 1_048_576,
  'tencent/hy3-paid': 262_144,
  'tencent/hy3': 262_144,
  // Fugu
  'sakana/fugu-ultra': 1_000_000,
  // Nemotron
  'nvidia/nemotron-3-ultra-550b-a55b': 1_000_000,
  // MiMo
  'xiaomi/mimo-v2.5-pro': 1_000_000,
  'xiaomi/mimo-v2.5': 1_000_000,
  // Inkling
  'thinkingmachines/inkling': 256_000,
  'thinkingmachines/inkling-small': 1_000_000,
  // Laguna
  'poolside/laguna-s-2.1-free': 256_000,
  // LongCat
  'meituan/longcat-2.0:free': 1_048_576,
  // Ling
  'inclusionai/ling-3.0-flash-sante:free': 262_144,
  'inclusionai/ling-3.0-flash-free': 256_000,
};

const contextLimitFor = (model: string | undefined): number => {
  if (!model) return 0;
  if (CONTEXT_LIMITS[model]) return CONTEXT_LIMITS[model];
  // Also accept short names (after the last "/") and case-insensitive lookups.
  const short = model.includes('/') ? model.slice(model.lastIndexOf('/') + 1) : model;
  const exact = CONTEXT_LIMITS[short] ?? CONTEXT_LIMITS[model.toLowerCase()];
  if (exact) return exact;
  // Reverse lookup: find any registered id ending with the given short name.
  for (const [id, limit] of Object.entries(CONTEXT_LIMITS)) {
    if (id.slice(id.lastIndexOf('/') + 1) === short) return limit;
  }
  // Unknown model: omit the ctx segment rather than show a wrong value.
  return 0;
};

const formatTokens = (value: number): string => {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(value);
};

const STATE_ENTRY_TYPE = 'commandcode-hud/state-v1';

const CTX_BAR_CELLS = 10;

const renderCtxBar = (pct: number): string => {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  const filled = Math.min(CTX_BAR_CELLS, Math.floor((clamped / 100) * CTX_BAR_CELLS));
  // Threshold colors mirror the reference statusline: green <70, yellow <90, red >=90.
  const color = clamped >= 90 ? ANSI_RED : clamped >= 70 ? ANSI_YELLOW : ANSI_GREEN;
  const warn = clamped >= 90 ? ` ${ANSI_RED}⚠${ANSI_RESET}` : '';
  let bar = '';
  for (let i = 0; i < CTX_BAR_CELLS; i++) bar += i < filled ? '█' : '░';
  return `${color}${bar} ${clamped}%${ANSI_RESET}${warn}`;
};

const dirtyFromStatus = (stdout: string): boolean =>
  stdout.split(/\r?\n/).some(line => line.trim() !== '' && !line.startsWith('## '));

const formatDuration = (elapsedMs: number): string | undefined => {
  const sec = Math.floor(elapsedMs / 1000);
  if (sec <= 0) return undefined;
  const min = Math.floor(sec / 60);
  if (min >= 60) {
    return `${Math.floor(min / 60)}h${min % 60}m`;
  }
  return `${min}m${sec % 60}s`;
};

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

const CONFIG_PATH = `${process.env.HOME}/.commandcode/config.json`;

const readModelConfig = (): {model?: string; effort?: string; mtimeMs?: number} => {
  try {
    const stat = statSync(CONFIG_PATH);
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Record<string, unknown>;
    const effortMap = record(parsed.reasoningEffort);
    const model = text(parsed.model);
    return {
      model,
      effort: model ? text(effortMap[model]) ?? undefined : text(parsed.effort) ?? undefined,
      mtimeMs: stat.mtimeMs,
    };
  } catch {
    return {};
  }
};

// Export for tests.
export const __test = {
  branchNameFromStatus,
  dirtyFromStatus,
  readModelConfig,
  contextLimitFor,
  formatTokens,
  formatDuration,
  renderCtxBar,
};

export default function (cmd: ModApi): void {
  let lastPublished = '';
  let currentBranch: string | undefined;
  const explicitModel = modelFromArgs();
  const initialConfig = readModelConfig();
  let currentModel = explicitModel ?? initialConfig.model ?? 'gpt-5.6-luna';
  let currentEffort: string | undefined = initialConfig.effort ?? effortFromConfig(currentModel);
  let usedTokens = 0;
  let currentDirty = false;
  let sessionStartedAt: number = Date.now();

  const render = (): string => {
    const segments: string[] = [];
    const modelParts: string[] = [];
    if (currentModel) {
      modelParts.push(`${ANSI_CYAN}${shortModel(currentModel)}${ANSI_RESET}`);
      if (currentEffort) modelParts.push(`${BRAIN} ${currentEffort}`);
    }
    if (modelParts.length) segments.push(modelParts.join(' '));
    const limit = contextLimitFor(currentModel);
    if (limit > 0) {
      const percent = Math.min(100, Math.round((usedTokens / limit) * 100));
      segments.push(
        `${renderCtxBar(percent)} · ${ANSI_YELLOW}${formatTokens(usedTokens)}/${formatTokens(limit)}${ANSI_RESET}`,
      );
    }
    if (currentBranch) {
      segments.push(`${ANSI_CYAN}${currentBranch}${currentDirty ? '*' : ''}${ANSI_RESET}`);
    } else {
      segments.push(`${ANSI_DIM}no-branch${ANSI_RESET}`);
    }
    const duration = formatDuration(Date.now() - sessionStartedAt);
    if (duration) segments.push(`${ANSI_DIM}${duration}${ANSI_RESET}`);
    return segments.join(' · ');
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
      data: {
        branch: currentBranch,
        dirty: currentDirty,
        model: currentModel,
        effort: currentEffort,
        usedTokens,
        sessionStartedAt,
      },
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
    const storedDirty = last['dirty'];
    if (typeof storedDirty === 'boolean') currentDirty = storedDirty;
    currentModel = explicitModel ?? text(last['model']) ?? currentModel;
    currentEffort = text(last['effort']) ?? currentEffort ?? effortFromConfig(currentModel);
    const storedTokens = record(last).usedTokens;
    if (typeof storedTokens === 'number') usedTokens = storedTokens;
    const storedStart = last['sessionStartedAt'];
    if (typeof storedStart === 'number' && storedStart > 0) sessionStartedAt = storedStart;
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
      currentDirty = result.code === 0 ? dirtyFromStatus(result.stdout) : false;
      persist();
      publish();
    } catch {
      currentBranch = undefined;
      currentDirty = false;
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
    // model_request_end usage → used context tokens (input + cache reads), same
    // source the TUI context meter uses.
    const usage = record(value.usage);
    const inputTokens = usage.inputTokens;
    if (typeof inputTokens === 'number' && inputTokens > 0) {
      usedTokens = inputTokens;
      changed = true;
    }
    if (changed) {
      persist();
      publish(forcePublish);
    }
  };

  // `/model` writes ~/.commandcode/config.json. Poll its mtime so the HUD
  // updates right after the user switches models, without waiting for the
  // next model_request_start.
  let lastConfigMtime = readModelConfig().mtimeMs ?? 0;
  const pollModelConfig = (): void => {
    const fresh = readModelConfig();
    if (fresh.mtimeMs === undefined || fresh.mtimeMs === lastConfigMtime) return;
    lastConfigMtime = fresh.mtimeMs;
    if (fresh.model && fresh.model !== currentModel) {
      currentModel = fresh.model;
      currentEffort = fresh.effort ?? currentEffort;
      persist();
      publish(true);
    }
  };
  setInterval(pollModelConfig, 2000).unref();

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
