# Verification report — npx-runner

# Acceptance evidence


<!-- comet-native:acceptance-evidence:start -->
[
  {
    "acceptance_id": "acceptance-0e4c1d15452e0052555f98d60dcff1d60eb2cbac86b714f763b1d86b319a321e",
    "status": "passed",
    "evidence_refs": [
      "runtime/evidence/receipts/6b0946cc85260968015f18d430298701e23f08ea063cc0679569fbb0ec8f486e.json"
    ]
  },
  {
    "acceptance_id": "acceptance-a40d659215c60671f3762ee032b166c0b7e66c84c799bb95e4c3b0976f62f41a",
    "status": "passed",
    "evidence_refs": [
      "runtime/evidence/receipts/0aeb13b8a3f1da0def4cc358a78527bc846a898674a0979f0d2a62d24d119b55.json"
    ]
  },
  {
    "acceptance_id": "acceptance-e83bed9f6e9d165b8132bd4d698c286c1c2e4ff972325821ed9602f3cee252b5",
    "status": "passed",
    "evidence_refs": [
      "runtime/evidence/receipts/2afe796d8291b1d30f90750d9dad911d8215744fdfae436a7a555c612eb5b92e.json"
    ]
  },
  {
    "acceptance_id": "acceptance-ff225f15ffedd170423c31f49f354a0948638b0fe250241bf4c977351a3a93c7",
    "status": "passed",
    "evidence_refs": [
      "runtime/evidence/receipts/f693f7f04f994c596bfc4f646fd6e897341b692cd33f376d1c2e7dd9c435dfeb.json"
    ]
  }
]
<!-- comet-native:acceptance-evidence:end -->


# Checks

- npm pack includes 5 files (LICENSE, README, bin, mod, package.json).
- bin runs under Node 20; no runtime deps; shebang present.
- Temp-HOME run: install → verify (exit 0) → uninstall → verify (exit 1).
- Overwrite: pre-existing installed mod replaced by packaged version.

# Commands and results

- `npm pack --dry-run` → OK (5 files)
- `node bin/commandcode-hud.js --version` → `0.1.0`, exit 0
- `node bin/commandcode-hud.js --help` → usage text, exit 0
- Temp HOME install → `✔ Installed ...`, verify exit 0
- Temp HOME `--verify` → `✔ matches`, exit 0
- Temp HOME `--uninstall` → removed; `--verify` exit 1
- Overwrite test → installed mod == packaged mod

# Skipped checks

- `npm publish` (real publish is a non-goal; verified via `npm pack --dry-run`).

# Spec consistency

- package.json declares `bin` → `bin/commandcode-hud.js`; files list includes mod, bin, README, LICENSE.
- No `install` script remains (one-shot npx usage).
- README fully English, documents npx usage, verification, sessions, context segment, and 1.14.1 limitations.

# Known limitations and risks

- `npx` will fetch the package on first run; network required.
- Overwrite behavior replaces an existing user-installed mod (confirmed decision D3).

# Conclusion

All acceptance items pass; package is ready for `npm publish`.
