# Changelog

English · [中文](CHANGELOG.zh-CN.md)

## 2026-11-06

- Files and Changes, as in Herdr's default layout: a panel on the right of the panes with Herdr's own `files` and `changes` as tabs, hidden at first. The button before the tab bar's `+`, or `cmd-shift-e`, shows or hides it; the button is lit while it shows.
- Updating: copy `mods/t3-tabs` and `layouts/herdr-t3.json`, and add `"cmd-shift-e": "layout.toggle:panel"` to your `layout:herdr-t3` keys.

- A tab's hover card stays out of the way: it goes when the pointer reaches `×`, and a name the tab shows whole, with no status to tell, has none. `×` has its own `Close tab` label after 500ms.

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
