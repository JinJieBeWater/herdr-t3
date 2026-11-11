# Inbox

Geometry, constants and edge rules of the Inbox sidebar (`t3-inbox`) and its Snooze menus. The [RECIPE](../../../RECIPE.md) says what the Inbox is and how it behaves; shared sizes are in [t3-tokens](../t3-tokens.md); the hover details card and space marks are in [sidebar](sidebar.md).

## Top row and filter

- 32px row, 8 in: a Search button drawn like a search field, then the space filter, New space and New tab (touching 28px buttons, 16px icons). Search and the button group are 4 apart, as T3 (t3-tokens「有意不同」). 8 below the row, the cards start.
- Search opens Go to; it never filters inline.
- The filter is a 288px combobox under its button's left edge: radius 8, inset 4, a 26px search over a rule, 32px rows of radius 4.

## Shelves

- Pinned and Active cards occupy the top. Working, Snoozed and Settled are bottom-anchored folded shelves when they have entries; when space runs out they follow the cards in the same scrolling list.
- Header: 32px, 2px further out than the rows, padding 8, a dim 12px label, a normal-weight count and a 12px chevron. Shelf chevrons switch direction directly (no cross-fade).
- A folded shelf still shows the row in view, and leaves it out of the hidden count. The row in view also stays visible beyond the Settled page.
- Settled pages with Show more, and offers Clear when it holds terminals Clear can close. Clear asks first and spares the tab in view.

## Cards

- Radius 6, padding 8. Lines 20/20/16 with gaps 4/2: 78px with all three. Cards 5 apart.
- Line 1: space mark and name; at the right the state or time: Working with its duration, Needs you, Done, otherwise age. Line 2: the agent's title. Optional line 3: branch, truncated in the middle.
- The program icon (60%) and the remote-machine mark end the branch line, else the title line.
- Titles of the viewed, needs-you and done agents are medium `foreground`; others normal `muted`, brightened on hover. Hover never moves anything.
- Working cards (pinned ones; the Working shelf has slim rows) are 70% until hovered or viewed.
- A pinned card shows a pin after its space mark.

## Slim rows (Working, Settled, Snoozed)

- 36px, radius 6, 1 apart: a 16px space mark (40% until lit), the title, then elapsed or remaining time.
- Hover replaces the time with Un-settle or Wake. Snoozed rows show an `accent` alarm clock; `Woke` is `blocked` text and stays beside the hover controls.
- Working rows show a 12px `working` spinner and the run's duration (`9s`, `4m`, `1h 5m`); in the 2s grace, a green `circle-check` once done. Hover replaces it with the snooze clock; a mod card's row offers none.
- Controls replace the status corner by a cross-fade, never a reflow.

## Ordering

- Active: blocked first whatever their age, then by when the work returned to the person, ties by address.
- Working: by run start. Settled: by Settle time. Snoozed: soonest wake first.
- A finished run stays in Working for 2s, so quick continuations don't flicker. Blocked leaves at once; pinned and settled agents skip the grace.
- Looking at a card never reorders it.

## Settle details

- Settle is offered on hover of any finished card, pinned ones too. It removes the pin, writes the terminal label (`settled=<ms>:<turn>`, see [storage](../storage.md)) and moves the agent into Settled.
- A Settle waiting for the core's echo can't be lifted or settled again.
- Explicit returns go to the top of Active: the Settle key on a settled viewed agent, the Un-settle arrow, dragging it out. Clearing the label any other way keeps its place.
- Undo restores the old position, labels and original pin position, keeping pins added since. A refused Settle also puts its pin back.

## Pins

- One hand-made order, shared with Agents (`shared/pins.js`). Button and menu pins go to the top; dragging picks the place. Pinning ends Snooze.
- Pinned agents stay at the top whatever their state.
- Unpin returns the agent to its time slot and offers Undo; that Undo restores just the pin in its place and writes no terminal label.

## Undo notice

- `Settled, Undo`, `Snoozed, Undo`, `Unpinned, Undo`, with a count for a batch, in the footer's free space for 5s, fading over 200ms. With the sidebar hidden it shows in the tab bar.
- When short of room, the summary truncates before Undo does. Repeats of the same action combine into one notice.
- Undo restores state; it doesn't count as new work. While still on the Home that action reached, Undo also returns to the agent; after going elsewhere it doesn't navigate.
- No Undo key: `cmd-z` belongs to terminals.

