# Changelog

English · [中文](CHANGELOG.zh-CN.md)

## 2026-11-09

- Lists: Agents rows no longer show a remote machine icon between the title and controls. Hover a row to see the machine's name in its details.

- Program icons follow Herdr's official artwork throughout the layout, preserving each component's icon size and the artwork's original whitespace and colors.

- Inbox: remote machine marks no longer open a separate tooltip. Hover the card to see the machine's name in its details.

- Review bar: a commit or branch picked from the logo's menu loads in the Review pane. It used to wait 30 seconds and fail with a timeout, while a count's click worked.
- Review: fixes and speed-ups from a second review of its code. Some need jin.review 0.3.4-fork.8.
  - Files with the same content, such as several identical `tsconfig.json`, each load their diff. All but the first could stay on `Loading…`. Retry after a read timed out asks for the missing diffs again.
  - A line dense with syntax colors shows to its end. Past 400 colored pieces the rest used to be dropped without a sign; it now keeps the foreground color.
  - A long line of Chinese or tabs scrolls sideways to its end. Its last part used to stay out of reach.
  - A file shown whole takes a new theme's colors.
  - A folded file's diff loads when you open it, not while you scroll past.
  - In a big group, a batch of diffs arriving, folding a file or ticking it reviewed redraws only the files it touched: in a group of 1,164 files, 2 ms where it took 39.
  - A diff or whole file is read in pages of at most 3,000 lines and 10,000 colored pieces, as well as 4 MB, so a file of short lines or dense colors loads in parts instead of stalling the pane. (fork.8)
  - A symlink shown whole shows the link, as Git stores it, not the file it points to. (fork.8)
  - A review just opened and analyzed is no longer dropped by the cache making room at the same moment. (fork.8)
  - Polling a running analysis starts one Git process fewer each time. (fork.8)
- Review bar: the review shortcut opens the uncommitted changes only when the bar counts some. A file staged and then changed back used to open an empty review instead of the branch.
- Review bar: a click on a count always reaches the open Review pane. With the clock set back, or right after switching commits in the pane, the pane could ignore it.
- Review bar: the logo's menu builds only the rows in view, and a click on the logo without a press (from the keyboard or an accessibility tool) opens the menu at the logo, not where the last press was.
- Review pane: a review whose group lists hundreds of files, such as a long branch's push, opens. It used to stop with `interrupted` nearly every time: before the file list beside the diffs knew its height it drew every row, and an interrupted view never learned it. Menus and lists that measure themselves now draw a screen's worth of rows until then.
- Pane headers: an agent with sub-agents shows how many (`3 agents ⌄`), or how many need you, in the blocked color. A click lists them all in a menu drawn as the layout's others (the sort and right-click menus): counts on top, each with its status as a dot on its icon and how long it's been working or what it waits on, nested ones indented. The open list follows sub-agents as they start and end, and closes once none are left. Picking one peeks it; hovering one shows the same details card as its row in Lists. Inbox had no way to reach a sub-agent before; Lists keeps its rows.
- Go to: a pane's `+n` counts only its sub-agents. It used to count the shells an agent ran commands in too.
- Lists: a shell an agent ran a command in (`hc run --bg`) is no longer listed or counted as its sub-agent. An agent that shell started still is, a level under the agent.
- Review pane: a big diff opens, with thousands of files or with very long lines such as a log or a minified file (each line shows its first 1000 characters). A big group's diffs load as you scroll to them. It used to stop with `interrupted`, or say the response exceeded the 8388608 byte limit. Needs jin.review 0.3.4-fork.6.
- Review pane: after switching to a big group, it could stay stuck on `cannot read property 'get' of undefined`, showing the last view that worked. It now draws the group again on the next change.
- Review pane: fixes for big reviews and for switching while it reads.
  - A file whose diff failed to load, or arrived while you ticked a file reviewed, loads again on Retry or once the mark is saved. It used to stay on `Loading…` until you opened another page.
  - A file shown whole just before it changed shows its new version. The old text used to come back under the new file's header.
  - A file too large to show has no whole-file button. It used to ask for more than a read can carry.
  - A diff or whole file too big for one read loads the rest as you scroll to its end, so a minified file of 85,000 lines reads to its last line. `The rest of this file is too large to show` is left only where the next part can't be loaded. A file that didn't fit in a read loads with the next one rather than stay on `Loading…`.
  - Scrolling through a big group, each batch of diffs reads only those diffs, not the whole review again. In a branch of 1,554 files a batch is a third the size and loads about seven times faster: 283 KB in 48 ms, from 834 KB in 335 ms.
  - The file list beside the diffs draws only the rows on screen, and each line's width is measured once, so a group of a thousand files scrolls and loads its diffs without stalling.
  - A file clicked while the diffs before it load lands at the top. It used to land on another file.
  - Moving the pane to another worktree and back leaves one watch on the first, not one more per visit, each reading the review again on every change.
  - A language or model picked in Settings stays picked when the settings read on opening arrives late, and the model search keeps what you type while the agents load. Both used to go back.
  - Another worktree, a read retried after a failure, or a finished analysis opens its list at the top. It used to keep the old list's scroll position.
  - A file whose path holds `:` keeps its sticky header, and counts as in view.
  - A range with no changes says `No changes in this range`, not `No files in this group`.
