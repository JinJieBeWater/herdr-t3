# Herdr T3

English · [中文](README.zh-CN.md)

A [T3 Code](https://github.com/pingdotgg/t3code)-like layout for Herdr App: Lists (Spaces + Agents) or an Inbox sidebar with T3-style Settle, slim tabs, framed panes, and an agent view that shows one agent at a time.

![Herdr T3](preview.png)

Only want the Settle sidebar? It is also published alone: [herdr-t3-focus](https://github.com/JinJieBeWater/herdr-t3-focus).

## Features

- **Two sidebars, one key apart** (`cmd-shift-b`): Lists, or Inbox.
  - Spaces: repo, branch and ahead/behind only when they're unusual; worktrees folded under their checkout; grouped by machine once there's more than one.
  - Agents: grouped by space or by priority, pins, sub-agents nested under their parent.
  - Inbox: T3-style Settle. Agents that need you stay up top as cards; finished ones are settled by hand into a quiet list and come back on new work. Busy agents fold into a Working shelf.
- **Agent view** (`cmd-shift-a`, or the button left of `+`): the work area shows one agent full size instead of the active tab, and clicking in the sidebar picks which. The tab bar turns into a bar naming that agent; the scroll wheel walks agents. Anything that would land out of sight brings the tabs back: a new shell or split in this space (focused), starting something from `+`, moving focus to a shell. A new agent pane (often an agent starting another) doesn't take the view; it shows up in the sidebar.
- **One name everywhere**: Inbox cards, the agents list, tabs and pane headers name a terminal the same way: its Pi session, then a tab you named, then a telling terminal title, else the program. Two Pis in one tab read as their own sessions.
- **The same status marks everywhere**: a spinner while working, `!` when blocked, a dot when done. While Inbox shows, a settled agent's done dot leaves the tabs and pane headers too.
- **Slim tabs, framed panes**: 28px pill tabs; rounded panes with a 28px header (name, folder, status; split, zoom and close on hover).
- **New**: the tab bar's `+` opens a terminal tab in the current space; the sidebar's New tab picks a space (or a new one) first. No agent picker: start agents in the terminal.

## Install

Ask your Herdr agent to add `herdr.dev/layouts/JinJieBeWater/herdr-t3`. By hand: copy `layouts/herdr-t3.json`, `layouts/herdr-t3.svg` and every `mods/t3-*` into `~/.config/herdr-app/`, merge `keys.json` into yours. How it should look and behave: [RECIPE.md](RECIPE.md).

## Quick start

- **Sidebar**: the button at the top right of the sidebar (or `cmd-shift-b`) switches between Lists and Inbox; the one next to it hides the sidebar.
- **Inbox**: hover a finished card and click `✓ Settle` to put it away; new work brings it back, or click the undo arrow on its row. `cmd-shift-s` settles the agent in view, or brings it back if it is settled; with `cmd-]` you can walk the cards and settle each as you finish it. Drag a card or row, as in T3: move it 6px to lift it; the `Pinned` and `Active` labels open, the lifted row says what letting go will do (Pin, Unpin, Settle, Un-settle) and the list opens a gap where it will land. Pinned keeps your order; Active and Settled keep their own. Esc or leaving the sidebar sideways puts it back; leaving off the top or bottom lands it where the badge says; Working cards don't lift. Press a card's `✓ Settle` (or a settled row's undo) and move across rows to settle (or bring back) the whole run. The agents list shares these pins.
- **Agent view**: the button left of `+` (or `cmd-shift-a`) shows one agent full size; click a card to change which. A new shell, split or anything from `+` brings the tabs back.
- **Focus ring** (off by default): in `~/.config/herdr-app/layouts/herdr-t3.json`, set the pane's `focus.color` from `"background"` to `"accent"` (or any theme color) to ring the focused pane. It applies on save.

## Keys

The layout's own, in the `layout:herdr-t3` section of `keys.json` (an install merges them):

| Key | Command | Does |
| --- | --- | --- |
| `cmd-shift-b` | `t3-chrome.sidebar` | Switches the sidebar between Lists and Inbox |
| `cmd-shift-a` | `t3-tabs.view` | Agent view on or off |
| `cmd-shift-s` | `t3-inbox.settle` | Settles the agent in view and moves to the next card, or brings it back if it's settled. Only while Inbox shows; a busy or pinned agent stays |

What I add to the `global` section:

| Key | Command | Does |
| --- | --- | --- |
| `cmd-]` / `cmd-[` | `agent.next` / `agent.prev` | Walks agents in the Inbox cards' order; settled ones come last |
| `cmd-p` | `mod.open:picker` | The same picker as Inbox's Search |
| `cmd-shift-r` | `mod.open:pulls-review` | Review the focused repo (needs the pulls.review extra) |

Tabs, spaces and panes keep Herdr's own keys. Pinning, dragging and Clear in Inbox are by mouse.

## Update

Herdr doesn't update mods or layouts from others, and adding this again would install a renamed second copy (`t3-inbox-2`), since an install never overwrites. Update by overwriting instead:

- Tell your Herdr agent: "Update Herdr T3 from github.com/JinJieBeWater/herdr-t3: overwrite my installed `mods/t3-*` and `layouts/herdr-t3.*` with the repo's latest, then run `herdr-app check` on each mod." If the first install renamed something because of a clash, overwrite under that name.
- By hand: copy the same files over the old ones. Mods reload by themselves on save; no restart.
- Kept: pins, folds, sort, the Settled shelf and settled agents. They live in `data/`, `shared.json` and terminal labels, not in the mod folders. Lost: your own edits to the overwritten files, including the focus ring color; set it again after overwriting the layout.
- `keys.json` and the extras stay as they are; compare them with the repo only if the commit log mentions them. Commits marked `!` rename things (for example `refactor!: rename the layout and theme to herdr-t3`); follow what they rename.
- From before Focus became Inbox (`t3-focus` → `t3-inbox`): rename `data/t3-focus` to `data/t3-inbox` (the cards' order and shelves), in `keys.json` change `t3-focus.settle` to `t3-inbox.settle`, then delete `mods/t3-focus`.

## What it runs

- `t3-spaces`: read-only `git status` / `git rev-parse` in your spaces' folders, watches those repos for changes (`watchFolder`), and `hc machine ls --json`.
- `t3-inbox`: `hc label <agent> settled=<ms>:<turn>` when an agent is settled or unsettled.

No network requests.

## Extras (optional)

Not part of the layout and not copied by an install; add them by hand if you want them.

### pulls.review

`extras/mods/pulls-review/` opens the focused pane's repository in [pulls.review](https://github.com/antfu/pulls.review): its uncommitted changes when there are any, else what pulls.review opens by default (the current branch against the default branch).

- **Needs the CLI from [my fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo)** (`multi-repo` branch). The mod runs `pulls.review -d --pwa`: `-d` hands the repo to one background server shared by every repo, `--pwa` opens the installed pulls.review app instead of a browser tab. Upstream pulls.review has neither flag.
- Local folders only: a pane on another machine shows an error.
- Install: copy `extras/mods/pulls-review/` into `~/.config/herdr-app/mods/`, then add a key to the `global` section of your `keys.json`: `"cmd-shift-r": "mod.open:pulls-review"`.
- Runs read-only `git status --porcelain` and `pulls.review`.
- This layout's tab bar has no button for it; use the key or the command palette.

### Theme and settings from the preview

`extras/themes/herdr-t3.json` is the dark theme in the screenshot: canvas and chrome `#141418`, accent and working `#6b93ff`, blocked `#f0a33a`. Copy it into `~/.config/herdr-app/themes/`. Named like the layout, it is the layout's own: Settings offers it only while you are in Herdr T3, so pick it there. The rest is in `settings.json`:

```json
{
  "appearance": "dark",
  "font": "Maple Mono NF CN",
  "ui_font": "Maple Mono NF CN",
  "font_size": 12,
  "minimum_contrast": 3
}
```

Herdr doesn't ship [Maple Mono NF CN](https://github.com/subframe7536/maple-font): install it, or leave the font lines out to keep Herdr's JetBrains Mono and Geist.

## Credits and license

`t3-chrome`, `t3-spaces`, `t3-agents`, `t3-tabs`, `t3-pane`, `t3-new-menu` and the layout start from Herdr App's shipped `workspace-chrome`, `spaces`, `agents`, `tabs`, `pane`, `new-menu` and `main`. Settle follows T3 Code's design. Apache-2.0, as Herdr App.

## More

- [herdr-t3-focus](https://github.com/JinJieBeWater/herdr-t3-focus): this layout's Inbox sidebar as a standalone mod.
- [herdling](https://github.com/JinJieBeWater/herdling): a macOS menu bar companion for Herdr.
- [pi-stuff](https://github.com/JinJieBeWater/pi-stuff): my Pi extensions and skills.
