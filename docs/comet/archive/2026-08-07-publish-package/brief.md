# Outcome

`commandcode-hud` se convierte en un paquete npm publicable y documentado. El paquete instala el Mod nativo de Command Code desde `~/.commandcode/mods/` (vía `npm i` + copia/script) y expone la integración actual: modelo + effort + contexto usado/límite + rama Git en el status line de Mods (`cmd.ui.setStatus`). El README documenta instalación, uso, recarga, sesiones y las limitaciones conocidas de Command Code 1.14.1.

# Scope

- Crear `package.json` con datos de publish: `name`, `version`, `description`, `license`, `repository`, `engines` (Node >=20), `files`, `bin`/`scripts`, `keywords`.
- Crear `README.md` con lo necesario para instalar y usar el Mod.
- Mantener `commandcode-hud.mod.ts` como fuente única del Mod.
- Actualizar el README para reflejar el HUD actual (incluye el segmento `ctx % · usado/límite`).

# Non-goals

- No publicar realmente a npm en este cambio (solo dejar el paquete listo para `npm publish`).
- No migrar el Mod a una arquitectura CLI/binario separada: sigue siendo un Mod TypeScript.
- No crear build/transpilación de TypeScript: el Mod se distribuye como fuente `.ts`.
- No resolver el evento público de `/model` en Command Code 1.14.1 (queda como limitación documentada).

# Acceptance examples

- `package.json` existe, es JSON válido, y `npm pack --dry-run` incluye `commandcode-hud.mod.ts` y `README.md`.
- `engines.node` es `>=20`; `name` es `@hu9osaez/commandcode-hud` (scope definido por el usuario).
- `README.md` documenta instalación (`mkdir -p ~/.commandcode/mods && cp`), verificación (`cmd mods list`), sesión nueva (`cmd`), recarga (`/reload`) y límites conocidos.
- El README describe el render actual con el segmento de contexto.

# Constraints and invariants

- El Mod debe seguir cargando en Command Code 1.14.1 sin errores (`mod_error` = 0).
- `cmd.ui.setStatus` es la única superficie de render soportada; `cmd.ui.widget` no renderiza en 1.14.1.
- No se reemplazan las filas nativas de permisos, shortcuts ni taste.
- Los datos de contexto (`ctx % · usado/límite`) usan `usage.inputTokens` del evento y el mapa de límites por modelo (52 modelos oficiales), omitiendo el segmento si el modelo es desconocido.

# Decisions

- **Publicación**: scoped `@hu9osaez/commandcode-hud` (scope definido por el usuario en la re-confirmación del contrato).
- **Node mínimo**: `engines.node` = `>=20` (decisión del usuario).

# Open questions

- (resolved) CONFIRM: paquete scoped `@<scope>/commandcode-hud` con Node >=20, README documentando el HUD actual (modelo · ctx · rama), sin publish real en este cambio.

# Verification expectations

- `npm pack --dry-run` lista los archivos esperados.
- Carga del Mod con 0 `mod_error` tras copiar a `~/.commandcode/mods/`.
- README y package.json coherentes con las decisiones.