- Review bar: the logo's menu opens with Git's `log.showSignature` on. It used to fail. It also marks every commit not yet pushed with `↑`: with more than 200 commits to push, some used to read `On origin/…`.
- Review bar: switch space while a review is still opening and the new space's review stays as it was; move to another repository while the logo's menu is still loading and it doesn't open. The first review used to replace the new space's, and the old repository's menu opened over the new one.
- Review bar: with the window in the background, files changing no longer start Git, and the counts catch up within a second of coming back. A change in a repository you left no longer makes the bar read the one in view again.
- Review bar: the uncommitted count is the files the review lists. A file staged and then changed back no longer counts, and a moved file counts once. A click on `1 uncommitted` could open an empty review.
- Review pane: its controls take the layout's theme colors, as the sidebar and menus do.
  - Hovering lights a faint tint of the text color, as Home does; what's open, picked or in view is `selected`, and so is a menu's highlighted row. They used to be the same translucent grey in every theme.
  - Re-run and Analyze with AI are filled in `solid`, as the dialogs' main buttons. They used to be `accent` with white text.
  - The settings' Unified/Split and other choices sit on an `input` track, the picked one `selected`, as Custom snooze's. They used to be a grey track with a raised pill.
  - The files in view read as one block, rounded only at its ends, and so do test files next to each other. Each row used to be a block of its own.
  - An unticked box has an `input` border, as T3's, so it shows on a highlighted row. It used to vanish there in some themes.
- `cmd-w` and `cmd-shift-w` with a dialog or popup open close it, as in Herdr's own layout: Go to, New, the menus, Settings, the command palette, the Actions editor and the rest. They used to close the tab behind it, or ask to. Run `scripts/update.sh` to get the keys.
- Closing the agent's pane in a split, with other panes still in its tab, stays in that tab, on the pane Herdr picks. This holds when the agent's program ends by itself too.
- Two agents in one named tab each go by their own name, in the sidebar, the tabs and the pane headers. They used to both read the tab's name. A sub-agent beside its parent no longer takes the tab's name either.
- In Lists, a sub-agent with a pane of its own shows once, under its parent. It used to show twice: there and as a row of its own. Pinned, it still has its own row.
- Right-clicking a terminal that isn't in a tab, such as one in a window, no longer offers Split, Zoom or Close pane, which can't work there.
- The Inbox on its own: Clear's dialog is as big as its text, as Herdr 0.1.14's dialogs are. It used to be a fixed 400×170.
- A pane header leads with the agent's name. The terminal's address leaves the header for the pane's right-click menu, on the header or the terminal: `Copy address`, with the address beside it, copies it. A name that is only the program's, as `Pi` or `zsh`, no longer shows beside the program's icon. The address used to stand before the name.
- An Inbox card no longer says `1 sub-agent working`, as T3's sidebar says nothing of sub-agents: the card's status already takes theirs in. The branch on its third line is cut in the middle, so its start and end both show.

## 2026-11-08

- A new tab opens in the folder its space shows, its first terminal's, by `+`, `cmd-t`, a tab's menu and New alike. It used to open where the space was made, so a space whose agent had moved on to another folder showed one folder and opened tabs in another.
- In a pane header, the terminal's address and the name sit 6px apart and read as one label. The folder stays 12px after the name. They used to be spaced alike, 12px each.
- Review pane:
  - Its title names a branch against its upstream as the commits flow: `main → origin/main` to push, `origin/main → main` to pull. It used to read `To push: main` and `To pull: main`.
  - The Review bar's `↑` and `↓` counts name the same in their hover label: `Review main → origin/main`. It used to read `Review 2 commits to push`.
  - `Analyzing…` has no spinner of its own. The pane header's spinner already shows the run.
  - Its other spinners are in `working`, as everywhere else in the layout. They used to take the text color.
  - When the group tabs don't fit, they're cut off at the pane's edge as they scroll. They used to be cut off 16px in from the edge, mid-tab, with an empty strip beyond.
