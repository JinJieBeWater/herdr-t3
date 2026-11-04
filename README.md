# Herdr T3

English · [中文](README.zh-CN.md)

A [T3 Code](https://github.com/pingdotgg/t3code)-like layout for Herdr App: Lists (Spaces + Agents) or an Inbox sidebar with T3-style Settle, slim tabs and framed panes.

![Herdr T3](preview.png)

Only want the Settle sidebar? It is also published alone: [herdr-t3-focus](https://github.com/JinJieBeWater/herdr-t3-focus).

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
- **Slim tabs, framed panes**: 28px pill tabs; rounded panes with a 28px header (name, folder, status; split, zoom and close on hover).
- **New**: the tab bar's `+` opens a terminal tab in the current space; the sidebar's New tab picks a space (or a new one) first. No agent picker: start agents in the terminal.
- **Actions**, as T3 Code's run button: at the tab bar's top right, `▶` runs the action you ran last, `▾` lists them all (click one to run it), with a gear to edit each and Add action. Each action is a command run in a new tab, or split right/down, in the focused terminal's folder or its own. Edited in the app, not in a file.

## Install

Ask your Herdr agent to add `herdr.dev/layouts/JinJieBeWater/herdr-t3`. By hand: copy `layouts/herdr-t3.json`, `layouts/herdr-t3.svg` and every `mods/t3-*` into `~/.config/herdr-app/`, merge `keys.json` into yours. How it should look and behave: [RECIPE.md](RECIPE.md).

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

What I add to the `global` section:

| Key | Command | Does |
| --- | --- | --- |
| `cmd-]` / `cmd-[` | `agent.next` / `agent.prev` | Walks agents in the Inbox cards' order; settled ones come last |
| `cmd-p` | `mod.open:picker` | The same picker as Inbox's Search |

Tabs, spaces and panes keep Herdr's own keys. Pinning, dragging and Clear in Inbox are by mouse.

## Update

Herdr doesn't update mods or layouts from others, and adding this again would install a renamed second copy (`t3-inbox-2`), since an install never overwrites. Update by overwriting instead:

- Tell your Herdr agent: "Update Herdr T3 from github.com/JinJieBeWater/herdr-t3: overwrite my installed `mods/t3-*` and `layouts/herdr-t3.*` with the repo's latest, then run `herdr-app check` on each mod." If the first install renamed something because of a clash, overwrite under that name.
- By hand: copy the same files over the old ones. Mods reload by themselves on save; no restart.
- Kept: pins, folds, sort, the Settled shelf and settled agents. They live in `data/`, `shared.json` and terminal labels, not in the mod folders. Lost: your own edits to the overwritten files, including the focus ring color; set it again after overwriting the layout.
- `keys.json` and the extras stay as they are; compare them with the repo only if the commit log mentions them. Commits marked `!` rename things (for example `refactor!: rename the layout and theme to herdr-t3`); follow what they rename.
- From before Focus became Inbox (`t3-focus` → `t3-inbox`): rename `data/t3-focus` to `data/t3-inbox` (the cards' order and shelves), in `keys.json` change `t3-focus.settle` to `t3-inbox.settle`, then delete `mods/t3-focus`.
- The agent view is removed (last in commit `a8cbcd4`): after overwriting, delete `"cmd-shift-a": "t3-tabs.view"` from `keys.json`.

## What it runs

- `t3-spaces`: read-only `git status` / `git rev-parse` in your spaces' folders, watches those repos for changes (`watchFolder`), and `hc machine ls --json`. Clicking Connect on a rebuilt machine runs `hc machine rm` and `hc machine add`.
- `t3-inbox`: `hc label <agent> settled=<ms>:<turn>` when an agent is settled or unsettled.

No network requests.

## Extras (optional)

Not part of the layout and not copied by an install; add them by hand if you want them.

### pulls.review

`extras/mods/pulls-review/` reviews the focused worktree with [pulls.review](https://github.com/antfu/pulls.review): its uncommitted changes when there are any, else the current branch against the default branch.

With it installed, the tab bar shows a Review bar before `+`, with only what there is: `4 ahead of main` (the branch's commits not on the default branch, with `· merged?` once its upstream is gone), `3 uncommitted` (uncommitted files), `↑2` (commits your upstream doesn't have), `↓1` (commits from your upstream). Click one to review just that diff. Click the branch icon to search and pick something else: a commit of this branch (on the default branch, a recent one), or another local branch against the default branch. The icon stays when there are no counts. It follows the focused pane; with the review pane focused, the terminals in its tab. The counts read your remote-tracking refs as they are: nothing is fetched for you.

Where a review opens is `open` in `extras/mods/pulls-review/config.json`:

- `"herdr"` (the default): in a pane split off beside the agent (`extras/mods/review/`; zoom it with Herdr's zoom key for more room), or, with Open in set to Tab in the pane's gear, in a tab of its own, named for what it reviews (`review · fix vs origin/main`). Another click in the same tab (with Tab, the same space) opens the new diff in that pane. It shows the groups (the AI analysis, else rule-based ones), each group's summary, its files with their notes and highlighted diffs, unified or split, a whole file around its hunks, one commit at a time and reviewed marks, shared with the browser. An analysis runs with the local agent picked when you press Analyze; as the app never starts one by itself, analyzing on open is off until you turn it on, and even then an analysis of an older version waits for Re-analyze. As in the app, the analysis's state is the Analyze button's: while it runs or once it fails, the button opens what it's doing or why it failed. The gear in the pane's header turns that on, picks the agent and its model (from its list or typed in) and the language the analysis writes in (the system's by default, as in the app; shared with the browser), and sets the view: unified or split, files as a tree or a list, groups as tabs or a sidebar, and where the next review opens: a pane or a tab. As in the app, from 1024px a column beside the diff holds the header and files of the group scrolled to, and the groups are tabs over the diff (one row, scrolling sideways when they don't fit) unless the sidebar is picked; narrower, there's no file column, the groups are always tabs, and the header with the tabs slides away after a long scroll down and comes back on any scroll up. A group's title and summary show only at the top of its diffs, scrolling away with them. The button left of the gear, as the app's, expands or collapses every file, or collapses the reviewed ones or the tests; marking a file reviewed collapses it and unmarking opens it again. Split falls back to unified where the diff is under 640px; narrower still, the header's text buttons turn to icons. Keys in the pane: `j`/`k` next and previous file, `r` reviewed, `f` whole file, `c` collapse, `s` unified or split. Needs the fork, `jin.review` 0.3.4-fork.2 or later.
- `"pwa"`: the fork's installed jin.review app (`jin.review -d --pwa`). Install the app first: run `jin.review -d` once, open the page in Chrome, install it as an app and allow it to open `web+pullsreview` links.
- `"browser"`: the fork in the browser (`jin.review -d`).
- `"official"`: the `pulls.review` CLI. Each worktree gets its own server, which herdr-core keeps running in the background (`hc ls --label pulls-review.root=<folder>`; stop one with `hc kill <address>`). The first open signs the browser in; later ones open a new tab on the same server.

With the fork (`"herdr"`, `"pwa"`, `"browser"`), a click also starts the diff's AI analysis, or follows the one already running.

1. Install one pulls.review CLI on Herdr's `PATH`: `bun add --global jin.review` for the fork ([my fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo), which installs next to `pulls.review`; one background server for every repo, stopped with `jin.review --stop`), or `bun add --global pulls.review` for `"official"`.
2. Copy `extras/mods/pulls-review/` (and, for `"herdr"`, `extras/mods/review/`) into `~/.config/herdr-app/mods/` and set `open` in its `config.json`. The Review bar opens it; there's no key to bind.
3. For the pane's analysis, pick a local agent once, with the gear in the pane's header or in the browser's review settings (`jin.review -d`): the daemon keeps that choice.

- Local folders only: a pane on another machine shows an error.
- Runs read-only git (`git status`, `git rev-parse`, `git symbolic-ref`) and `pulls.review` or `jin.review`; the pane talks to the jin.review daemon on `127.0.0.1` with the session it keeps in `~/.pulls.review`, and starts it when it isn't running.

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
