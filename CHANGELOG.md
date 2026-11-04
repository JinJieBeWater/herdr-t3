# Changelog

English · [中文](CHANGELOG.zh-CN.md)

## 2026-11-05

### Actions and Review, as mods of their own

- Actions moved out of `t3-tabs` to a mod of their own, `mods/t3-actions`, shipped with the layout and also [published alone](https://github.com/JinJieBeWater/herdr-t3-actions) for other layouts. It is one of the `mods/t3-*` you overwrite when updating; your actions are kept.
- The standalone Inbox repo is now [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox), named for the mod it holds; the old herdr-t3-focus address redirects there. The mod is still `t3-inbox`, so nothing moves.
- The pulls.review extra is now a Review bar (`extras/mods/pulls-review`) and a review pane (`extras/mods/review`), for [the pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo)'s `jin.review`; also [published alone](https://github.com/JinJieBeWater/herdr-pulls-review). Still optional: see the README's Extras.

### Visual

- Tabs are T3's panel tabs: 24px, as wide as their whole names while the room allows. Short of room the longest give way first, the active one to 240px and the rest to 144px, then the strip scrolls and keeps the active tab in view.
- The hide-sidebar button leads the brand bar, in the spot it keeps while the sidebar is hidden, and the sidebar footer is a row of icon buttons, as T3's.
- A new install shows the Inbox first.

### Interaction

- A tab's icon turns to × on hover, and hovering a tab shows its details: the same card and timing as an Inbox row's.
- A work column under 1024px folds Actions and the Review bar to icons and counts.
- A mod pane can give its tab and pane header a title, an icon and a status; the review pane shows its analysis that way.
- `cmd-]` / `cmd-[` walk the Inbox as T3 does: the rows it shows, in its order, stopping at either end; a folded shelf only its row in view. Lists keep Herdr's `agent.next`. After updating, add `"cmd-]": "t3-chrome.next"` and `"cmd-[": "t3-chrome.prev"` to your `layout:herdr-t3` section in `keys.json`.
- A sub-agent in view with no row of its own lights its parent's card, and Settle acts on it.
- An agent you bring into view that the space filter hides widens the filter to all spaces.
- Closing a tab or pane asks first when a program is running in it; an empty shell closes at once. This covers the ×s and `cmd-w` / `cmd-shift-w`. After updating, add the `cmd-w`, `ctrl-alt-shift-x`, `cmd-shift-w` and `ctrl-alt-x` lines from the repo's `keys.json` to your `layout:herdr-t3` section. Agents and the right-click menu close as before.

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