- The top of the sidebar, as T3's:
  - Inbox's Search row and Lists' Spaces heading line up with the pane headers on the right. They used to sit 8px lower.
  - The first card sits 8px under Search. It used to sit 10px lower.
  - Icons are T3's sizes: 16px in the buttons at the top, the brand bar's included, which used to be 14px; 14px in a machine's +; 12px for the fold arrows.
  - The fold arrows and a machine's + stand under the buttons above them, in two columns. They used to sit a few pixels off.
  - The three rows of buttons at the top are evenly spaced.
- Moving the pointer from one row to the next swaps the details card at once. The old card used to fade out under the new one, which flickered.
- Herdr's logo and name sit at the top left of the sidebar, past the window buttons, where Herdr's own layout has them. Click them to go Home. They light up on hover and while you're there, with no background behind them. The house button is gone.
- On macOS the window buttons sit on the brand bar's middle line, 1pt higher than before.
- They stay on that line at any zoom. When the zoom changes, the layout updates the button position in your installed `herdr-t3` layout. A copy saved under another name is left alone.
- Popup lists that scroll, such as New and Go to, stay still when the pointer moves over them. They used to scroll a half-hidden row into view under the pointer. The arrow keys still scroll to the highlighted row.
- The README is shorter: what this is, how to install it and how to start. Features, keys, updating and known limits are in [the guide](docs/user/guide.md). The extras have [their own page](docs/user/extras.md).
- Inbox:
  - Undo after a Settle puts the agent back where it was in Active. This holds however you settled it and in whichever window you press Undo.
  - Undo takes effect at once. It used to take up to a second.
  - `cmd-shift-s` on a settled agent puts it on top of Active, as the undo arrow and a drag out of Settled do.
  - Settling a pinned card unpins it at once. If the Settle fails, the pin goes back to its place.
  - On a slow remote machine, a Settle stays settled. An older write arriving late no longer undoes it.
  - A window in the background no longer clears a snooze that's due. `Woke` is still there when you come back.
  - Clear asks `Close 2 terminals?`, as closing a tab does.
  - The Settle button's label shows `cmd-shift-s` only on the card in view, the one the key acts on. Once that card is settled, its undo arrow shows the key too.
  - The undo arrow's label reads `Un-settle`, as the drag badge does.
- Lists:
  - Unpinning with the pin button shows `Unpinned, Undo`, as in Inbox. Undo puts the pin back in its place.
  - Clicking the sort button again closes its menu, as other popup buttons do.
  - Spaces no longer scans untracked files for git info, which saves a lot of disk work in a big repo.
- While you drag a space or a tab, Esc puts it back, as in Inbox.
- Sometimes Herdr shows a tab you didn't pick, such as when a program ends by itself. The layout then gives back the unread done or `Woke` this cleared. If giving it back fails, one notice says so and it keeps trying. It used to fail silently.
- Menus and keyboard:
  - Right-click menus light one row at a time. Enter runs the lit row, never the first by default.
  - Right-click menus take Home, End and typing a row's first letters.
  - The Actions menu opens with nothing lit, so Enter right after opening runs nothing.
  - In right-click menus and the Actions menu, moving the pointer off a row clears its light.
  - Tab reaches the Review bar's counts and logo.
  - Tab reaches the footer buttons of New (New space, `← Spaces`) and Go to (New tab). New space's machine step no longer needs a mouse.
  - New's number hints follow the platform: `⌘1` on macOS, `Super+1` elsewhere.
- Review:
  - Changing the language, agent or model in its settings saves only that setting. It no longer undoes a change made in another Review pane or a moment before.
  - Marking a file reviewed and quickly unmarking it keeps the last press.
- `scripts/update.sh` no longer copies the mods' test files into the app folder. It removes the ones an older update left there.

## 2026-11-07

- Another window on the same core now finds your Home instead of making a second one and listing the first as a project. Home keeps looking like Home; a space of yours called Home is never taken for it.
- `scripts/update.sh` updates an install with one command: it overwrites the layout and mods, merges `keys.json` and says which keys it replaced, and keeps the focus ring color, the theme and the Review and theme-export blocks. The Update section of the README says only that now; the old manual steps are gone.
- Closing the agent in view when it's its space's only tab now goes straight to Home. It used to show another space's tab first for a moment, which could cost that agent its unread done.
- A Settle or Snooze the core refuses no longer leaves `Settled, Undo` up for something that didn't happen, and an Undo the core refuses keeps its notice, so it can be pressed again.
- A Review pane's popup closed with Escape opens again at once from its button; it used to ignore a click for a moment.
- A machine's heading in Spaces no longer stays lit when Herdr drops the pointer's leave.

