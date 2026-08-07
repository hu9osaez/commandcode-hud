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

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
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
  if (a === b) {
    console.log(`✔ Installed mod matches package v${VERSION}`);
    process.exit(0);
  }
  console.error(`✖ Installed mod differs from package v${VERSION} — run install to update`);
  process.exit(1);
}

function install() {
  mkdirSync(MODS_DIR, { recursive: true });
  copyFileSync(PACKAGED_MOD, INSTALLED_MOD);
  console.log(`✔ Installed commandcode-hud to ${INSTALLED_MOD}`);
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
