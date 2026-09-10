#!/usr/bin/env node
/**
 * commandcode-hud — one-shot installer for the native Command Code mod.
 *
 * Run via: npx @hu9osaez/commandcode-hud
 *
 * Commands:
 *   (default) / install   Copy the packaged mod to ~/.commandcode/mods and verify.
 *   --verify              Check whether the installed mod matches the packaged one.
 *   --uninstall           Remove the installed mod.
 *   --help                Show usage.
 *   --version             Show the package version.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const VERSION = pkg.version;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOD_NAME = 'commandcode-hud.ts';
const PACKAGED_MOD = join(__dirname, '..', 'commandcode-hud.mod.ts');
const MODS_DIR = join(homedir(), '.commandcode', 'mods');
const INSTALLED_MOD = join(MODS_DIR, MOD_NAME);

// The Command Code runtime strips \n from mod status text (sanitizeStatusText).
// The two-line HUD needs it, so install patches the dist sanitizer. Exact,
// uniquely-occurring snippet; idempotent; reports when the vendor changed it.
const PATCH_FIND = 'sanitizeStatusText(e){return e.replace(/[\\r\\n\\t]/g," ")';
const PATCH_WITH = 'sanitizeStatusText(e){return e.replace(/[\\r\\t]/g," ")';

function findCliDist() {
  if (process.env.COMMANDCODE_DIST) return process.env.COMMANDCODE_DIST;
  const candidates = [];
  try {
    candidates.push(join(require('node:child_process').execSync('npm root -g', { encoding: 'utf8' }).trim(), 'command-code', 'dist', 'cli.mjs'));
  } catch {
    // npm not on PATH; fall through to execPath-relative candidate.
  }
  candidates.push(join(process.execPath, '..', '..', 'lib', 'node_modules', 'command-code', 'dist', 'cli.mjs'));
  return candidates.find((c) => existsSync(c));
}

function patchStatuslineSanitizer() {
  const dist = findCliDist();
  if (!dist) return { status: 'dist-not-found' };
  const src = readFileSync(dist, 'utf8');
  if (src.includes(PATCH_WITH)) return { status: 'already-patched', dist };
  if (!src.includes(PATCH_FIND)) return { status: 'pattern-missing', dist };
  const tmp = `${dist}.hud-patch-tmp`;
  writeFileSync(tmp, src.replace(PATCH_FIND, PATCH_WITH));
  renameSync(tmp, dist);
  return { status: 'patched', dist };
}

function patchStateLabel(result) {
  switch (result.status) {
    case 'patched': return `✔ Patched CLI sanitizer for two-line HUD (${result.dist})`;
    case 'already-patched': return `✔ CLI sanitizer already patched (${result.dist})`;
    case 'pattern-missing': return `⚠ Could not patch CLI (pattern changed) — HUD falls back to a single line (${result.dist})`;
    case 'dist-not-found': return '⚠ Command Code dist not found — HUD falls back to a single line';
    default: return `⚠ CLI patch skipped (${result.status})`;
  }
}

const HELP = `commandcode-hud v${VERSION}

Installs the commandcode-hud native mod for Command Code.

Usage:
  npx @hu9osaez/commandcode-hud           Install (or update) the mod and verify
  npx @hu9osaez/commandcode-hud --verify  Check the installed mod matches this version
  npx @hu9osaez/commandcode-hud --uninstall  Remove the installed mod
  npx @hu9osaez/commandcode-hud --help    Show this help
  npx @hu9osaez/commandcode-hud --version Show the package version

Installs to: ${INSTALLED_MOD}`;

function verifyInstalled() {
  if (!existsSync(INSTALLED_MOD)) {
    console.error(`✖ Not installed (missing ${INSTALLED_MOD})`);
    process.exit(1);
  }
  const a = readFileSync(INSTALLED_MOD, 'utf8');
  const b = readFileSync(PACKAGED_MOD, 'utf8');
  if (a !== b) {
    console.error(`✖ Installed mod differs from package v${VERSION} — run install to update`);
    process.exit(1);
  }
  console.log(`✔ Installed mod matches package v${VERSION}`);
  console.log(patchStateLabel(patchStatuslineSanitizer()));
  process.exit(0);
}

function install() {
  mkdirSync(MODS_DIR, { recursive: true });
  copyFileSync(PACKAGED_MOD, INSTALLED_MOD);
  console.log(`✔ Installed commandcode-hud to ${INSTALLED_MOD}`);
  console.log(patchStateLabel(patchStatuslineSanitizer()));
  if (existsSync(join(homedir(), '.commandcode', 'settings.json'))) {
    console.log('ℹ Remember to reload Command Code (or start a new session) for the mod to take effect.');
  }
  try {
    verifyInstalled();
  } catch {
    // verifyInstalled exits; keep behavior explicit
  }
}

function uninstall() {
  if (!existsSync(INSTALLED_MOD)) {
    console.log(`○ Not installed (nothing at ${INSTALLED_MOD})`);
    return;
  }
  rmSync(INSTALLED_MOD);
  console.log(`✖ Removed ${INSTALLED_MOD}`);
}

const args = process.argv.slice(2);
const flag = args.find((a) => a.startsWith('-')) || 'install';

switch (flag) {
  case '--help':
  case '-h':
    console.log(HELP);
    break;
  case '--version':
  case '-v':
    console.log(VERSION);
    break;
  case '--verify':
    verifyInstalled();
    break;
  case '--uninstall':
    uninstall();
    break;
  default:
    install();
    break;
}