## 2026-11-06

- Radii, spacing, sizes and type across the layout now follow T3 Code, one value per use.
  - **Popups**: menus are 28px rows with radius 4 and 14px text. New, Go to, the Actions editor, Custom snooze and close confirmations are drawn as T3's dialogs and command palette, radius 16, with its footer, keycaps and × button.
  - **Sidebar**: buttons are T3's 28px; cards, rows and shelves take its gaps; Inbox's top row is 48px and Spaces' heading lines up with it; the footer is 44px.
  - **Work area**: `+` and pane buttons are 24px at radius 8; Home's keycaps are T3's; the tab bar's controls group as T3's.
  - **Review**: the bar's controls, the pane's toolbar, its commit list, settings and file tree take the same values. Opening a settings page no longer breaks the pane, and Collapse test files has its icon.
  - **Menus hang as T3's**: Snooze lines up with the clock's right edge when it fits, else flips to its left edge and out past the sidebar; the sort menu opens under its button with right edges together. Close confirmations and Delete are red, and field labels take the text color.
  - **Updating**: copy `mods/t3-*` and `layouts/herdr-t3.*`, and with Review the extras, deleting what's gone (`rsync -a --delete`). Standalone `t3-actions` also holds the close confirmation now.
- The Inbox space filter's menu now measures as T3's and the layout's other popups: radius 8 and inset 4, a shadow, flush 32px rows that used to sit 34 apart, and a shorter search field. Its search text starts 20px from the icon, as T3's, so 4px before the names, and stays inside the button's left edge.
- Switching to a pane hidden behind a zoom now shows it: the zoom moves to that pane and the panes beside it stay hidden. It used to light the card while the screen stayed on the zoomed pane and the keyboard went dead, and the zoomed agent lost its unread done. A toast or an outside `agent.focus` still corrects a frame late, and the done comes back.
- Lists and Inbox now keep one set of rules, and differ only in how they organize: by project, or by attention.
  - **Closing and coming back, in Lists too**: closing the agent in view lands on Home, closing any other tab goes back to the tab you were on, and going back to a space shows the tab you left there.
  - **`cmd-]` and `cmd-[`** walk top-level agents in the sidebar's order and stop at either end, where in Lists they used to wrap. Inbox walks the rows it draws; Lists walks folded groups too.
  - **Settle holds everywhere**: `cmd-shift-s` works in Lists and with the sidebar hidden, and lands on Home. A settled or snoozed agent shows no done dot in Lists, the tabs, pane headers or Go to; in Lists its row stays in place, idle.
  - **A hidden sidebar keeps its mode**: the keys go on working by that mode's rows, which keep up while hidden, and `Settled, Undo` shows in the tab bar for 5s.
