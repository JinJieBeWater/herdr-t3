# Herdr T3

English · [中文](README.zh-CN.md)

A [T3 Code](https://github.com/pingdotgg/t3code)-like layout for Herdr App: Lists (Spaces + Agents) or an Inbox sidebar with T3-style Settle, slim tabs and framed panes.

![Herdr T3](preview.png)

Only want the Settle sidebar? It is also published alone: [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox).

## Philosophy

**Save human attention.**

You can keep adding agents, but your attention doesn't grow with them. Everything in Herdr T3 is designed around this.

> It's so nice to have 14 threads running and zero visible. Why let working threads get in the way of things that need your attention?
>
> — [Theo](https://x.com/theo/status/2114131018575962496)

The Inbox follows [T3 Code](https://github.com/pingdotgg/t3code).

## Features

- **Two sidebars, one key apart** (`cmd-shift-b`): Lists, or Inbox.
  - Spaces: repo, branch and ahead/behind only when they're unusual; worktrees folded under their checkout; grouped by machine once there's more than one.
  - Agents: grouped by space or by priority, pins, sub-agents nested under their parent.
  - Inbox: T3-style Settle. Agents that need you stay up top as cards; finished ones are settled by hand into a quiet list and come back on new work. Busy agents fold into a Working shelf.
- **One name everywhere**: Inbox cards, the agents list, tabs and pane headers name a terminal the same way: its Pi session, then a tab you named, then a telling terminal title, else the program. Two Pis in one tab read as their own sessions.
- **The same status marks everywhere**: a spinner while working, `!` when blocked or its turn failed, a dot when done. While Inbox shows, a settled agent's done dot leaves the tabs and pane headers too.
- **Slim tabs, framed panes**: 24px tabs, as T3's panel tabs; rounded panes with a 28px header (name, folder, status; split, zoom and close on hover).
- **New**: the tab bar's `+` opens a terminal tab in the current space; the sidebar's New tab picks a space (or a new one) first. No agent picker: start agents in the terminal.
- **Actions**, as T3 Code's run button: at the tab bar's top right, `▶` runs the action you ran last, `▾` lists them all (click one to run it), with a gear to edit each and Add action. Each action is a command run in a new tab, or split right/down, in the focused terminal's folder or its own. Edited in the app, not in a file. It is the `t3-actions` mod, installed with the layout and also published [on its own](https://github.com/JinJieBeWater/herdr-t3-actions) for other layouts.

## Install

Ask your Herdr agent to add `herdr.dev/layouts/JinJieBeWater/herdr-t3`. By hand: copy `layouts/herdr-t3.json`, `layouts/herdr-t3.svg`, every `mods/t3-*` into `~/.config/herdr-app/`, and merge `keys.json` into yours. How it should look and behave: [RECIPE.md](RECIPE.md).

## Quick start

- **Sidebar**: the button at the top right of the sidebar (or `cmd-shift-b`) switches between Lists and Inbox; the one next to it hides the sidebar.
- **Inbox**: hover a finished card and click `✓ Settle` to put it away; new work brings it back, or click the undo arrow on its row. `cmd-shift-s` settles the agent in view, or brings it back if it is settled; with `cmd-]` you can walk the cards and settle each as you finish it. Drag a card or row, as in T3: move it 6px to lift it; the `Pinned` and `Active` labels open, the lifted row says what letting go will do (Pin, Unpin, Settle, Un-settle) and the list opens a gap where it will land. Pinned keeps your order; Active and Settled keep their own. Esc or leaving the sidebar sideways puts it back; leaving off the top or bottom lands it where the badge says; Working cards don't lift. Press a card's `✓ Settle` (or a settled row's undo) and move across rows to settle (or bring back) the whole run. The agents list shares these pins.
- **Focus ring** (off by default): in `~/.config/herdr-app/layouts/herdr-t3.json`, set the pane's `focus.color` from `"background"` to `"accent"` (or any theme color) to ring the focused pane. It applies on save.

## Keys

The layout's own, in the `layout:herdr-t3` section of `keys.json` (an install merges them):

| Key | Command | Does |
| --- | --- | --- |
| `cmd-shift-b` | `t3-chrome.sidebar` | Switches the sidebar between Lists and Inbox |
| `cmd-shift-s` | `t3-inbox.settle` | Settles the agent in view and moves to the next card, or brings it back if it's settled. Only while Inbox shows; a busy or pinned agent stays |
| `cmd-]` / `cmd-[` | `t3-chrome.next` / `t3-chrome.prev` | The next or previous agent. With Inbox showing, as T3's: the rows it draws, in its order (a folded shelf only its row in view), stopping at either end. With Lists showing, Herdr's `agent.next` / `agent.prev` |
| `cmd-w`, `ctrl-alt-shift-x` | `t3-tabs.close-tab` | Closes the tab, asking first if a program is running in it |
| `cmd-shift-w`, `ctrl-alt-x` | `t3-tabs.close-pane` | Closes the pane, asking first if a program is running in it |

What I add to the `global` section:

| Key | Command | Does |
| --- | --- | --- |
| `cmd-p` | `mod.open:picker` | The same picker as Inbox's Search |

Tabs, spaces and panes keep Herdr's own keys. Pinning, dragging and Clear in Inbox are by mouse.

## Update

Herdr doesn't update mods or layouts from others, and adding this again would install a renamed second copy (`t3-inbox-2`), since an install never overwrites. Update by overwriting instead:

- Tell your Herdr agent: "Update Herdr T3 from github.com/JinJieBeWater/herdr-t3: overwrite my installed `mods/t3-*` and `layouts/herdr-t3.*` with the repo's latest, then run `herdr-app check` on each mod." If the first install renamed something because of a clash, overwrite under that name.
- By hand: copy the same files over the old ones. Mods reload by themselves on save; no restart.
- Kept: pins, folds, sort, the Settled shelf and settled agents. They live in `data/`, `shared.json` and terminal labels, not in the mod folders. Lost: your own edits to the overwritten files, including the focus ring color; set it again after overwriting the layout.
- `keys.json` and the extras stay as they are; compare them with the repo only if the commit log mentions them. Commits marked `!` rename things (for example `refactor!: rename the layout and theme to herdr-t3`); follow what they rename.
- From before Focus became Inbox (`t3-focus` → `t3-inbox`): rename `data/t3-focus` to `data/t3-inbox` (the cards' order and shelves), in `keys.json` change `t3-focus.settle` to `t3-inbox.settle`, then delete `mods/t3-focus`.
- Actions and the Review bar moved out of `t3-tabs`: copy the new `mods/t3-actions` too (your actions are kept: they live in `shared.json`), and for Review overwrite `mods/pulls-review` with this repo's `extras/mods/pulls-review` and add `extras/mods/review` (below).
- `cmd-]` / `cmd-[` are the layout's own now (`t3-chrome.next` / `.prev`): add them to your `layout:herdr-t3` section; they win over `agent.next` in `global`.
- Closing a tab or pane asks first: add the `cmd-w`, `ctrl-alt-shift-x`, `cmd-shift-w` and `ctrl-alt-x` lines from the repo's `keys.json` to your `layout:herdr-t3` section; they win over `tab.close` and `pane.close` in `global`.
- The agent view is removed (last in commit `a8cbcd4`): after overwriting, delete `"cmd-shift-a": "t3-tabs.view"` from `keys.json`.

## What it runs

- `t3-spaces`: read-only `git status` / `git rev-parse` in your spaces' folders, watches those repos for changes (`watchFolder`), and `hc machine ls --json`. Clicking Connect on a rebuilt machine runs `hc machine rm` and `hc machine add`.
- `t3-inbox`: `hc label <agent> settled=<ms>:<turn>` when an agent is settled or unsettled.
- `t3-spaces`, `t3-inbox`, `t3-new-menu`: for each space's icon, `git rev-parse --show-toplevel`, `sh` file tests and `base64` where the space is (on its machine); a found icon is copied into `cache/t3-icons/`.

No network requests.

## Extras (optional)

Not part of the layout and not copied by an install; add them by hand if you want them.

### pulls.review

`extras/mods/pulls-review` and `extras/mods/review`: a Review bar and a review pane, for [my pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo) (its CLI is `jin.review`). The bar counts what there is to review in the focused worktree (the branch's commits past the default branch, uncommitted files, commits to push and pull), and a click opens that review in a pane beside the agent. Also published alone as [herdr-pulls-review](https://github.com/JinJieBeWater/herdr-pulls-review): install it as [its README](https://github.com/JinJieBeWater/herdr-pulls-review#install) says (`herdr.dev/mods/JinJieBeWater/herdr-pulls-review`, or copy both folders into `~/.config/herdr-app/mods/`), then ask your Herdr agent to put its block in this layout's `tabs-row` row, right after `tabs`. `scripts/sync.sh` keeps that block when it syncs the layout. The pane's tab and header show its analysis with this layout's marks: `t3-tabs` and `t3-pane` read `shared("review.status")`.

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

- [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox): this layout's Inbox sidebar as a standalone mod.
- [herdling](https://github.com/JinJieBeWater/herdling): a macOS menu bar companion for Herdr.
- [pi-stuff](https://github.com/JinJieBeWater/pi-stuff): my Pi extensions and skills.
