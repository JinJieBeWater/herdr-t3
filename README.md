# Herdr T3

English · [中文](README.zh-CN.md)

A layout for [Herdr App](https://herdr.dev) that lets you keep many agents running and look only at the ones that need you.

![Herdr T3](preview.png)

## Why

> It's so nice to have 14 threads running and zero visible. Why let working threads get in the way of things that need your attention?
>
> — [Theo](https://x.com/theo/status/2114131018575962496)

I'd worked this way in T3 Code: what's running stays out of sight, what needs me shows up, I put it away when I'm done, and it comes back by itself when something new happens. I wanted to work the same way in Herdr, so I brought over T3 Code's Inbox and its look, and fitted them to Herdr's tabs, panes and machines.

## Features

- **Inbox search** shows matching agents in a compact list. Use ↑ and ↓ to choose a result and Enter to open it.
- **Inbox and Lists**: two sidebars, switched with `cmd-shift-l` or in Layout Settings. Inbox sorts agents by attention, with Settle, Snooze and Mark unread (putting an idle agent back to Done from its menu). **Settled** holds put-away agents, and **Filter by space** lists only spaces with Inbox entries or spaces already selected. Lists shows spaces and their agents.
- **Switching spaces** brings the destination tab bar, terminal and saved right panel into view together, including when returning from Home.
- **Home**: putting away the agent you're looking at lands on a quiet page, not the next card. What to look at next is yours to pick. Settings (`cmd-shift-,`) can make it go on to the next card instead, or make Home a terminal or a mod of your own.
- **One name, one set of marks**: cards, lists, tabs and pane headers name and mark each terminal the same way.
- **Go to** (`cmd-p`): jump to any pane, agent or program, by its name. When recent panes change order, Enter follows the pane you selected.
- **Clean up** (`cmd-shift-r` / `ctrl-alt-r`, or the trash can in the sidebar footer) reclaims what's finished without leaving Inbox: settled agents and idle shells fold into one block that **Close** ends, and each program left behind, still running where no agent is at work any more, is a card you can go to or **Stop**.
- **New** lists open spaces first, followed by remembered projects whose last terminal closed. Pick a remembered project to reopen it in its original folder and on its original machine.
- **Details** (`cmd-shift-b`): locked computer/directory, Open in and global Actions, then Review: one click shows Review, its arrow picks the range. Installed T3 editors, including VSCodium and JetBrains, share one preference with Files; choosing only remembers it, and the main button opens it. Right-click the card to choose what to show.
- **Slim tabs and framed panes**, in T3 Code's look. In Inbox, clicking the space name in the tab bar breadcrumb opens a menu with New tab and all agents, sub-agents and terminal programs in that space.
- **Sub-agent menu**: a descendant count opens only the tree, in its original order. Click a row or use arrows and Enter to peek; right-click for the same agent menu as the sidebar, including Send back and Copy address. Each row has the mark an Agents row uses: idle shows elapsed time, Failed is red, and a done dot goes once you've seen it.
- **Other machines**: their spaces grouped by machine, their Inbox cards marked. In Lists, hover an Agents row to see its machine's name.
- **Disconnect warning**: a machine heading warns when its agents will stop after you disconnect. Click the warning for Herdr's fix instructions; nothing privileged runs automatically.
- **Files**: a read-only T3-style tree, the same as Review's, and one tab per file. Search keeps the tree, directory breadcrumbs keep a return trail, and the header's controls keep fixed slots across Preview/Code. Hide retains tabs; close releases them. Large trees cancel obsolete expansion work and draw only visible rows. Drag a file or folder row into a terminal to insert its path without Enter; cross-machine copies and refusals follow Herdr’s rules. Insert into terminal remains in the menu.
- **Review** (optional): one closable tab per space, with its own range and reading position. Switching retains it; closing and re-adding starts from the default range. Drag file/folder rows into terminals or use Files' same right-click menu; deleted files only offer Copy path and cannot drag, and subgroup rows have neither action. Right-click preserves the current file and reviewed boxes.

Each in detail: [the guide](docs/user/guide.md).

## Install

Requires Herdr 0.1.16 or newer.

Ask your Herdr agent to add `herdr.dev/layouts/JinJieBeWater/herdr-t3`. By hand: copy `layouts/herdr-t3.json`, `layouts/herdr-t3.svg` and every `mods/t3-*` into `~/.config/herdr-app/`, and merge `keys.json` into yours.

Only want the Inbox? It is also published alone: [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox).

## Quick start

1. `cmd-shift-l` switches Inbox and Lists; `cmd-shift-b` opens Details.
2. In Inbox, hover a finished card and click `✓ Settle` to put it away; new work brings it back. `cmd-shift-s` settles the agent you're looking at and goes Home.
3. From Home, `cmd-]` opens the top card, so you can work down them one by one.
4. Hover a card and click the clock to Snooze it until a time you pick.

Dragging, sweeping across rows, pins and the rest: [Everyday use](docs/user/guide.md#everyday-use).

## Keys

| Key | Does |
| --- | --- |
| `cmd-shift-b` | Toggle Details |
| `cmd-shift-s` | Settle the agent you're looking at and go Home, or bring it back |
| `cmd-]` / `cmd-[` | Next or previous agent, in the sidebar's order |
| `cmd-p` | Go to any pane |
| `cmd-shift-r` / `ctrl-alt-r` | Open Clean up |
| `cmd-shift-h` | Go Home |
| `cmd-shift-,` | The layout's settings |
| `cmd-alt-b` | Show or hide the space panel, on the page last shown |
| `cmd-shift-g` | Open Review, or close the panel showing it (Review extra) |
| `cmd-t` | New tab here; at Home, pick the space first |

All of them: [Keys](docs/user/guide.md#keys).

## Update

```sh
git clone --depth 1 https://github.com/JinJieBeWater/herdr-t3 && herdr-t3/scripts/update.sh
```

It checks your configuration and required mod entry points before copying files. It updates the layout and its mods and merges `keys.json`. Your pins, settled agents, actions, theme, focus ring and installed Review bar settings stay. Uninstalled extras lose their layout blocks. See [Update](docs/user/guide.md#update).

## What it runs

- `t3-spaces`: read-only `git status` / `git rev-parse` in your spaces' folders, watches those repos for changes (`watchFolder`), and `hc machine ls --json`. Clicking Connect on a rebuilt machine runs `hc machine rm` and `hc machine add`.
- `t3-inbox`: `hc label <agent> settled=<ms>:<turn>` when an agent is settled or unsettled.
- `t3-inbox`: `hc label <agent> snoozed=<ms>` when an agent is snoozed or wakes.
- `t3-inbox` identifies linked checkouts with `git rev-parse` and `git worktree list --porcelain -z` in the pane's working directory on its machine.
- `t3-tabs`: `hc get` before closing a terminal, to see whether a program is running in it. `hc label` when `cmd-shift-s` settles or brings back an agent, when Mark unread writes `herdr.seen` and clears `settled` or `snoozed`, when giving back an unread done (`herdr.seen`) or a Woke mark (`snoozed`) that Herdr cleared on a tab you didn't pick, and `hc label <agent> snoozed=` when a failed turn or new work in view ends a snooze.
- `t3-tabs`: `hc get` to check whether a shell is idle and eligible for **Clean up**, and which process a running one shows.
- `t3-agents`: `hc label <agent> snoozed=` when pinning a snoozed agent ends its snooze.
- `t3-actions`: reads ComputerName, probes installed editors with `open -Ra`, and opens the selected directory with `open`. Its Review row uses the Review page's shared, read-only Git scope helpers asynchronously; it performs no Git writes.
- `t3-chrome`: on macOS, when the zoom changes, it rewrites the window button position in the installed `layouts/herdr-t3.json`, so the buttons stay on the brand bar's middle line; it also rewrites the sidebar's minimum width there, so the sidebar is never narrower than its top row.
- `t3-files`, read-only, where the space is (on its machine): `git rev-parse`, `git status`, `git check-ignore` and `git ls-files` (with `--no-optional-locks`, so nothing is written under `.git`), `sh` to list a folder or, on another machine, to check a file's size and search paths, `find` outside Git, `base64` for another machine's images. It copies images it shows into `cache/t3-files/` and deletes them when it stops. Right-click, on macOS: Open, Reveal in Finder and Open with run `open`; Insert into agent terminal pastes into the tab's last active terminal through the clipboard, then puts your clipboard back.
- `t3-spaces`, `t3-agents`, `t3-inbox`, `t3-tabs`, `t3-new-menu`, `t3-picker`, `t3-actions`: for each space's icon, `git rev-parse --show-toplevel`, `sh` file tests and `base64` where the space is (on its machine); a found icon is copied into `cache/t3-icons/`.
- `t3-menu`: `git rev-parse` in a space's folder, on its machine, to tell a linked worktree from the repository's own checkout for its menu. `t3-chrome`, `t3-tabs` and `t3-files`: `git rev-parse --show-toplevel` in the folder the tab works in, on this machine, to know whether Review can read it. `t3-chrome`: `ls` of the installed `mods` folder, to list what Settings offers as Home.

The layout sends no telemetry. The optional Review extra uses its configured analysis service.

## Extras (optional)

- **pulls.review**: the panel's Review surface, and a Review bar the layout doesn't have by default but you can add.
- **Theme export for Pi**: Pi's colors follow Herdr's.
- **asciicn wallpaper**: Home as a still picture in your theme's colours: four built in, your own images in Dots, Braille, Blocks or Quadrants, chosen from `+` or dropped on Home. Frame any picture with the wheel, trackpad or drag; in a light theme an image is drawn like ink on paper. See [the extras](docs/user/extras.md#asciicn-wallpaper).
- **Themes**: Catppuccin and T3 Code, light and dark.

How to add them: [the extras](docs/user/extras.md).

## Credits and license

`t3-chrome`, `t3-spaces`, `t3-agents`, `t3-tabs`, `t3-pane`, `t3-new-menu`, `t3-picker` and the layout start from Herdr App's shipped `workspace-chrome`, `spaces`, `agents`, `tabs`, `pane`, `new-menu`, `picker` and `main`. Settle follows T3 Code's design. The Catppuccin themes use the [Catppuccin](https://github.com/catppuccin/catppuccin) palette (MIT License, Copyright (c) 2021 Catppuccin); the T3 Code themes take [T3 Code](https://github.com/pingdotgg/t3code)'s default colors (MIT License, Copyright (c) 2026 T3 Tools Inc.). Icons are [Lucide](https://lucide.dev)'s (ISC License, Copyright (c) Lucide Contributors). The file trees in Files and Review and the panel labels use original [T3 Code](https://github.com/pingdotgg/t3code) (MIT) and [Pierre](https://github.com/pierrecomputer/trees) (Apache-2.0) icon shapes, colored by the active theme. Review counts characters' widths with [get-east-asian-width](https://github.com/sindresorhus/get-east-asian-width)'s table (MIT License, Copyright (c) Sindre Sorhus). Apache-2.0, as Herdr App.

## More

- [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox): this layout's Inbox sidebar as a standalone mod.
- [herdling](https://github.com/JinJieBeWater/herdling): a macOS menu bar companion for Herdr.
- [pi-stuff](https://github.com/JinJieBeWater/pi-stuff): my Pi extensions and skills.
