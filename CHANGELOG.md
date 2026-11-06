# Changelog

English · [中文](CHANGELOG.zh-CN.md)

## 2026-11-06

- Switching to a pane hidden behind a zoom now shows it: the zoom moves to that pane and the panes beside it stay hidden. It used to light the card while the screen stayed on the zoomed pane and the keyboard went dead, and the zoomed agent lost its unread done. A toast or an outside `agent.focus` still corrects a frame late, and the done comes back.
- Lists and Inbox now keep one set of rules, and differ only in how they organize: by project, or by attention. [The model](docs/layout-model.md).
  - **Closing and coming back, in Lists too**: closing the agent in view lands on Home, closing any other tab goes back to the tab you were on, and going back to a space shows the tab you left there.
  - **`cmd-]` and `cmd-[`** walk the rows the sidebar draws and stop at either end. In Lists they used to wrap and count folded rows.
  - **Settle holds everywhere**: `cmd-shift-s` works in Lists and with the sidebar hidden, and lands on Home. A settled or snoozed agent shows no done dot in Lists, the tabs, pane headers or Go to; in Lists its row stays in place, idle.
  - **A hidden sidebar keeps its mode**: the keys go on working by that mode's rows, which keep up while hidden, and `Settled, Undo` shows in the tab bar for 5s.
- A Review belongs to the space, as several agents share its worktree.
  - **One per space**: the bar brings up the open one, in another tab too, instead of opening another. `Open in` picks where a new one goes. Each has an Inbox card, in a pane too, and it lights while the focus is on it.
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
- The Inbox space filter's menu opens from the filter button's left edge, as T3's does, and its search text lines up with the names below; it used to stick out past the button.
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
