# commandcode-hud

Mod nativo para Command Code que muestra el estado persistente del workspace en la línea de status de Mods.

## Qué muestra

```text
gpt-5.6-luna  🧠 xhigh  main
```

- Modelo seleccionado y esfuerzo de reasoning.
- Rama Git actual.
- Estado restaurado al reabrir o cambiar de sesión cuando Command Code conserva el estado del Mod.

## Instalación local

Command Code carga Mods TypeScript desde `~/.commandcode/mods/`.

```sh
mkdir -p ~/.commandcode/mods
cp commandcode-hud.mod.ts ~/.commandcode/mods/commandcode-hud.ts
cmd mods list
```

Debe aparecer:

```text
commandcode-hud · user · ~/.commandcode/mods/commandcode-hud.ts
```

Abrí una sesión nueva con:

```sh
cmd
```

El Mod publica mediante `cmd.ui.setStatus`, debajo del footer nativo de Command Code. Las filas nativas de permisos, shortcuts y taste no se reemplazan.

## Recarga y sesiones

- `/reload` vuelve a cargar el Mod en la sesión actual.
- `/resume` restaura una sesión existente.
- `/new` inicia una sesión nueva.

El Mod persiste su último modelo, esfuerzo y rama mediante `cmd.session.appendCustomEntry`.

## Limitación de Command Code 1.14.1

Command Code expone `model_request_start` y `model_request_end` a los Mods. No expone un evento público específico para el comando `/model`; por eso un cambio de modelo se refleja inmediatamente antes de la siguiente petición al modelo, no necesariamente en el instante de ejecutar `/model`.

`cmd.ui.widget` existe en la API, pero todavía no renderiza en Command Code 1.14.1. `cmd.ui.setStatus` es la superficie soportada para este Mod.
