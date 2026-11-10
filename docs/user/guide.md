# Herdr T3 guide

English · [中文](guide.zh-CN.md)

Each part in more detail than the [README](../../README.md).

## Features

- **Two sidebars, one key apart** (`cmd-shift-b`): Inbox organizes by attention and Lists by project; `cmd-]` and `cmd-[` walk either one. Settle, Snooze hiding a working agent, and landing on Home when the agent in view is closed are Inbox's; in Lists, closing it goes back to the tab you were on before. The tab bar differs too.
  - Spaces: repo, branch and ahead/behind only when they're unusual; worktrees folded under their repo, checkout open or not; grouped by machine once there's more than one.
  - Agents: grouped by space or by priority, pins, sub-agents nested under their parent.
  - Inbox: T3-style Settle. Agents that need you stay up top as cards; finished ones are settled by hand into a quiet list and come back on new work. Busy agents fold into a Working shelf. Snooze hides any agent that doesn't need you until a time you pick.
- **One name everywhere**: Inbox cards, the agents list, tabs and pane headers name a terminal the same way: its Pi session while Pi runs in it, then a tab you named, then a telling terminal title, else the program. Two Pis in one tab read as their own sessions; lazygit started where Pi was reads as lazygit, not the old session.
- **The same status marks everywhere**: a spinner while working, `!` when blocked or its turn failed, a dot when done. A settled or snoozed agent's done dot leaves everywhere, in Lists too; only Inbox hides a snoozed agent that's working, elsewhere it still spins. While Inbox shows, the tabs show no marks at all: what needs you is the sidebar's to say.
- **Slim tabs, framed panes**: 24px tabs, as T3's panel tabs; rounded panes with a 28px header (name, folder, status; split, zoom and close on hover); split, the headers of the panes you're not in dim, as T3's. An agent with sub-agents shows how many there, or how many need you; click it to list just this agent's sub-agents, one line each: its program icon, name, how long it has been working or what it waits on, and at the right its own status, marked as in Agents; nested ones indented. Hover one for its details, and pick one to peek it. This is how Inbox reaches a sub-agent. Zoom a split tab and the tab bar shows its panes, a segment each: click one to zoom it instead, `⧉` to see them all again.
- **The tab bar with Inbox**: about the agent you're looking at, the card Inbox lights. At the left its space, its parent if it's a sub-agent, and its name; click the space for an empty tab there, the one already waiting or else a new one, in place of `+`; the name or `⌄` opens the agent's menu: Pin, Snooze and Settle, as on its card, and Rename when it's alone in its tab. Right-clicking the name opens the same menu, as in T3; right-clicking the space opens the space's menu. Only the agent you're looking at: another agent in the same tab is reached by its card, or its pane. At the right, apart: its sub-agents' tabs, then the tabs with no agent. With a program in focus the agent stays, unlit; in a tool's tab you went to from the bar it dims, and a click goes back. Once you start something new, from the space at the left or with `cmd-t`, there's only the space, until you look at an agent again. In that agent's pane, shown alone, the header leaves out the name the bar already says.
- **New**: the tab bar's `+` opens a terminal tab in the current space (with Inbox, the space at the bar's left does that, going to an empty tab already there first); the sidebar's New tab, in Lists and Inbox alike, picks a space first. Its New space asks which machine once there is more than one; `cmd-n` doesn't ask and uses the current space's machine. No agent picker: start agents in the terminal.
- **Home**: settling or snoozing the agent in view lands on one quiet place, not the next card, so what to look at next stays yours. Its buttons, or `cmd-]`, `cmd-p` and `cmd-t`, say what's next; Undo brings the agent back. Rather go on to the next card, or have Home be a terminal or another mod? See Settings below. `cmd-shift-h` or Herdr's logo at the sidebar's top left goes there anytime. It takes no number among your spaces. It's one thing alone, its page, a terminal or a mod, with no pane header: nothing to split or close, and an agent never stays there. With the sidebar shown, the empty tab bar folds away and Home fills the height.
- **Go to** (`cmd-p`, or Inbox's Search): a row for every pane, agents and programs alike, named and marked as its pane header is (a tab's name counts only if you gave it), so typing `lazygit` lands on its pane, beside an agent or not, in any space. The first row goes back to the pane your last jump from here left, so `cmd-p`, Enter goes back and forth.
- **Actions**, as T3 Code's run button: at the tab bar's top right, `▶` runs the action you ran last, `▾` lists them all (click one to run it), with a gear to edit each and Add action. Each action is a command run in a new tab, or split right/down, in the focused terminal's folder or its own. Edited in the app, not in a file. It is the `t3-actions` mod, installed with the layout and also published [on its own](https://github.com/JinJieBeWater/herdr-t3-actions) for other layouts.
- **Other machines**: spaces group by machine once there is more than one, and Inbox cards from elsewhere carry a server mark with no separate tooltip. Lists' Agents rows show the machine's name only in their hover details. Hover an Inbox card to see its machine's name too. Add a machine from the server icon in the sidebar footer; a rebuilt one offers Connect, and New space asks which machine.
- **Program icons**: Inbox, Agents, tabs, pane headers, Go to and sub-agent menus use Herdr's official artwork, including its original whitespace and colors. Icon slots follow each component's size.
- **Project icons**: a space shows its repo's favicon, found on its own machine, else a monogram in one of T3's colors.
- **Closing asks first**: a tab's or pane's ×, `cmd-w`, `cmd-shift-w` and the right-click menus' Close confirm while a program is running in it, and close at once when none is.
- **Review** (optional, [see Extras](extras.md#pullsreview)): a bar in the tab row counts what there is to review in the focused worktree, and a click opens that review: one per space, in a pane or a tab, brought up if it's already open. Switching commits is the pane's own. Its pane header (and in Lists its tab) show the analysis with the layout's marks, and the Inbox gives it a card.

## Everyday use

- **Sidebar**: the button at the top right of the sidebar (or `cmd-shift-b`) switches between Lists and Inbox; the one next to it hides the sidebar.
- **Inbox**: hover a finished card and click `✓ Settle` to put it away; new work brings it back, or click the undo arrow on its row. `cmd-shift-s`, with the sidebar hidden too (not in Lists), settles the agent in view and lands on Home, or brings it back if it is settled. An agent you bring back yourself, with the undo arrow, a drag out of Settled or `cmd-shift-s`, goes on top of Active. `Undo` puts it back where it was. `cmd-]` then opens the top card, so you can work down them one at a time. Drag a card or row, as in T3: move it 6px to lift it; the `Pinned` and `Active` labels open, the lifted row says what letting go will do (Pin, Unpin, Settle, Un-settle) and the list opens a gap where it will land. Pinned keeps your order; Active and Settled keep their own. Esc or leaving the sidebar sideways puts it back; leaving off the top or bottom lands it where the badge says; Working cards don't lift. Press a card's `✓ Settle` (or a settled row's undo) and move across rows to settle (or bring back) the whole run. The agents list shares these pins. A review has a card of its own, on Working while it analyzes and back in Active when that ends: click it to get back from anywhere, and Settle closes it and goes back where you opened it from (it reopens from the Review bar, with your marks and analysis).
- **Settings**: the sliders button in the sidebar's footer, or `cmd-shift-,`, opens the layout's own settings, laid out as Herdr's. Changes apply at once and survive updates.
  - **After putting away**: Home (the default), or Next card: settling, snoozing, dragging or sweeping away the agent in view opens the next card, and Home once none is left. Closing an agent's tab still goes to Home.
  - **Home shows**: Default, the page with its three buttons; Terminal, a shell in your home folder; or a mod of your own. A mod is offered once its `mod.json` in `~/.config/herdr-app/mods` says `"home": true`. Home swaps at once. Start an agent in Home's terminal and that space becomes an ordinary one, named for its folder, right where you are; the next time you go Home you get a new Home.
- **Focus ring** (off by default): in `~/.config/herdr-app/layouts/herdr-t3.json`, set the pane's `focus.color` from `"background"` to `"accent"` (or any theme color) to ring the focused pane. It applies on save.
- **Snooze**: hover a card (working ones too, not one that needs you), click the clock and pick a time. It waits on the Snoozed shelf and wakes where it was, marked `Woke` until you look at it or click that. It shows meanwhile while it needs you; a failed turn, new work you give it in view (in Lists too), a pin or Settle ends the snooze. `Undo` takes it back for 5 seconds; on the shelf, hover a row for the crossed-out alarm clock (press and move across rows to wake the run), or drag it out.

## Keys

The layout's own, in the `layout:herdr-t3` section of `keys.json` (an install merges them). They cover macOS's keys only: `keys.json` can't bind a key by platform, so on Linux and Windows Herdr's own keys (`ctrl-shift-w` closing a tab, `alt-1…` picking a space and the rest) still run Herdr's commands, skipping the layout's rules such as asking before a close and leaving Home out of the count. Bind them to the commands below in your own `keys.json`.

| Key | Command | Does |
| --- | --- | --- |
| `cmd-shift-b` | `t3-tabs.sidebar` | Switches the sidebar between Lists and Inbox |
| `cmd-shift-s` | `t3-tabs.settle` | Settles the agent in view and goes to Home, or brings it back if it's settled. With Inbox selected, shown or hidden; in Lists it does nothing. A busy agent stays, a pinned one loses its pin |
| `cmd-shift-h` | `t3-tabs.home` | Goes to Home |
| `cmd-shift-,` | `t3-tabs.settings` | Opens the layout's settings |
| `cmd-t`, `ctrl-alt-c` | `t3-tabs.new` | A new tab here; at Home, New, which picks the space first |
| `ctrl-1…9`, `ctrl-alt-shift-1…9` | `t3-tabs.space:<n>` | Your nth space, not counting Home |
| `cmd-alt-]` / `cmd-alt-[`, `ctrl-alt-shift-]` / `ctrl-alt-shift-[` | `t3-tabs.space-next` / `t3-tabs.space-prev` | The next or previous space, going around Home |
| `cmd-1…9`, `ctrl-alt-1…9` | `t3-tabs.tab:<n>` | The nth tab the bar shows |
| `cmd-shift-]` / `cmd-shift-[`, `ctrl-tab` / `ctrl-shift-tab`, `ctrl-alt-]` / `ctrl-alt-[` | `t3-tabs.tab-next` / `t3-tabs.tab-prev` | The next or previous tab the bar shows |
| `cmd-p` | `mod.open:t3-picker` | Go to any pane by its name or program, or back (the same as Inbox's Search) |
| `cmd-]` / `cmd-[` | `t3-tabs.next` / `t3-tabs.prev` | The next or previous top-level agent, in the selected sidebar's order, stopping at either end, shown or hidden. Inbox walks the rows it draws (a folded shelf only its row in view); Lists walks folded groups too |
| `cmd-w`, `ctrl-alt-shift-x` | `t3-tabs.close-tab` | Closes the tab, asking first if a program is running in it |
| `cmd-shift-w`, `ctrl-alt-x` | `t3-tabs.close-pane` | Closes the pane, asking first if a program is running in it |

With a dialog or popup open (Go to, New, a menu, Settings, the command palette, the Actions editor and the like), these close-tab and close-pane keys close it instead, as in Herdr's own layout (the `mod:…` sections of `keys.json`).

Otherwise tabs, spaces and panes keep Herdr's own keys. Pinning and dragging in Inbox are by mouse; Clear takes the keyboard as other buttons do.

By keyboard: move onto a sidebar list with Herdr's `pane.go` and Tab walks every control in the window, the Review bar's counts and logo included, with Enter or Space doing what a click does. In New and Go to, Tab also reaches the footer's buttons (New space, `← Spaces`, New tab).

## Update

Herdr doesn't update mods or layouts from others, and adding this again would install a renamed second copy (`t3-inbox-2`), since an install never overwrites. Update by overwriting instead:

```sh
git clone --depth 1 https://github.com/JinJieBeWater/herdr-t3 && herdr-t3/scripts/update.sh
```

Or tell your Herdr agent: "Update Herdr T3: clone github.com/JinJieBeWater/herdr-t3, run its `scripts/update.sh`, then run `herdr-app check` on each `mods/t3-*`." Mods reload by themselves on save; no restart. It needs `jq` and `rsync`, and stops before changing anything if one is missing or your `keys.json` or layout isn't valid JSON.

- It overwrites `mods/t3-*` and `layouts/herdr-t3.*`, deleting files that are gone, and the Review and theme-export extras and the extra themes you've installed. Extras you haven't are left out.
- It merges `keys.json`: the repo's keys go into your `layout:herdr-t3` section and the popups' `mod:…` sections, replacing the same key, and it prints each one it replaced so a remap can go back. Your other keys and sections stay. It also prints keys of yours that aren't in the repo: an old one (`"cmd-shift-a": "t3-tabs.view"`, say) can be deleted.
- Kept: pins, folds, sort, the layout's settings, the Settled shelf and settled agents, which live in `data/`, `shared.json` and terminal labels, and your actions. From the installed layout: the theme, the sidebar you were on, the focus ring color and the Review and theme-export blocks.
- Lost: your other edits to the overwritten files; make those again. Going on to the next card after a Settle is a setting now, not an edit.
- If the first install renamed something because of a clash, the script doesn't know: it installs the original names, so point the layout back at your copy or delete it.
- What changed, and what some keys now do: the [changelog](../../CHANGELOG.md). From before Focus became Inbox (`t3-focus` → `t3-inbox`), first rename `data/t3-focus` to `data/t3-inbox` (the cards' order and shelves) and delete `mods/t3-focus`.

## Known limits

- Home is a space of its own: switch to another layout, run `herdr-app ls` or look from another machine, and it shows as one.
- Rename Home and another window on the same Herdr core won't know it: it makes a second Home.
- A space on another machine has no Review bar.
- Until the Inbox has shown once since Herdr started, it doesn't keep its card order while the sidebar is hidden, so `cmd-]` and `cmd-[` may walk an old order. `cmd-shift-s` settles as usual.
