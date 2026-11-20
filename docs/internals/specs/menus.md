# Menus

Context menus (`t3-menu`, opened through `shared/menu.js`), submenus (`shared/submenu.js`) and the keyboard rules every popup list follows. The [RECIPE](../../../RECIPE.md) has the table of what each object's menu offers; panel, row and position tokens are in [t3-tokens](../t3-tokens.md)「组件」and「菜单行」.

## Context menus

- **Coverage**: every row or item in the sidebar and tab bar that stands for an object (agent, space, checkout, machine, tab, pane) opens that object's menu on right-click. Plain buttons (`+`, sidebar toggles, the brand bar, Home entries) and lists inside popups don't.
- **One object, one menu**: wherever it is right-clicked, the menu is the same, computed by `t3-menu` from the target's current state; callers pass only which object. The only variable is Inbox versus Lists ([ADR 0002](../../adr/0002-inbox-rules-stay-in-inbox.md)). The breadcrumb's parent and dimmed titles stand for agents and open the agent menu; mod cards stand for panes and open the pane menu.
- **Opening**: at the pointer, 220 wide, at most 260 high. The press stops bubbling; it doesn't select, switch or take the keyboard; it dismisses the hover details card and clears hover highlights. A title's `⌄` (or clicking the current title) opens the same agent menu below, 4 under the title; clicking the breadcrumb's space opens the space switcher menu (`tab: "space-switch"`, 280 wide, `closedKey("t3-menu", "space")`) 4 under the space crumb, left-aligned.
- **Space switcher menu**: pinned `New tab` (`t3-tabs.new`'s key on the right, running `t3-tabs.new:<space>`), then a rule and a 10-row scrollable list (`scrollList`) of the current space's agents in tab order, followed by its non-agent terminal panes. A single-pane named tab uses its tab name for the program row. A hairline separates the two groups when neither adjacent row is lit or active. The active row uses a 7% foreground wash and medium foreground text, with 10px extra left padding before its status. Right-clicking a row closes the menu and opens its context menu. A row with a pane, lit by the pointer, puts a `micro` ghost `×` (`Close <name>`) in place of its trailing mark, 10 from the label; a row lit by keys keeps its mark until the pointer moves again. Clicking `×`, or `ctrl-d` on the lit row, runs `t3-tabs.close-pane:<pane>`, which asks first while a program runs, and leaves the menu open: the list follows as the pane goes, the highlight on the row that took its place (or the new last row). If that was the space's last tab, the space goes and so does the menu. A sub-agent peeked without a pane has no `×` and `ctrl-d` does nothing.
  - **Agent rows**: a pane-bearing agent belongs to its pane's space. Nest sub-agents 16px per level under the local branch. An agent with a pane in another space starts a branch there, carrying its pane-less descendants with it. A descendant brought back into this space with a pane starts a local row. Clicking an agent with a pane focuses it. Clicking a pane-less sub-agent peeks it. Each local root rolls up status from its whole tree.
  - **Clock**: refresh when a visible row's working duration advances or Snooze expiry changes its mark. Working duration changes by the second below a minute and by the minute thereafter. Scrolling or live model changes update which rows need a clock.
- **Groups**, in this order, separated by rules, empty groups not drawn: destination (New tab, Open, New space here, Split, Zoom pane or Unzoom pane); state (Pin, Settle, Snooze or Wake, Mark unread); names and copies (Rename or Rename tab, Copy address, Copy path, Send back, Send right-clicks); worktrees (New worktree, Open worktree); ending (Close, Close pane, Remove worktree last).
- **Wording**: verbs only; the object is what was right-clicked. The agent and pane menus say `Close pane`, to tell it apart from the tab's Close. Toggles name the state after acting: Pin / Unpin, Settle / Un-settle, Snooze / Wake. Only items that open another dialog end in `…`.
- **Unavailable items are left out**, not greyed as T3 does: a shorter menu costs less attention ([ADR 0001](../../adr/0001-trade-off-order.md)).
- **Selection follows the displayed command and target**: click, Enter and delayed submenu opening keep their selected item when live rows move. If that item is no longer available, the pending selection does nothing. A menu left with no rows (its tab or space closed) closes its chain on the next tick, never in render. Snooze still has to be offered for that agent; durations start on click and fixed times must still be in the future, as in the [Inbox](inbox.md#snooze-menu).
- **Icons**: the same icon as the button doing the same thing elsewhere (the card's check, undo and alarm clock; Agents' pin and pin-off), every one `t3-menu/icons/`' own at the layout's 1.75 stroke, none borrowed from Herdr's `workspace-chrome` (drawn at 2; `check.sh` fails a borrowed one, `check-menu.cjs` reads each row's). Split right is `panel-right`, Split down `panel-bottom`. A submenu's `›` is the mod's own `chevron-right` too (`menu-row.js` `sub`, copied by `scripts/sync.sh`).
- **Right column**: only a command's key, written as tooltips and New write keys (`tip.js` `keyLabel`: `⌘D`, `⇧⌘D`), never the raw binding; Snooze's times say when each wakes. Nothing else goes there. New tab runs `t3-tabs.new:<space>`, as every way of opening a tab does ([tab-bar](tab-bar.md#whos-in-view)), and shows `t3-tabs.new`'s key only on the space in view, where the key acts.
- **Danger**: only `Remove worktree`, which deletes, uses `ansi1` text; never a filled block. `Close` already confirms when a program runs, so it stays plain, as T3's Archive.
- The standalone Inbox has no `t3-menu`: its `menu` prop names the menu mod, and without it no menu opens.

### Item conditions

- Pin: top-level agents only.
- Settle: hidden while the agent or one of its sub-agents is working or blocked; a settled agent shows Un-settle. Runs `t3-tabs.settle:<address>`.
- Snooze: hidden for blocked agents and mod cards (as the card's clock); a snoozed agent shows Wake (`t3-tabs.wake:<address>`).
- Mark unread: Inbox only; shown when the agent's tree status is `idle` (neither the agent nor any live sub-agent is working or blocked) and `turn > 0`, including settled or snoozed idle agents. Runs `t3-tabs.unread:<address>` (`circle-dot`).
- Rename / Rename tab: top-level agents only (no live agent ancestor along the parent chain, aligned with `shared/name.js`), hidden while Pi's `pi.session` names the agent. Shows `Rename` when it is the tab's only top-level agent and `Rename tab` when another top-level agent shares the tab; both run `tab.rename` on its tab.
- Send back: a sub-agent split out on its own whose parent still lives.
- Close pane, on an agent: the terminal address has a live pane, including a sub-agent before its first status report. Runs `t3-tabs.close-pane`, which confirms and leaves first as × does.
- Copy address: terminals and pane headers; a click copies the address (such as `t2`), which the row doesn't show; never mod panes.
- Machine heading: New space here and Connect, only when connected or its core was rebuilt.

### Not done

- Shelf and Agents group headers: they only fold.
- Actions' `▶`: T3's has none either; editing goes through the `⌄` menu's gear.
- The tab bar's empty space, Home, the brand bar, footer buttons, lists inside popups.
- A Copy submenu (T3's Path / Branch / Thread ID), multi-select menus, Filter by (the Inbox filter lives in `t3-inbox`'s own `localStorage`, unreadable by `t3-menu`).

## Submenus

T3's `MenuSub`. Used by the agent menu's Snooze, Files' Open with, Details' Commits and Review's Commits and settings.

- **Hover intent**: resting 100ms on a trigger row opens its submenu; with one open, moving to another row also waits 100ms before switching.
- **Safe triangle**: from the pointer where it left the trigger row to the submenu's near top and bottom corners. Moving inside it neither switches nor closes; the pointer gets 300ms to cross an intervening row.
- **Placement**: [t3-tokens R4](../t3-tokens.md): `subPlace(row bounds, width, …, viewport width)` puts the submenu against the trigger row's right edge with its first row level with it; if only the left fits, it flips left; if neither fits, it takes the roomier side, narrowed to it. It never covers the trigger row. Herdr clamps an overlay that leaves the window instead of flipping it, so the flip and the narrowing are computed.
- **Keyboard**: → or Enter on the trigger opens it with the first item lit (or its search field focused); ← or Esc closes only the submenu, back to the trigger, and the parent takes the keyboard back as the submenu closes (`popup-menu.js` `menuClosed`; Herdr refuses `focus()` while a view draws, so never in render); a pick closes the whole chain.
- **Carriers**: in `t3-menu`, Files and Details each level is its own native `openOverlay` popup, placed under or beside its row, as Herdr's `win98` menus do. Which menu hangs under which is kept in this run's `globalThis.t3Popups` ([storage](../storage.md)), so closing a parent closes its children. A transparent canvas holding several levels is ruled out: its empty parts still block input. The Review page draws its menus inside the pane: `subPlace` works within the panel's width, and the parent's outside-press handler lets presses in its submenu through.
- The trigger row keeps its highlight while its submenu is open (`menuRow`'s `open`).

## Popup lists and keys

- Arrows wrap and scroll the highlight into view, except a row held by the pointer (the wheel follows the pointer).
- Menus without a search: opened by keys (Enter or Space on their button, →, a shortcut), the first row is lit; opened by the pointer, nothing is, and an immediate Enter does nothing until navigation or hover ([t3-tokens「菜单行」](../t3-tokens.md)). Leaving a row clears it.
- Home and End jump in menus without a search; in a search field they stay caret keys.
- Typeahead lasts 750ms; repeating a letter cycles through items starting with it.
- Pressing the opening button again closes the popup rather than reopening it (`trigger()`, t3-tokens P6).
- Searchable New, Go to and the filter follow their own first-match rules.
- With a popup or dialog owning the keyboard, all four tab and pane close keys close the overlay instead. Popups keep their own close-key contexts, `t3-pane` and `t3-chrome` included; otherwise a close key can destroy the tab behind an overlay.
