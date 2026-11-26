# Sidebar chrome, space marks and hover details

What the [RECIPE](../../../RECIPE.md) leaves out of the sidebar's frame: exact geometry, timings and the rules behind space marks and the hover details card. Shared sizes (buttons, tooltips, menus) are in [t3-tokens](../t3-tokens.md); the Inbox and Lists bodies have their own specs, [inbox](inbox.md) and [lists](lists.md).

## Brand bar

- As T3's `SidebarTrigger`: the hide-sidebar toggle (28px, 16px `panel-left`, `t3-tabs.toggle-sidebar`) comes first, at `toggleLeft` (`shared/sidebar.js`): past the macOS window buttons, `(traffic_lights x + 66) / zoom − 4`, else 8. With the sidebar hidden the tab row starts at the same inset, so the toggle doesn't move ([tab-bar](tab-bar.md#hidden-sidebar)).
- 8 after it (`BRAND_GAP`), the sidebar's one gap between icons: the hidden tab row has the same 8 after the same toggle (its 4 + the row's 4, [tab bar](tab-bar.md#hidden-sidebar)), so hiding the sidebar puts the Inbox breadcrumb's space mark where Herdr's tile was, left edges together and centres about 1 apart (14 against 16). T3 has 12 here (`--workspace-titlebar-content-left`, controls + 28 + 12). Herdr's mark and `Herdr` (14px medium `muted`), 4 apart, as T3's `SidebarBrandMark` (`gap-1`). The mark is Herdr's app tile (`frame/welcome/herdr.png`, shipped with Herdr) in its own colours and always opaque. T3's mark is a wordmark as tall as the name's capitals (`h-[1cap]`); this one is an icon, and at cap height (13px, a 10.4 tile) it reads small beside the toggle and the Inbox buttons, so it is as big as those 16px icons: the PNG is 80% tile, so 16px (rounded 4) draws a 12.8 tile against their drawn ~12.7. Centred in the 28, its middle is the toggle's. The PNG's clear edge and the H's side bearing make the 4 read about 6, the gap T3's "3" and "C" show.
- Mark and name are one 28px button, no padding, radius 6 (`mods/t3-chrome/brand.js`), that goes Home, as T3's `SidebarBrand`: one look always, no hover look or fill, not lit at Home, no tooltip; only the keyboard focus ring. Only the brand bar has it: with the sidebar hidden the tab row keeps its toggle alone, as T3's collapsed sidebar ([tab-bar](tab-bar.md#hidden-sidebar)).
- When the name can't fit whole, hide all of it and keep the mark; never `Her…`. The toggle never gives way.
- The sidebar is never narrower than the brand row, as T3's `SidebarBrandWidthProbe`: `max(208, ceil(toggleLeft + 28 + 8 + 16 + 4 + name + 72))`, the 72 being T3's 4 + 2 × 28 + 12 after the brand. At that width the name ends 2 short of the right edge of the filter icon in the Inbox row below (8 in, two 28px buttons after it, its 16px icon 6 in), as T3's `Code` does; the sidebar is pressed to it when the window is narrow. Wider, the sidebar keeps its 256 and the name ends further left. With macOS window buttons and outside full screen, the brand bar writes it as the `sidebar` node's `min` in the installed `herdr-t3` layout, in the same expected-content write as the window buttons' Y below, once the name is measured and whenever zoom or the name's width changes it; Herdr has no command to change a node's `min`. Elsewhere the layout's 208 stands.
- The rest, 8 short of the edge, is a place to drag the window. No mode button: what the sidebar shows is `cmd-shift-l` (nothing while hidden, as T3's sidebar keys) and Settings → Sidebar → Sidebar shows, which reads and selects the `sidebar-lists` stack itself and stores nothing ([ADR 0009](../../adr/0009-settings-hold-real-preferences.md)).

## Window buttons

- macOS traffic lights start at `[16, 12]`: centred on the 40px brand bar, 16 screen points before the mark.
- Without a title bar and outside full screen, their unzoomed Y is `12 + 20 × (zoom − 1)`. Only the installed layout named `herdr-t3` is adjusted, never a renamed copy. The field is written as [storage](../storage.md) says for layout files (expected-content write of `traffic_lights` and the sidebar's `min` only, the [brand bar](#brand-bar)'s width).
- Sidebar hidden or narrow: the tab bar reserves room for the lights.
- Windows: 28px window buttons at the end of the bar, the `window-end` block (see [tab-bar](tab-bar.md)).

## Footer

- 44px high. 32px buttons 4 apart (t3-tokens P3; radius 8, 16px icons), 8 in from the side and 4 from the top: Herdr Settings, the layout's sliders button (Layout Settings), then Clean up (`trash-2` icon, running `t3-tabs.cleanup`, which opens its dialog), a plain 32px icon button with no count and never disabled: whether a shell is idle takes a probe, so a press with nothing in it gets a toast ([dialogs](dialogs.md#clean-up)). Its tooltip reads `Clean up` with its shortcut.
- The free space between them and the edge holds the Undo notice ([inbox](inbox.md#undo-notice)).
- When an update has downloaded: a right-aligned 32px `Update` pill, 12px `accent` text on a 15% `accent` wash, running `app.update`.

## Sidebar icon sizes

From T3 `SidebarThreadHeader.tsx`, `SidebarProjectFolderHeader.tsx`, `ui/collapsible-section-header.tsx`, `SidebarThreadRow.tsx`: the icon follows its button. A 28px button takes a 16px icon, a 24px small button (`icon-xs`) a 14px icon; shelf and folder fold chevrons, in-row controls and marks are 12px.

## Right-edge columns

The sidebar keeps two icon columns at its right edge, in Inbox and Lists alike: 12px fold chevrons centred 22px from the edge; the machine `+` (24px, 14px icon) centred 50px from the edge.

## Space marks

- Prefer the favicon at the repository root of the space's current place: its first terminal's folder, else its original folder. Well-known favicon files first, then icon declarations in pages and routes; never `.icns`.
- Drawn 16px, radius 25%.
- Otherwise the name's first letter or digit, capitalised, bold mono at 8.25/16 of the mark, in one of T3's 18 colours picked by a hash of the name (Tailwind 400 on dark themes, 600 on light), on a 14% wash of that colour. No usable character: a folder icon.
- Found icons are rechecked after ten minutes, missing ones after one.
- Reads run on the space's machine. Every place a draw finds due shares one `sh -c` per machine (`git rev-parse --show-toplevel`, then the well-known file tests); only a found icon adds a `base64`, and a page's linked icon a file test. Each command Herdr starts forks the whole app, so the count must not grow with the spaces. Copies are kept under the app's `cache/t3-icons/`; icon and colour metadata is shared (`t3.spaceIcons`, see [storage](../storage.md)).

## Status marks

`shared/status-mark.js`, the same everywhere:

- Working: T3's still dashed circle (Lucide `circle-dashed`) in `working`, with the duration where there is room.
- Blocked: a rounded `!` on a 15% `blocked` wash: 14px normally, 16px in the Inbox, 12px in Agents and sub-agent rows. A sub-agent's Failed is the same badge in `ansi1`.
- Done: a 6px `done` dot until read; the Inbox writes a green `Done`. A sub-agent's done is its own and never becomes the parent's unread result.
- Idle: a ring in Agents, elapsed time in the sub-agent list, nothing elsewhere.

## Hover details card

Inbox cards and slim rows, Agents rows and sub-agent rows share one card.

- Content: title, space, remote machine, branch and program. A sub-agent's card names its parent's space and shows a branch only if the sub-agent has its own pane.
- 12px text, at most 320 wide, solid surface with `shadow_xl`, 4px to the right of the row, tops aligned.
- The first card waits 150ms. Within 400ms of another closing, the next opens at once.
- The first and last fade and slide 4px over 150ms; instant replacements never overlap.
- Controls suppress the card across their whole corner. A click dismisses it, a drag hides it.
- Program, pin and machine marks have no tooltip of their own: the card carries them.
