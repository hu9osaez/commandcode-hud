# commandcode-hud

Mod nativo para [Command Code](https://commandcode.ai) que muestra el estado del workspace y de la sesión en la línea de status de Mods, debajo del footer nativo.

```text
gpt-5.6-luna 🧠 xhigh · ctx 4% · 46.8k/1M · main
```

## Qué muestra

- **Modelo** seleccionado y **esfuerzo** de reasoning (`🧠 effort`).
- **Contexto usado / límite** (`ctx % · usado/límite`), calculado desde `usage.inputTokens` del evento `model_request_end` y la ventana de contexto del modelo (52 modelos oficiales).
- **Rama Git** actual (o `no-branch` si no hay repositorio).
- El estado se persiste y restaura al reabrir la sesión o cambiar de sesión.

El Mod publica una única línea con `cmd.ui.setStatus`; las filas nativas de permisos, shortcuts y taste no se reemplazan.

## Instalación

### Desde npm

```sh
npm i -g @hu9osaez/commandcode-hud
```

O, como dependencia de desarrollo en un proyecto:

```sh
npm i -D @hu9osaez/commandcode-hud
npm run install:mod
```

`install:mod` copia el Mod a `~/.commandcode/mods/commandcode-hud.ts` de forma idempotente (no borra archivos existentes).

### Manual

```sh
mkdir -p ~/.commandcode/mods
cp commandcode-hud.mod.ts ~/.commandcode/mods/commandcode-hud.ts
```

## Verificación

```sh
cmd mods list
```

Debe aparecer:

```text
commandcode-hud · user · ~/.commandcode/mods/commandcode-hud.ts
```

Abrí una sesión nueva:

```sh
cmd
```

El HUD aparece como línea de status del Mod, debajo del input de Command Code.

## Recarga y sesiones

- `/reload` vuelve a cargar el Mod en la sesión actual.
- `/resume` restaura una sesión existente.
- `/new` inicia una sesión nueva.

El Mod persiste su último modelo, esfuerzo, contexto usado y rama mediante `cmd.session.appendCustomEntry`.

## Segmento de contexto

- **Usado**: `usage.inputTokens` del evento `model_request_end` (la misma fuente que la TUI usa como contexto actual).
- **Límite**: mapa de `contextWindow` por modelo (espejo del registro oficial de Command Code). Los IDs coinciden con `cmd --list-models` / `config.json`.
- Si el modelo no está en el mapa, el segmento `ctx` se omite en lugar de mostrar un valor inventado.

## Limitaciones de Command Code 1.14.1

- No existe un evento público para el comando `/model`: un cambio de modelo se refleja inmediatamente antes de la siguiente petición al modelo, no necesariamente en el instante de ejecutar `/model`. El Mod compensa vigilando `~/.commandcode/config.json` y actualizando al detectar el cambio.
- `cmd.ui.widget` existe en la API, pero todavía no renderiza en 1.14.1. `cmd.ui.setStatus` es la superficie soportada.

## Desarrollo

```sh
# Pruebas de helpers del Mod (branch, modelo, límites de contexto)
node --input-type=module -e "const m = await import('./commandcode-hud.mod.ts'); console.log(m.__test)"
```

## Licencia

MIT.
