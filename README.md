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

- **Inbox and Lists**: two sidebars, one key apart. Inbox sorts agents by what needs you, with T3-style Settle and Snooze; Lists shows spaces by project and agents by priority or by space, without Inbox's Settle and Snooze.
- **Home**: putting away the agent you're looking at lands on a quiet page, not the next card. What to look at next is yours to pick. Settings (`cmd-shift-,`) can make it go on to the next card instead, or make Home a terminal or a mod of your own.
- **One name, one set of marks**: cards, lists, tabs and pane headers name and mark each terminal the same way.
- **Go to** (`cmd-p`): jump to any pane, agent or program, by its name.
- **Actions**: T3 Code's run button for your own commands, in a new tab or a split.
- **Slim tabs and framed panes**, in T3 Code's look.
- **Other machines**: their spaces grouped by machine, their Inbox cards marked. In Lists, hover an Agents row to see its machine's name.
- **Files**: the space's folder, read-only, in a panel at the window's right: the tree at its outer edge, the file you pick beside it. It stays put as you switch tabs and follows you to another space. Hidden pages do no file refreshes, and full data is cached for only three recent spaces per page.
- **Review** (optional): what's left to review in the worktree, on the same panel's other page. Files and Review keep their own files, reading positions, line wrapping and tree widths; switching pages restores each one.

Each in detail: [the guide](docs/user/guide.md).

## Install

Ask your Herdr agent to add `herdr.dev/layouts/JinJieBeWater/herdr-t3`. By hand: copy `layouts/herdr-t3.json`, `layouts/herdr-t3.svg` and every `mods/t3-*` into `~/.config/herdr-app/`, and merge `keys.json` into yours.

Only want the Inbox? It is also published alone: [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox).

## Quick start

1. `cmd-shift-b` (or the button at the sidebar's top right) switches between Inbox and Lists.
2. In Inbox, hover a finished card and click `✓ Settle` to put it away; new work brings it back. `cmd-shift-s` settles the agent you're looking at and goes Home.
3. From Home, `cmd-]` opens the top card, so you can work down them one by one.
4. Hover a card and click the clock to Snooze it until a time you pick.

Dragging, sweeping across rows, pins and the rest: [Everyday use](docs/user/guide.md#everyday-use).

## Keys

| Key | Does |
| --- | --- |
| `cmd-shift-b` | Switch the sidebar between Inbox and Lists |
| `cmd-shift-s` | Settle the agent you're looking at and go Home, or bring it back |
| `cmd-]` / `cmd-[` | Next or previous agent, in the sidebar's order |
| `cmd-p` | Go to any pane |
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

It overwrites the layout and its mods and merges `keys.json`; your pins, settled agents, actions, theme and focus ring stay. What it keeps and what it doesn't: [Update](docs/user/guide.md#update).

## What it runs

- `t3-spaces`: read-only `git status` / `git rev-parse` in your spaces' folders, watches those repos for changes (`watchFolder`), and `hc machine ls --json`. Clicking Connect on a rebuilt machine runs `hc machine rm` and `hc machine add`.
- `t3-inbox`: `hc label <agent> settled=<ms>:<turn>` when an agent is settled or unsettled.
- `t3-inbox`: `hc label <agent> snoozed=<ms>` when an agent is snoozed or wakes.
- `t3-tabs`: `hc get` before closing a terminal, to see whether a program is running in it. `hc label` when `cmd-shift-s` settles or brings back an agent, and to give back an unread done (`herdr.seen`) or a Woke mark (`snoozed`) that Herdr cleared when it showed a tab you didn't pick, and `hc label <agent> snoozed=` when a failed turn or new work in view ends a snooze.
- `t3-agents`: `hc label <agent> snoozed=` when pinning a snoozed agent ends its snooze.
- `t3-chrome`: on macOS, when the zoom changes, it rewrites the window button position in the installed `layouts/herdr-t3.json`, so the buttons stay on the brand bar's middle line.
- `t3-files`, read-only, where the space is (on its machine): `git rev-parse`, `git status`, `git check-ignore` and `git ls-files` (with `--no-optional-locks`, so nothing is written under `.git`), `sh` to list a folder or, on another machine, to check a file's size and search paths, `find` outside Git, `base64` for another machine's images. It copies images it shows into `cache/t3-files/` and deletes them when it stops. Right-click: Reveal in Finder and Open in default app run `open` (`xdg-open` on Linux); Mention in agent pastes into the agent's terminal through the clipboard, then puts your clipboard back.
- `t3-spaces`, `t3-agents`, `t3-inbox`, `t3-new-menu`, `t3-picker`: for each space's icon, `git rev-parse --show-toplevel`, `sh` file tests and `base64` where the space is (on its machine); a found icon is copied into `cache/t3-icons/`.

No network requests.

## Extras (optional)

- **pulls.review**: a Review bar and the panel's Review page.
- **Theme export for Pi**: Pi's colors follow Herdr's.
- **Themes**: Catppuccin and T3 Code, light and dark.

How to add them: [the extras](docs/user/extras.md).

## Credits and license

`t3-chrome`, `t3-spaces`, `t3-agents`, `t3-tabs`, `t3-pane`, `t3-new-menu`, `t3-picker` and the layout start from Herdr App's shipped `workspace-chrome`, `spaces`, `agents`, `tabs`, `pane`, `new-menu`, `picker` and `main`. Settle follows T3 Code's design. The Catppuccin themes use the [Catppuccin](https://github.com/catppuccin/catppuccin) palette (MIT License, Copyright (c) 2021 Catppuccin); the T3 Code themes take [T3 Code](https://github.com/pingdotgg/t3code)'s default colors (MIT License, Copyright (c) 2026 T3 Tools Inc.). Icons are [Lucide](https://lucide.dev)'s (ISC License, Copyright (c) Lucide Contributors); file and folder icons in Files and Review are [Catppuccin's VS Code icons](https://github.com/catppuccin/vscode-icons) (MIT License, Copyright (c) 2023 Catppuccin, Copyright (c) 2023 thang-nm). Files ranks search results with [uFuzzy](https://github.com/leeoniya/uFuzzy) (MIT License, Copyright (c) 2022 Leon Sorokin). Review counts characters' widths with [get-east-asian-width](https://github.com/sindresorhus/get-east-asian-width)'s table (MIT License, Copyright (c) Sindre Sorhus). Apache-2.0, as Herdr App.

## More

- [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox): this layout's Inbox sidebar as a standalone mod.
- [herdling](https://github.com/JinJieBeWater/herdling): a macOS menu bar companion for Herdr.
- [pi-stuff](https://github.com/JinJieBeWater/pi-stuff): my Pi extensions and skills.
