# hairline

Six interactive isometric line drawings ("figures") in the Hairline style, each one self-contained HTML page that responds to the pointer. They were made with the `hairline-create` skill (source recorded in `skills-lock.json`), which supplies a fixed engine (`kernel.js`) and page (`bench.html`); each figure is one `.js` file.

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

State not recorded. `bloom` has no check images and `swings` has no `-rest.png`; whether that means they were not checked is not recorded.

## Layout

| Path | What it holds |
| --- | --- |
| `<name>.js` | The source of each figure. |
| `hairline-<name>.html` | The built page for each figure (engine and figure inlined). |
| `hairline-<name>-*.png` | Check images from `look.mjs`: look sheet, blind pair, motion strip, rest view. |
| `.agents/skills/hairline-create/` | The skill: `SKILL.md`, rules, engine, bench page, build, validate and look scripts, two example figures. |
| `.claude/skills/hairline-create` | A link to the same skill folder. |
| `skills-lock.json` | Where the skill came from and its hash. |
