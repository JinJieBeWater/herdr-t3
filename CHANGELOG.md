# Changelog

English · [中文](CHANGELOG.zh-CN.md)

## 2026-11-05

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
