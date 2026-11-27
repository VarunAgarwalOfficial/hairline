# hairline

> **Archived.** No longer maintained. This repository is kept as a record and is read-only.

Six interactive isometric line drawings ("figures") in the Hairline style, each one self-contained HTML page that responds to the pointer. They are built with Lucas Marques's [Hairline](https://github.com/lucasmarkes/hairline) engine (`kernel.js`) and page (`bench.html`), copied into `.agents/skills/hairline-create/` (source recorded in `skills-lock.json`); each figure is one `.js` file.

[Live demo](https://varunagarwalofficial.github.io/hairline/) · [MIT licence](LICENSE)

The figures, from the `means` line in each file:

| Figure | What it shows |
| --- | --- |
| `bloom` | Shrubs round a house grow where the pointer waters the garden. |
| `flip` | A clamshell phone whose lid swings open and shut as the pointer moves across. |
| `snap` | A flip phone that opens on hover; its buttons can be pressed by click or keyboard. |
| `storeys` | A two-storey house that opens into layers as the pointer moves up. |
| `swings` | A swing set with four kids; the swing under the pointer is pushed and its neighbours follow. |
| `two-swings` | Two kids on swings; hovering pushes one, and the other follows. |

## Running it

Open any `hairline-<name>.html` in a browser. Nothing to install.

To rebuild or check a figure, run the skill's scripts from this folder by their path (commands from the skill's `SKILL.md`):

```sh
node .agents/skills/hairline-create/build.mjs <name>.js        # writes hairline-<name>.html
node .agents/skills/hairline-create/validate.mjs hairline-<name>.html
node .agents/skills/hairline-create/look.mjs <name>.js --answer x,y,z --edge x,y,z
```

`look.mjs` needs a browser and installs `playwright-core` once, outside this folder. It writes the `-look.png`, `-blind.png` and `-motion.png` sheets. The `-rest.png` and `-snap-buttons.png` images probably come from its `--zoom` option; that is not confirmed.

## State

A finished set of six figures, archived on GitHub. `bloom` has no check images and `swings` has no `-rest.png`.

## Layout

| Path | What it holds |
| --- | --- |
| `<name>.js` | The source of each figure. |
| `hairline-<name>.html` | The built page for each figure (engine and figure inlined). |
| `hairline-<name>-*.png` | Check images from `look.mjs`: look sheet, blind pair, motion strip, rest view. |
| `.agents/skills/hairline-create/` | The skill: `SKILL.md`, rules, engine, bench page, build, validate and look scripts, two example figures. |
| `.claude/skills/hairline-create` | A link to the same skill folder. |
| `skills-lock.json` | Where the skill came from and its hash. |
| `index.html` | The demo page that lists the figures. |

## Licence

The figures are MIT, see [LICENSE](LICENSE). The Hairline engine and tools in `.agents/skills/hairline-create/`, also inlined into each `hairline-*.html` page, are by Lucas Marques under the MIT licence; the notice is in that folder's `LICENSE` and at the end of the top-level one.