## Dragging and sweeps

- Moving 6px lifts an eligible card or slim row. Working rows and a Settle awaiting the core's echo can't lift.
- The lifted copy is `selected` with a shadow, moves only vertically, and keeps the pressed point under the pointer. Its badge previews the drop: Pin, Unpin, Settle, Un-settle or Wake.
- Only while dragging: Pinned and Active headers expand to 24px over 150ms, Settled appears even when empty, target headers and gaps use `accent`.
- Gaps match the destination: a card plus 5px, or a 36px slim row. Empty or folded destinations show a dashed 36px placeholder.
- In Pinned, the drop goes before or after a card by its upper or lower half. Active and Settled keep their own ordering; no manual positions there. Settled's page length stays fixed as entries enter and leave.
- Release inside the sidebar commits the target and never opens the row. Leaving past the top or bottom commits the last target. Leaving by a side, Esc, the row disappearing or the window deactivating cancels.
- The list holds keyboard focus only while dragging, then gives it back to the pane.
- Sweep: press Settle or Un-settle, cross rows of the same section, release to act on the whole run. Wake sweeps the same way.
- Snoozed takes no drops: a drop can't choose a time.

## Motion

- Reordering and section changes animate over 150ms ease-out: moved rows slide from their old place, new ones fade in from 40px above, departing ones fade where they are. Shelf headers, Show more and the empty marker take part.
- No animation while dragging, or for more than 40 simultaneous changes. A drop slides from where it was released.
- Pressed rows use `selected`.

## Snooze menu

- Any card or Working row not needing the person offers a clock, cards before Settle: working and pinned included, failed turns excluded. Hover controls stay put while its menu is open.
- Presets: In 1 hour, In 3 hours, This evening (18:00, listed until it has passed), Tomorrow (09:00), Next week (Monday 09:00; on Sunday it reads Tomorrow). Sorted by time, duplicate wake minutes merged. Not configurable.
- Durations start on click. A fixed time that passed since the menu opened is refused.
- At least 160px wide. Right-aligned below the clock if it fits to the clock's left with 5px clearance from the window, otherwise it extends right from the clock.
- The agent menu's Snooze is a submenu with the same presets and Custom, wake time at the right (submenu behaviour in [menus](menus.md#submenus)).

## Custom snooze

- A 384px dialog in the confirmations' shell (t3-tokens「对话框」) with a ruled footer.
- Date and time: 36px calendar cells, past days disabled, arrows move by day and across months, Enter or Space selects; time as `HH:MM`.
- Duration: a nonnegative number with − and + steppers, and a Minutes / Hours / Days select.
- Nonexistent or past times and nonpositive durations are refused inline, keeping the dialog open. Applying rechecks that the agent may still be snoozed.

## Snooze lifecycle

- Snooze writes a wake timestamp (`snoozed=<wake-ms>`) and puts a viewed agent away.
- The agent wakes where it was; if a run finished while snoozed, it returns to the top of Active. It carries `Woke` until viewed or clicked with Inbox selected in an active window; a background window can't consume it. A working agent's row can show its spinner and `Woke` together.
- A permission prompt shows it as Needs you for a while without removing the label; answering hides it again.
- Failure in its tree, a new turn given in view, Wake, pin or Settle clears the label. A pinned snooze keeps the pin underneath and returns to it on wake. Undo of Settle restores a snooze only if it hasn't expired.

## Mod cards

- Opt-in only: `shared("<mod>.program") = { icon, tint, name, inbox: true }`. An icon alone doesn't opt in. Title from `<mod>.titles`, state from `<mod>.status`.
- First seen, done and blocked go to the top of Active; working goes to Working.
- The card belongs to the space, not an agent: it lights only when its own pane has focus. Other mod panes light their nearby agent. Nothing in Home gets a card.
- Opting in promises the pane can be closed safely: Settle and close (button or Settle key) closes the pane, with no Settled shelf or Undo, and lands on the preceding tab or the adjacent agent, never Home. A space's last tab asks first.
- No pin, drag or sweep; the space filter applies.

## Filter widening

Bringing a filtered-out agent or mod card into view widens the filter to all spaces and saves it, except on the first draw, or when the person picked that filter while already there. Plain sidebar lists can't be scrolled to a row from code (T3 can).