- A Review belongs to the space, as several agents share its worktree.
  - **One per space**: the bar brings up the open one, in another tab too, instead of opening another. `Open in` picks where a new one goes. From a version with a pane per tab, close the extras: the bar brings up the one in the current tab first. Each has an Inbox card, in a pane too, and it lights while the focus is on it.
  - **Settling a review goes back**: closing or settling the one in view returns to where you opened it from, not Home, as you'll likely have something to say to the agent.
  - **The bar counts and opens**: `3 uncommitted │ 5 ahead of main │ ↑2 │ ↓1 │ logo`. The logo stays put as counts come and go, the counts have no color (color means an agent's status here) and a narrow bar tells them apart by icon. The logo's menu only picks what to review.
  - **The pane switches**: `‹ Commit 2 of 5 ›` and the list of this diff's commits are in its own toolbar now.
  - **Analyze automatically means a count's click**: picking from a menu or switching commits no longer starts a paid run.
- Closing a tab no longer costs the agent beside it its unread done. When a program ends, a space closes or Send back is used, Herdr shows the tab next door for a moment, and that used to mark it read; now it's unread again once you're past it, and a woken snooze it cleared comes back. The right-click menus' Close (a tab's, a pane's) asks first and leaves first, as × does, through a copy of Herdr's menu (`t3-menu`).
- Keyboard mode no longer gets stuck: closing the part that held it, or quitting in it with Inbox docked alone, used to leave clicks on cards and rows taking the keyboard from the terminal. A menu left open as the Inbox hid no longer holds it either.
- Clicking the button that opened a popup now closes it, instead of closing and opening it again: Actions ▾; Inbox's Search, New tab and New space; Spaces' New tab and New space; Home's Go to and New tab.
- The Review pane's settings and fold menu work by keyboard, as the other popups do. The Model page opens ready to type and Enter picks the row lit; hovering moves the highlight; Default and a custom model are rows ↑/↓ reach. The Language and Agent pages and the fold menu take ↑/↓, Home, End, typing, Enter and Space. While the fold menu or the analysis status is up, `j`, `k`, `r`, `f`, `c` and `s` no longer act on the diff under it.
- Custom snooze's calendar takes the arrow keys. Enter on a day or month button in it used to just close it; now it does what a click does, and the calendar opens on the date chosen.
- An Agents group's chevron and a Review group's category icon no longer stay lit when the pointer's leave is lost.
- Hovering works while Herdr isn't the active window: a card's controls, labels and details cards stay up instead of flashing and going.
- State that went stale or disagreed, fixed across the layout:
  - **With the sidebar hidden**: a settled agent with new work counts on the toggle, its done dot shows, and `cmd-shift-b` and `cmd-shift-s` work or stay quiet instead of reporting an error (change them in yours: see Update). Agents that ended while Inbox or Lists wasn't showing keep their real order and times.
  - **Inbox**: dragging a pinned, snoozed agent out wakes it and keeps its pin; Undo no longer drops a pin made since; a quick Undo doesn't flash; a drag ends even if its leave never comes, and follows the pointer at any zoom.
  - **Lists**: `cd` in a worktree no longer reorders your spaces or changes `ctrl-N`. Machines connected another way come back. Temporary machines show their real state, and a machine's state updates at once. A row dragged out of the window goes back. Fewer `git status` runs, and one hung machine no longer holds up the others.
  - **Tabs and Home**: going back to a space by key shows the tab you were on, not Herdr's neighbour. Go to's Back works across tabs. Cancelling a close at Home leaves it as it was, and a second Home isn't created at startup. A tab that changes during a drag no longer selects or moves the wrong one.
  - **Keyboard**: closing the pane you're on ends keyboard mode, and first showing Lists or Inbox no longer ends it.
  - **Review**: Retry no longer wedges the pane. Closing a review pane clears the bar's counts and steps. Turning off automatic analysis applies to every pane at once, so another pane won't start a paid run. A dead daemon shows a failure instead of spinning, and a run finishing in the background keeps its mark until you're back.
- Every popup's list now moves the same way. ↑/↓ keep the highlight in view in the Inbox space filter, the Actions menu and the Review pane's model list, where it used to run off the bottom; hovering a row in New and Go to now lights it, and the wheel takes the highlight along, as the other menus do. ↑ with nothing lit in the sort menu now goes to the last row.
- Home's default page is three buttons now: Next agent, Go to and New tab, with their keys. New tab replaces New space, which started a space in your home folder from there. Next agent dims when it has nowhere to go.
- `cmd-]` and `cmd-[` work with the sidebar hidden, going by Herdr's order as Lists does. They're `t3-tabs.next` and `.prev` now: change them in your keys (see Update).
- The Inbox space filter's menu opens from the filter button's left edge, as T3's does; its search text used to stick out past the button.
- With Inbox showing, the tab bar no longer competes with the sidebar: it holds the agent in view, its sub-agents and the tabs with no agent (the last agent you looked at stays while you're in one of those), with no status marks. `cmd-1…9`, the next and previous tab keys and the wheel go by what's shown (add the new keys to yours: see Update), and closing the agent in view lands on Home. Closing a tab with no agent goes back to the tab you were on, not the one to its right, and an agent beside it keeps its unread done. Lists is unchanged.
- Settling or snoozing the agent in view now lands on Home, one quiet place with only the keys for what's next, instead of pulling you to the next card. `cmd-]` opens the top card from there, and Undo brings the agent back. `cmd-shift-h` or the new house button goes there anytime. It takes no number among your spaces (add the new keys to yours: see Update), and you can split any mod or program into it.
- The agents list no longer lights the first agent while a mod pane with no agent beside it has focus.
- Spaces and Agents now move as Inbox does. Folding, sorting, new and closed spaces and ended agents slide and fade over 150ms, where most used to jump.
- Dragging a space lifts it and the list opens where it will land, instead of drawing a line; a checkout brings its open worktrees.
- Rows in Lists and Inbox show a press and fold arrows in Lists cross-fade.
- Hover labels and details cards no longer get stuck on screen, and don't open while the window isn't active.
- Moving into a card's snooze menu no longer makes Settle vanish and the clock and menu jump: the card stays as hovered while its menu is open.
- Moving between a row's controls no longer flashes its details card: it comes back once the pointer leaves the controls, and shows as before on the rest of the row.
- Hover labels and details cards slide 4px as they fade, in and out, and no longer vanish on the spot: leaving a label, reaching a control in a row or moving to the next row all fade.

- New, Go to and the Actions editor show their contents as soon as they open; their fade left them blank for a moment.
- A sub-agent's row shows its own details card; its parent's used to stay up over it.
- Closing a checkout no longer scatters its worktrees. Two or more with the checkout not open fold under a dim row for their repo: a click opens the checkout, which takes its place, and the arrow folds. The fold is kept by repo, and a closed group still shows the worktree you're on.
- Lists is drawn and behaves as T3's sidebar, keeping Herdr's Spaces and Agents. Agent rows are 36px and recede until they matter (a working one at 70%), the time and pin cross-fade, and hovering shows the details card. Grouped by space, a group is T3's project folder: the space's mark and name, a count and status dot only while closed, the space's menu on right-click. A closed group still shows the row you're on, and a folded sub-agent in view lights its parent. Rows slide when they reorder. Spaces' rows are 32px. Shelves and machine rows are 32px, and the sort menu fades in with nothing lit until a key or the pointer arrives.
- A tab's hover card stays out of the way: it goes when the pointer reaches `×`, and a name the tab shows whole, with no status to tell, has none. `×` has its own `Close tab` label after 500ms.
- `t3-theme-export` no longer loses a color change that arrives during a write, and exports `{ name, colors }`, dropping `light`, which nothing read. Update `pi-herdr-theme` with it.

## 2026-11-05

### Drawn to T3's numbers

- Lucide icons draw 1.75px strokes, as T3's CSS thins Lucide's 2px. Each mod keeps its own copies, the ones Herdr ships included; only the spinner, not Lucide's, is the shipped one.
- Inbox is as dense as T3's sidebar: settled and snoozed rows and Show more are 36px, shelf headers 32px with a regular-weight count, cards 6px in and rounded 6.
- The undo notice sits in the sidebar footer, as T3's, so it covers nothing: `Settled,` (or `Settled 2,`) and `Undo`; short of room the summary is cut, never `Undo`. Docked alone, with no footer, Inbox still shows it over the first shelf.
- Custom snooze takes its amount in a number field with − and +, and its unit from a select, as T3's dialog.
- The snooze menu, New, Go to and the Actions editor fade in. T3's also scale up from 98%, which Herdr can't animate.
- Search in Inbox's top row is sized as T3's search field: 32px, a 16px icon.
- New and Go to pad their search field and footer as T3's palette.
- The Actions editor is T3's 512px dialog, as tall as its fields; Actions menu rows are 28px with a 24px edit button.
- Closing asks in T3's words: `Close terminal "<name>"?` and "This stops the running process and clears its history.", or `Close 2 terminals?` for a tab running several.
- A tab drags only once the pointer has moved 6px, as T3's; short of that a press selects the tab pressed.
- Keyboard focus, as T3's focus-visible: `pane.go` onto Inbox, Spaces or Agents starts a keyboard mode in which Tab walks the sidebar's, tab bar's and pane headers' controls with a 2px inset ring, a row's hover-only controls show while the keyboard is on it, and Enter or Space acts. Menus take Home and End, and those without a search field T3's typeahead. With the mouse nothing changes: a click still leaves the keyboard with the terminal. `pane.go` left at the edge now lands in the sidebar.
- Updating: copy the `mods/t3-*` folders and, with Review, `extras/mods/review` and `extras/mods/pulls-review` over the installed ones.

### One icon set: Lucide

- Every icon in the layout and the Review extra is Lucide's, as T3 Code's and shadcn/ui's, on one grid. Search, the machine marks, the sidebar toggle, the pane header's split, zoom and close, and Review's Phosphor icons (its category icons too) change; programs' icons, Review's file icons, the Windows window buttons and the spinner stay.
- Updating: copy the `mods/t3-*` folders and, with Review, `extras/mods/review` and `extras/mods/pulls-review` over the installed ones; the old icons left behind (`review/ph/`, `t3-pane/split-*.svg`) can go.

### Lined up

- Buttons inside sidebar rows and cards light up on hover without a ground, as T3's: Inbox's clock, Settle, undo and Wake, and in Lists a machine's `+`, the worktree and sub-agent folds and the pin; an open snooze menu lights the clock the same way. Bars, headings and a tab's `×` keep theirs, as T3's.
- Group headers are one kind, drawn as T3's: the agents list's groups now look like Inbox's shelves and Spaces' machines, a dim 12px label with the count and a chevron at the far edge (down when open, right when folded), the chevron in the status column and lit while the row is hovered. Group labels no longer take their status's color.
- A pane header's icon and first word stand under the first tab's, and over a terminal's text.
- The tab bar's `+`, a pane's last button and its state mark share one column, 10px from the window's edge as the brand bar's buttons are. `+` is 26px, as the recipe said.
- In Lists, a checkout's fold arrow joins the column of the heading's last button and the state marks; fold arrows are all 12px; `New space here` lays out as a space's row.
- Updating: copy `mods/t3-pane`, `mods/t3-tabs`, `mods/t3-spaces`, `mods/t3-agents` and `layouts/herdr-t3.json`.

### New: one rule for where a space goes

- The sidebar's New space asks which machine once there is more than one, in Inbox and in Lists, as the New menu's already did. `cmd-n` still doesn't ask and uses the current space's machine; a machine header's `+` uses that machine.
- The Spaces heading has the same two buttons as Inbox's top row: New space (`folder-plus`, was `+`) and New tab, which picks a space.
- Updating: copy `mods/t3-spaces`, `mods/t3-inbox`, `mods/t3-new-menu` and `layouts/herdr-t3.json`.

### Go to: programs, and back

- `cmd-p` and Inbox's Search open the layout's own Go to (`t3-picker`, from Herdr's picker), drawn as the New menu: T3's command palette, two-line rows with the space's mark, the program and the status mark, and key hints at the foot. Every pane has a row, named and marked as its pane header and tab are, rather than a row a tab under Herdr's own tab name: type `lazygit` and Enter lands on its pane, beside an agent or not, from any space. A tab's name counts only if you gave it. ctrl+d closes that pane, asking first while a program runs.
- Its first row goes back to the pane you left with your last jump from it, and it opens there, so `cmd-p`, Enter goes back and forth.
- A terminal no longer keeps an old Pi session's name after Pi exits: lazygit started where Pi was reads as lazygit in its tab and pane header.
- Updating: copy `mods/t3-picker` too and add `"cmd-p": "mod.open:t3-picker"` to your `layout:herdr-t3` keys.

### Inbox: finding a review again

- A review in a tab of its own has a card, as an agent: on Working while it analyzes, back on top of Active when that ends. Click it to get back from any space; `cmd-]` and `cmd-[` walk it too. Settling it closes it, since your marks and analysis are kept: reopen it from the Review bar.
- A review split off an agent lights that agent's card while it has the focus, and the keys go on from there.
- The Review bar's menu has two pages, Commits and Branches, switched by a click or Tab, so the two never mix. A branch's row shows its last commit, how far it is ahead of the default branch and how old; hovered, a card as a commit's adds its author, how it stands against its upstream, and the worktree it's checked out in.
- A review whose analysis was running when Herdr quit no longer spins until you open it: the Review bar drops that state when it starts, and a run still going says so again within seconds.

### Actions and Review, as mods of their own

- Actions moved out of `t3-tabs` to a mod of their own, `mods/t3-actions`, shipped with the layout and also [published alone](https://github.com/JinJieBeWater/herdr-t3-actions) for other layouts. It is one of the `mods/t3-*` you overwrite when updating; your actions are kept.
- The standalone Inbox repo is now [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox), named for the mod it holds; the old herdr-t3-focus address redirects there. The mod is still `t3-inbox`, so nothing moves.
- The pulls.review extra is now a Review bar (`extras/mods/pulls-review`) and a review pane (`extras/mods/review`), for [the pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo)'s `jin.review`; also [published alone](https://github.com/JinJieBeWater/herdr-pulls-review). Still optional: see the README's Extras.

### Visual

- Hover labels open above their controls, as T3's, so one on a card leaves its title readable. What has no room up there (the brand bar, the tab bar with Actions and the Review bar, the Inbox filter) still opens below.
- Tabs are T3's panel tabs: 24px, as wide as their whole names while the room allows. Short of room the longest give way first, the active one to 240px and the rest to 144px, then the strip scrolls and keeps the active tab in view. A short name's tab is 96px at least, so `Pi` isn't a sliver.
- The sidebar footer is a row of icon buttons, as T3's.
- A new install shows the Inbox first.
- A tab keeps its icon on hover: `×` now sits at the tab's end, over the status mark, and the hover label adds the status word. Unlike T3's, where the icon turns to `×`. Every tab now keeps room for that slot, so hovering doesn't change its width.
- An empty Active stays blank, as T3's: `Nothing needs you.` is gone. Only a list with nothing in it says so, centered, and a filter that leaves nothing names its space.
- The panes sit on `chrome`, the same as the tab bar: in a theme whose `canvas` differs, a 2px strip no longer shows above them. Herdr T3's own theme looks the same.

### Interaction

- A tab's icon turns to × on hover, and hovering a tab shows its whole name in a quiet hover label, with an Inbox row's timing.
- A work column under 1024px folds Actions and the Review bar to icons and counts.
- A mod pane can give its tab and pane header a title, an icon and a status; the review pane shows its analysis that way.
- `cmd-]` / `cmd-[` walk the Inbox as T3 does: the rows it shows, in its order, stopping at either end; a folded shelf only its row in view. Lists keep Herdr's `agent.next`. After updating, add `"cmd-]": "t3-chrome.next"` and `"cmd-[": "t3-chrome.prev"` to your `layout:herdr-t3` section in `keys.json`.
- A sub-agent in view with no row of its own lights its parent's card, and Settle acts on it.
- An agent you bring into view that the space filter hides widens the filter to all spaces.
- Closing a tab or pane asks first when a program is running in it; an empty shell closes at once. This covers the ×s and `cmd-w` / `cmd-shift-w`. After updating, add the `cmd-w`, `ctrl-alt-shift-x`, `cmd-shift-w` and `ctrl-alt-x` lines from the repo's `keys.json` to your `layout:herdr-t3` section. Agents and the right-click menu close as before.
- **Snooze**, as T3's: the clock on a hovered card opens a menu (In 1 hour, In 3 hours, This evening, Tomorrow, Next week, Custom…). The agent waits on a Snoozed shelf and wakes where it was, marked `Woke`; it shows early if it needs you, and Undo, Wake or a drag out of the shelf bring it back at once.
- A pinned card offers Settle too, as T3's: settling drops the pin, and Undo puts it back in its place.

### Fixes

- Folding or unfolding a shelf slides its header with the rows, so cards no longer pass over it.
- The undo notice's Undo is medium and underlines on hover, as T3's.
- A long name in a pane header takes the header's room instead of stopping at 260px.

## 2026-11-04

Lots of fixes and visual polish, closer to T3 Code.

### Remote machines

- **Add machine**: a server icon at the end of the sidebar footer's Settings row, in Lists and Inbox.
- **Connect**: a rebuilt machine offers Connect, which pairs it again under the same name. A failed pairing stays listed and says why.
- A machine header's `+` and New space there make the space on that machine, this computer included.
- Inbox cards from another machine carry a server mark that names the machine on hover, as T3 does.
- The New menu marks remote spaces, and New space asks which machine.
- A space's icon is found on its own machine.

### Visual

- Spaces show their repo's favicon, else a monogram in one of T3's 18 colors on a light wash of it, instead of a white initial on a solid tile. A CJK name shows its first character.
- Inbox titles are bright when the agent needs you, is done or is in view, and dim otherwise.
- A card's program icon and machine mark end its third line, so the title keeps its own.
- Settled rows lead with their project's mark.
- Hovered buttons brighten their icon along with their text.
- Pane buttons no longer shift the pane header.

### Interaction

- Every icon and control shows a T3-style hover label with its key and a hint, opening upward near the window's bottom.
- Hovering an Inbox row fades its details in beside it and cross-fades its time with its button.
- Inbox rows slide to their new place, new ones fade in and gone ones fade out; a drop slides from where you let go.
- Settle and Unpin leave an undo notice for 5 seconds.
- The New menu works as T3's palette: spaces only, the list follows the highlight, New space and key hints in a footer.
- Menus, dialogs and drags behave alike: arrow keys in every menu, Clear asks through Herdr's confirm dialog, a dragged tab fades, and a drag ends when the pointer leaves.

### Fixes

- The space order and `ctrl-N` follow the nested rows, so worktrees under their checkout keep in step with the keys (from Herdr's own spaces mod).
- Clear no longer stays lit after its confirm dialog.
- pulls.review extra: no more Opening… popup.

### Removed

- The agent view. After updating, delete `"cmd-shift-a": "t3-tabs.view"` from `keys.json`.
