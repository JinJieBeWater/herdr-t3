# Changelog

English · [中文](CHANGELOG.zh-CN.md)

## 2026-11-21

- Splitting a named tab across two or more top-level agents no longer drops the tab name to the program name for agents without a session name or a telling terminal title, such as an unnamed Pi. Agents with their own telling titles still show those titles, and Pi with a session name still shows its session. Sub-agents still never inherit a tab name, and agents started from a plain shell count as top-level.
- In an agent's right-click menu, **Rename** (or **Rename tab** when another top-level agent shares the tab) stays available for top-level agents not named by Pi's session, including non-Pi agents running in a shell that has a leftover `pi.session` label, and stays hidden for sub-agents even in their own tab.
- Right-click an idle agent that has finished a turn (or open its menu from the breadcrumb title) with Inbox selected to **Mark unread**. It puts the agent back to Done in place without switching routes (showing its unread dot on the Inbox card, pane header and space menu, as well as Agents and tabs in Lists), brings a settled or snoozed agent back to Active, and works with the sidebar hidden.

## 2026-11-20

- At Home with a single page or mod, such as the asciicn wallpaper, Home is the whole area right of the sidebar, up to the window's top: no frame, no margin around it. The wallpaper's picture runs under the top row too, as one picture, and with the sidebar hidden its button sits on it. Default's page has its own colour all the way up. A terminal or a split Home keeps its frame. A framing you saved may sit about 8 px differently, as Home's corner is now the window's.
- Herdr's icon and name at the top left of the sidebar are laid out as T3's brand, after the sidebar button at the same gap as the sidebar's other icons: the icon as big as the sidebar button's and the Inbox buttons' icons, centred on the name, and closer to it. They look the same at all times: the icon is always in full colour and `Herdr` stays dimmed, no longer lighting up on hover or while you're at Home. Click it to go Home, as before. With the sidebar hidden only the sidebar button stays in the tab row, as in T3; go Home with `cmd-shift-h`.
- As in T3, the sidebar never gets narrower than its top row, so in a narrow window `Herdr` ends right above the Inbox filter button instead of past it. On macOS the layout file is adjusted for this, as it is for the window buttons.
- In Inbox, hiding the sidebar puts the space's icon at the start of the tab row where Herdr's icon was, so one icon takes the other's place and the sidebar button stays put.
- Working and loading marks are still icons, as T3 Code draws them: a dashed circle for an agent at work, a loader arc while something loads. Nothing spins, so the window no longer repaints every frame while agents work. Framing a wallpaper that is still loading shows the still loader beside the step, not a bar sweeping back and forth, and a wallpaper that can't be drawn no longer leaves a loader on Home, or its preview dimmed, after the notice.
- Looking at a woken agent while Lists is selected no longer clears its `Woke`: it is still marked when you switch back to Inbox.
- At Home, an agent's menu now settles, un-settles and snoozes it too. Undo goes back only to an agent that was in view when it was put away.
- Lists' `+` opens a new tab exactly as `cmd-t` does. A new tab opened from New or a right-click menu, in the current space or another, leaves only that space in the Inbox breadcrumb, as `cmd-t` does, instead of the agent last looked at there; the menus show `⌘T` only on the current space's New tab. With no space open, `cmd-t` opens New instead of breaking the layout's keys.
- In Lists, a snoozed agent's done dot returns on its pane header and tab the moment the snooze ends, not at the next unrelated redraw.
- The faded ends of a scrolled tab row now draw in themes whose bar colour carries its own transparency.
- `cmd-shift-b` opens Details at once; it waits only to un-maximize the panel. A pane's × tooltip shows the key bound to the layout's close.
- Agents, sorted by priority or pinned: the space after an agent's name shows whole or not at all, and the name takes the room. In the Sort agents menu, a row's highlight goes when the pointer leaves.
- Settings → Sidebar → Sidebar shows: the hint names the key actually bound, and none when unbound. On Windows and Linux, the window buttons in the panel head are named Minimize, Maximize or Restore, and Close window, as in the tab bar.
- Files reads its tree and the file it shows even when its window isn't in front; it still refreshes only in front. Review opened while the Herdr window is behind another reads its diff, instead of saying "Loading the review…" until the window comes back.
- Copy path in Details no longer shows a notice. New shows a remote project's folder in full. Files' tree switch and Expand/Collapse all are named as Review's. Review's Language, Agent and Model lists, opened by a key or command, hang beside their row.
- Less work when nothing changes. With the Inbox showing, the hidden Lists no longer re-sort agents every second and the Spaces poll does less; a card that has worked for over a minute is redrawn once a minute instead of every second. A hidden Inbox reads far less from Herdr each second, a pane header keeps a snooze timer only while a countdown shows, and a Files page never shown does nothing each second. Go to, New, Clean up, the context menus, the tab bar and pane headers read Herdr's lists once per draw, and names, space icons, the New space button and tooltips reuse what the draw already read.

## 2026-11-19

- New keys: `cmd-shift-l` switches the sidebar between Lists and Inbox (in this layout it takes the place of Herdr's `layout.switch`), `cmd-shift-e` opens Files in the space panel or closes it, as `cmd-shift-g` does Review, `cmd-b` hides or shows the sidebar, and `cmd-shift-z` is Undo while the notice offers it. As in T3, the notice's button names its key: `Settled, ⇧⌘Z to undo`.
- At Home, hiding or showing the sidebar (`cmd-b` or either sidebar button) moves Home once. Before, the top row caught up a moment later, so Home jumped twice. The asciicn wallpaper doesn't move at all: it is framed against the window, so the sidebar just covers or uncovers its left part. A framing you saved is now relative to the window and may sit a little differently.
- The button that hides the sidebar sits right after the window buttons, as T3's, and stays on that spot while the sidebar is hidden, so one place hides it and brings it back. Hidden, it is just its icon: the `! 1 ◌ 2` counts beside it are gone. With the sidebar hidden the layout says nothing of the agents: Herdr's own notice still tells you when one needs you, and showing the sidebar shows them all.
- The brand bar's Show lists / Show inbox button is gone: switch with `cmd-shift-l` or Settings → Sidebar → Sidebar shows. Settings now has a Home page and a Sidebar page.
- With the sidebar hidden, `cmd-shift-l` does nothing, as T3's sidebar keys: there's no sidebar on screen to switch. Settings → Sidebar → Sidebar shows still switches it.
- Files no longer repaints or flashes its loading mark every 5 seconds while nothing in the folder changes; it redraws only when the list, a preview's problem or a search result does.
- Some controls are renamed so each names its action: the sidebar's square pen and Go to's footer say **New tab in…**, the agent menu's **Close pane**, **Zoom pane** / **Unzoom pane**, Inbox's **Clear Woke mark** and Details' **Copy path**.
- Agents in Lists scrolls the agent you move to into view, unless the pointer is on its row. Turning the wheel stops it.
- Review folds its file tree when you pick a file while the panel is under 640px wide, so the diff gets the room; the tree button shows it again. Wider, the tree keeps the state you chose.
- **Clean up** (`cmd-shift-r` / `ctrl-alt-r`, or the trash can in the sidebar footer) reclaims what's finished without leaving Inbox. Settled agents and idle shells fold into one block saying how many and which spaces close; **Close** ends them. Programs left behind, still running in a space where no agent is at work any more, such as a forgotten `bun dev`, are cards with their space and process: go to one, or **Stop** it (`ctrl-d` too) with no second question. Programs where an agent is still working, or in the space you're in, aren't listed. With nothing to clean up, a notice says so.
- The Inbox breadcrumb's space menu closes a terminal in place: point at a row for its `×`, or press `ctrl-d`. It asks first while a program runs, and the menu stays open so you can close several.
- **New** remembers projects after their last terminal closes. Remembered projects appear after open spaces and reopen in their original folder and on their original machine when picked.
- **Settled** holds put-away agents, with process cleanup moved from its **Clear** button to **Clean up**. **Filter by space** lists only spaces with Inbox entries or spaces already selected in the filter.

## 2026-11-18

- Inbox searches within the sidebar. Type a name and open a match from the compact results list. Clicking a pin unpins its card. An empty space filter offers **Show all spaces**.
- Inbox reveals the agent you navigate to, shows the agent’s own reported failure and marks a linked worktree with an icon beside its branch. Dragging a card or sweeping an action ends when the window loses focus.
- When you navigate between spaces or leave Home, the destination terminal opens with its tab bar and saved panel in place.
- Opening Home for the first time from a project keeps that project visible until the configured Home tab is ready.
- Files shows a cached file's breadcrumb and preview together as you select its tab. Fast directory reads go straight to the tree.
- A context menu keeps the command you picked when rows move. Go to and the sub-agent menu follow the selected pane or terminal. Reopening a file tab retires its previous tab menu and preview reads. A tab or space menu closes when its tab or space closes under it.
- In standalone Inbox, Settle acts on the agent in focus when you press the shortcut. Home enables Next agent when the selected sidebar has somewhere to go. New space offers the same machines from Inbox, Spaces and the New menu.
- Review opens the range you picked for its original space and repository. A full-file read interrupted by hiding Review resumes when you return.
- Closing a tab asks again if the action would now affect additional terminals or close its space. Inbox Clear waits for the core to confirm Settle. Creating Home matches the explicitly named space on this machine.
- Files follows the most recent selection when directory reads finish out of order. Review defers full refreshes while hidden. The space menu offers Close for a sub-agent as soon as it has a pane.
- Updating checks configuration and mod entries before copying. If the layout or key bindings change during the copy, the updater preserves the edit and reports how to resume. If it can't stage the new layout or key bindings, it stops before copying any mod.
- Home now picks up wallpapers added during its first conversion. Several changes during one conversion trigger a single follow-up scan.
- In Files and Review, `cmd-shift-w` and `ctrl-alt-x` dismiss the open menu and keep both the surface tab and the terminal pane open.
- The close button stays visible as the pointer moves across a terminal tab or rests on its name.
- Inbox Clear closes only terminals included in the confirmation that are still eligible. Custom Snooze leaves an agent in view if it needs you before you confirm.
- Files coalesces slow directory refreshes, reloads an image when you select it again and previews images from remote Macs.
- The space menu keeps agents with panes in their own space and avoids rebuilding the terminal index for each row.
- Updating keeps the settings of an installed Review bar and drops layout blocks for uninstalled extras.

## 2026-11-17

- Clicking the space name in the Inbox tab bar breadcrumb now opens a space switcher menu below it (keeping the clean breadcrumb spacing intact, brightening on hover/open without shifting `/`), instead of jumping to an empty shell tab. The menu offers **New tab** (`⌘T`) at the top and lists all agents (with status marks and indented sub-agents, active row highlighted without a duplicate checkmark) and non-agent terminal programs or shells in the current space so you can jump straight to any of them or right-click a row for its agent or pane menu. Right-clicking the space name still opens the space menu.

## 2026-11-16

- Review's file and folder rows now drag into terminals and use Files' same right-click menu without changing the current file or reviewed boxes. Deleted files offer only Copy path and cannot drag; subgroup rows have neither action.

- Files: drag a file or folder row into a terminal to paste its path without Enter. Herdr handles quoting and cross-machine rules; normal clicks and Insert into terminal remain unchanged.
- Spaces warns beside a machine's name when its agents stop after you disconnect, even while connected. Click for Herdr's fix instructions and Copy button; no privileged command runs automatically. Older cores without this report show no warning.
- Closing a repository in Spaces now releases its folder watch immediately, without waiting for another file change. The standalone Review bar also releases old watches when you move elsewhere; periodic refreshes remain.
- Checking the layout no longer clears Files' image cache or wallpaper drafts, exports the theme, or starts the layout's startup probes and file writes. The check still initializes and renders the mods. Requires Herdr 0.1.16.

## 2026-11-15

- Home no longer draws the space panel's toggle in its folded tab row, where only its bottom edge showed and could still be hovered and clicked. `⌥⌘B` still opens the panel at Home.
- asciicn wallpaper takes images only: Import Studio file (.ans)… and the asciicn Studio row are gone from `+`'s menu, and a `.ans` dropped on Home or copied into the wallpaper folder is no longer shown unless the wallpaper made it from an image. Pictures you added from Studio, or from an image before modes came in, stop showing; a notice names each once. Add the original image again to get it back.
- The folder icon in Files' and Review's file trees and in the asciicn wallpaper's add menu is now drawn as everywhere else in the layout, instead of an older shape of the same icon.
- Updating from an older version no longer carries settings that were renamed since over to their new names: the layout keeps no migration code. Settings under names that never changed are kept as before.
- Details' folder icon and the optional Review bar's uncommitted-files icon are now drawn as everywhere else in the layout, instead of an older shape of the same icon.
- asciicn wallpaper takes far less memory: a picture is now drawn as large as Home shows it on your screen, instead of always as large as the biggest Retina screen. A photo now takes about a sixth of the memory it did on a regular screen and less than half on Retina; a wide panorama shows larger, so it saves less. When the window grows, it moves to a Retina screen or you zoom in while framing, the picture is drawn again larger, the current one staying up meanwhile (about 0.3 s for a photo, 1 s for a panorama, after the window stops growing); a smaller window keeps it as it is. Light and dark still switch in the same moment. On Retina it looks as before; on a regular screen dense pictures, such as a Braille panorama, look a little softer than before.
- Files: Expand all no longer opens what Git ignores in a repository inside your space's folder, such as a cloned project's `node_modules` or `.venv`, when the space's folder isn't a repository itself, as T3 does. Folders in no repository still open; an ignored folder still opens when you click it, and is dimmed as ignored.
- Files: after Expand all on a big folder, folders no longer fail with "This folder can't be listed" a few seconds later. Files now reads only a few folders at a time; reading every open folder at once ran past the number of files Herdr may have open. A folder that really can't be listed now says so at the end of its own row (Can't list · Retry, with the reason on hover) instead of in a list piled over the tree, and the rest of the tree stays.
- Files with no file open: its search row now sits level with the pane header's row beside it, as Review's toolbar and a file's header already do, instead of about 2pt lower. The file tree's head in Files and Review is drawn the same way, so in Review the "Files" head lines up with the file header in the diff beside it. The tree itself hasn't moved.
- Review's settings: in the Language, Agent and Model lists, a row the pointer has left no longer stays lit, and the arrow keys start from the list's own choice, not from where the pointer was. Their rows are now drawn as every other menu's.
- Open in's menu (in Files and in Details) opened before the layout has finished looking for your editors now fills them in as they're found, instead of listing only Finder until you open it again.
- The optional Review bar's logo button stays pressed while its menu is open, and its tooltip doesn't show over the menu; a second click closes the menu, as every other menu button does.
- Dragging the edge of the file tree in Files or Review now stops if you let go outside the window: coming back, the tree no longer keeps following the pointer until your next click. It stays where you let go.
- Themes whose colours are partly transparent (`#rrggbbaa`) now work everywhere: hovered and pressed buttons, tabs, menu rows, file tree rows, Review's diff, badges and focus rings take a share of that colour as they do with any other theme, instead of drawing nothing.
- A menu button you started to press with the mouse but released elsewhere no longer leaves anything behind: opening it afterwards from the keyboard (Tab to it, then Enter) lights its first row and opens it where the keyboard opens it, and the first Enter isn't swallowed.
- Review's range button (Changes ⌄) now lights with even space on both sides of its words when you hover it or open its menu, instead of the lit patch starting right at the first letter; its edge lines up with the Review tab above it. Its words, and the first breadcrumb in Files, sit a little further right to make room, still in the same place on both pages, so switching between them moves nothing.
- Details' Review range menu no longer says "Reading review ranges…" each time you open it. It shows the counts it read last at once and updates them a moment later, and Details already reads them as it opens, so even the first opening has them (about 20 ms instead of about 130 ms in a small repository). With nothing read yet, the ranges' names show at once and their counts fill in. The arrow keys work straight away. If you pick a range before the fresh counts are in, it goes once they are, unless it turns out to be empty. Review's own range menu works the same way.
- Right-click menus are more consistent. Keys on the right are written as everywhere else in the layout, `⌘D` and `⇧⌘D`, not `cmd-shift-d`. Copy address no longer shows the address on the right; clicking it still copies it. Every icon in them is drawn at the same thin line as the rest of the layout's (some were heavier), and Split down has its own icon, no longer the same as Split right's. The `›` of submenus everywhere, and the plain folder mark of a space with no letters in its name, are drawn at that thinner line too.
- The space panel's page headers are a little lower: Review's toolbar and the header over a file in Files are now 32 high instead of 40, so their row (Changes, the breadcrumb, Tree…) sits level with the pane header's row in the work column beside them, instead of about 4pt lower. Switching between Files and Review, nothing in the header moves. Review's menus still open 4 under their buttons.
- Tabs in the tab bar and in the space panel are now one kind of tab and behave the same. Hovering a terminal tab puts × over its icon on the left, as the panel's tabs and T3's do, instead of over the status mark at its right end, so the mark stays in sight. A middle-click closes a terminal tab too, asking first, as × does, while a program is running in it. A tab's name shows in full on hover only when it's cut short, in the same small label as the panel's tabs; the status isn't repeated in it any more, since the mark stays visible.
- Review: the tree's indent guides no longer run through the reviewed boxes. Each folder's line now runs down under the folder's own box instead of its icon, so it passes left of its files' boxes. Files' guides stay where they were.
- While an agent rewrites a big code file you're looking at, Files no longer stalls the window at every refresh. A file over 16 KB shows each new version at once as plain text, and the syntax colours come back once it has stopped changing for about 10 s, so the window holds for a moment once (about 0.3 s at 200 KB) instead of every few seconds. Turning Wrap on or off on such a file also shows the plain text first and the colours a moment later. Smaller files are coloured at once, as before. If you scroll while it's plain, it stays plain until you open the file again, so the colours never throw you back to the top. Opening a file up to 256 KB colours it at once, as before. Files over 256 KB stay plain, with **Highlight anyway** above the code to colour them all the same.
- Files' content now sits on a lighter ground than the file tree and the header, as T3's: the code, Markdown or picture is on your theme's background colour, the tree's column on the panel's own, so the two read apart by colour, not only by the thin line between them (which stays, faint, as in T3). Review's diff does the same beside its file tree.
- Open in, in Files' file header, is one outlined control, as T3's: a single rounded border round the app's icon and the ⌄, with a line between them, so it no longer reads as two loose buttons. Hovering lights only the half you're on; with its menu open, the ⌄ half stays lit. Actions' `▶ | ⌄` in a bar is drawn the same way. Details' Open in, Actions and Review rows keep no border, as T3's.
- Buttons that sit side by side now stand a little apart (4px), as T3's, so each one's hover or pressed background is its own rounded square: two that are on no longer run together into one pinched strip. This covers the panel head (‹ ›, maximize and the panel toggle), Files' Preview, Wrap and Tree, Review's toolbar, the tab bar's `+`, Details and panel toggle, and the sidebar's footer. The panel toggle stays 12 from the window's edge, the same place with the panel open or closed. Controls that are one thing, such as Open in and Actions' run and menu halves, still join; the sidebar's top buttons are unchanged.
- Buttons and tabs in the bars are quieter, closer to T3: hovering one lays a faint wash of the text colour under it (4%) and a pressed or open one, or the tab you're on, a slightly stronger one (7%), instead of your theme's hover and selection colours, which in some themes (maple-dark) were solid blocks. It's the same in light and dark themes and everywhere: the sidebar's and tab bar's buttons, both tab strips, the panel head, Files and Review. Files' search field no longer lights up on hover.
- The space panel has far fewer lines and boxes, as T3's: the file tree's column is set off by a fainter line; Review has no line under its toolbar, its file tree's head, its group tabs or a group's summary; group tabs have no outline; in the diff, a file's header has no lines above and below it and is no longer lit when it's the file in front (the tree shows which); hunk rows and note cards are a faint wash instead of a coloured band and an outlined card; split view has no line down the middle. Review's file tree head is now the same height as Files'.
- The icons in Files' file header and Review's toolbar are a little smaller (14px), as T3's; the panel head's stay 16px.
- A pane header's sub-agent button spins before its count while any of its sub-agents, at any depth, is working and the agent itself isn't, so you can see work going on down the tree without opening the list; while the agent works, its own spinner after the button is the header's only one. Its tooltip now also says how many are working (`3 sub-agents, 1 needs you, 2 working`). It still adds no `!`: the count's colour says one needs you.
- Details' **Quick Review** row is now called **Review**, in the card, its tooltips and Choose what to show. Details now works from the keyboard. Opened with `cmd-shift-b` or Enter on its button, its first control has the keyboard and a ring: ↑ and ↓ move between rows (round the ends, Home, End and typing a row's first letters work too), ← and → between a row's two halves, and Enter or Space presses what's ringed. A row's menu opened that way hangs under the row with its first row lit; once it closes, the keyboard is back on the arrow that opened it. Escape closes Details and gives the keyboard back to the terminal it was opened on. The computer's name isn't in the walk. Opened with the pointer, nothing is ringed until the first arrow key.
- The Review bar's commit and branch menu draws its rows as every other menu does: the row under the pointer or the arrow keys is the one lit, and the pointer turns to a hand over them. Its Commits / Branches switch marks the page shown with the faint wash a pressed button has in a popup, instead of your theme's selection colour.
- Key hints in Go to and New (`↑ ↓`, Enter, Esc, ⌘N) are drawn like Home's and the empty panel's, as T3's one keycap: a slightly fainter key on a slightly fainter wash, in medium type.
- The bar's **Add action** (before you have an action) lights on hover with the same faint wash as the bar's other buttons and Actions' `▶ | ⌄`, instead of your theme's hover colour.
- The Actions menu from the bar's `⌄` now looks like the one in Details, as T3's: no line over **Add action**, and a row's gear shows only while you point at the row or reach it with the keyboard.
- Details no longer shows up out of place. With the panel closed, `cmd-shift-b` always opens it under its button: right after Herdr starts it no longer opens wherever the app puts a popup, and just after you close the panel it no longer opens a little to its right. Opening the panel no longer shows it a button's width left of its place for a moment, and closing the panel no longer has it stand in the corner before the toggle appears there.
- The space panel's toggle no longer moves as the panel opens or closes: it stays in the window's top-right corner, 12 from the edge either way. The panel is no longer a card: its head and its pages are one surface in the bar's colour, from the top down to the window's bottom, set apart from the work area by the divider, with their content 12 in from its edges.

- asciicn wallpaper: switching pictures no longer blacks Home out for a moment. The picture you had stays until the next one has loaded, then the new one replaces it at once, instead of fading in over an empty Home. Its controls now behave like the rest of the layout: the pointer stays an arrow over the switcher, the card's icon buttons, modes and Fill/Fit, and turns into a hand only on the card's filled buttons, as on the layout's dialogs. ‹, › and the crop button show their names on hover. **Delete…** is now **Delete**, drawn like the Actions editor's. While framing, dragging the picture moves it the whole way again: it used to stop after the first few pixels.
- asciicn wallpaper: switching between light and dark now changes the picture in the same moment as the background. Before, Home kept the old picture for 0.5–2 s, which after switching to dark was dark ink on a dark background, so Home looked black. Choosing another theme redraws the picture several times faster, since only its colours change. Going back to a theme you used earlier in the same session no longer leaves Home stuck on the previous picture, which could look black until you restarted Herdr.
- asciicn wallpaper: choosing another theme is quick right after Herdr starts too, not only after the first change: the picture's uncoloured drawing is kept beside it, so a new theme only recolours it instead of converting the picture again, which roughly halves the wait for a large picture. This takes about twice the disk space per picture (a wide Braille picture: 3 MB to 6 MB).
- asciicn wallpaper: editing the `.ans` of the picture shown no longer puts Lighthouse in its place while it's drawn again; Home keeps the picture and its name, and the crop button waits until it's done, so framing and Apply can't save Lighthouse as your choice. Dropping a new picture no longer moves the one still showing to the new picture's framing while it loads. Pressing Apply now greys out the whole card at once, not the mode row alone, so nothing looks pressable while it saves. A framing drag ends when the window loses focus or you let go outside it, instead of carrying on when you come back.

- Files' breadcrumb `›` menu works as T3's again: one menu that changes folder in place instead of opening another beside it. A folder in it shows its contents there; **Back to …** on top, or ←, goes up a folder (no higher than the crumb you opened it from); Escape closes it; picking a file opens it. Opened from the keyboard, its first row is lit.
- Switching between Files and Review, the header's buttons (Tree, and those beside it) no longer jump up and down: a file's header in Files is now the same bar as Review's, its controls centred. Review's Changes button starts its words where Files' first breadcrumb does.

## 2026-11-14

- A menu or submenu opened from the keyboard (Enter or Space on its button, →, a shortcut) lights its first row, so Enter picks it at once; opened with the pointer, nothing is lit until the first arrow key or hover. This covers every menu: right-click and title menus, Snooze, Files', Details', Actions, the agents' sort, sub-agents, the panel's `+`, the wallpaper's add menu, the settings' dropdowns, the Inbox card's Snooze and Review's range, fold and settings submenus.
- Closing the right-click menu's Snooze times with ← or Escape no longer breaks the menu ("This view could not be re-rendered"); the menu takes the keyboard back as they close. The same goes for Files' and Details' submenus.
- Submenus hang beside the row that opens them and never cover it. Where neither side has room, as Review's settings (Language, Agent, Model) in a narrow panel, the submenu goes to the roomier side and narrows instead of sliding over its menu. This covers the right-click Snooze, Files' and Details' submenus, and Review's Commits and settings.

- A long Agents list (more than 50 rows) draws only the rows in view and scrolls them with the wheel or trackpad: with 200 agents a redraw makes about 400 elements instead of 13,000. While it does, Tab reaches only the rows on screen.

- With the Review bar in the layout, closing Review's panel tab stops the bar lighting the count of the diff that tab showed, as Details' Review row already did.

- The settings' dropdown options, Review's base list and the Commits list (the Review page's and Details' Review row's) go out when the pointer leaves a row, as every other menu's rows do; they used to stay lit.

- Lists' Spaces and Agents rows are 8 in instead of 10, as Inbox cards are; sub-agent rows and worktree and sub-agent tree lines move 2 left with them.

- Space picks the lit row in every menu, as Enter does: the agents' sort, the panel's `+`, the right-click menus, the Actions menu and the wallpaper's add menu took only Enter.

- With many terminals the layout keeps drawing. Each sub-agent count used to read every terminal again, once per agent: with thousands of terminals the tab bar, Agents, the Inbox, Go to and a sub-agent list slowed every redraw, and around 5,000 Herdr stopped drawing them. Files search in a very large repository no longer stops on a short query that matches most files. Review's file tree draws a big review's folders without delay, and the space panel no longer checks Review four times a second while nothing happens.

- Review and Files keep to the panel's 12px edge on every row: Review's file headers, hunk headers, line notes and group summary, and both file trees, now start and end where the panel head's first tab and last button do. A long hunk header stops 12 short of the right edge, and Files' Markdown preview is 12 in instead of 24.

- Sub-agents: the pane header's count reads `3 ⌄` instead of `3 agents ⌄`, tinted when any need you, and the header's status mark is now its own agent's; what the sub-agents are doing shows on the count. The count opens their list in tree order, with no hover card: each row has its program icon, its name and the mark an Agents row uses, then the working time, `Needs you`, `Failed` in red, a dot for a done you haven't seen, or how long it's been idle. Click or Enter peeks it; right-click opens the sidebar's agent menu. In Agents a failed sub-agent reads Failed with the same `!` in red, and a sub-agent's done dot goes once you've seen it, as a top-level agent's does.

- New: Details (`cmd-shift-b`, or the square-menu button by the work area), a popup in the form of T3's details panel that never resizes terminals. It shows the machine (hover the folder icon for the folder, right-click to copy its path); Open in, whose arrow only picks Finder or an installed T3 editor, shared with Files, and whose main half opens it; the global Actions; and Review. Its main half shows Review, and its end names the range Review shows; its arrow lists the ranges with only the one shown checked, and Commits opens beside them with a search. Picking a range shows Review on it. Every menu hangs under its row, as wide; a long action name shows whole on hover when cut. Right-click the card to choose what it shows, or Reset. Changing space, tab or terminal closes it, opening the panel puts it away, and the panel's own window controls move to the open panel's right edge.
- Review's range menu counts in one way, `3 commits` or `1 file`, instead of `2 ahead of main`, `↑2` and `↓0`; no row is lit until the pointer or a key gets there, and the range shown stays checked and pickable at nothing.

- Top right of the work column: its controls' right edge sits over the pane header's last control, 12 from the window. Lists' `+` comes before Details, so it never pushes it; on Windows and Linux the window's buttons stay last. Open a surface shows its keys as keycaps under a brighter title, spaced as Home's list and centred in the panel.
- Every button that opens a menu or popup now works like the sidebar's space filter. Its tooltip goes away while what it opened is up, the button stays pressed meanwhile, and pressing it again closes it. This covers Details (pressing it again used to close and reopen it, and its tooltip covered the card), the panel's `+`, the sub-agent count, the agent title's menu in the Inbox breadcrumb, the agents' sort, New space and New tab, the Actions menu, Files' breadcrumb › and Open in, and Review's range, base, fold, settings and analysis-status buttons. Review's icon buttons now have tooltips.
- Inbox cards and settled rows are 8 in instead of 10, so their status and program icon end under the buttons above. With the Lists sidebar, the work column's `+` is 28, the same size as the panel button beside it. Details and the panel button take the same hover and pressed colours as the other title bar buttons.
- The Details, panel, `+` and page-arrow icons, and Open in's folder and app icons, now use the thinner stroke the other icons use.

- The space panel: Review now reads the repository where the tab works, its last terminal's folder, else the space's: a space whose folder isn't a repository no longer greys Review while its terminal is in one. Too many tabs show T3's ‹ › together after them, each greyed at its end, with faded edges; the active tab, and `+` after the last, scroll into view. `cmd-t` in Files or Review opens `+`'s menu under `+` instead of the window's corner. A tab's menu is as tall as its rows. Same-named files aren't told apart, as in T3: the tooltip shows a cut name, not a path. Closing Review and adding it again never takes up a range asked for the closed one. A panel left on the old fixed Files or Review page opens empty: add the surface again.

- Following your decisions on the audit: an unselected panel tab's name is as bright as an unselected tab in the tab bar; menu check marks take the row's text colour (Details' Review row and the Review page's range menu no longer draw them in the accent colour); Details' Review row names a commit range by its title, as Review's scope button does, instead of a short sha. Right-clicking the computer name keeps its one-item Copy full path menu, now what the docs say too.

- Controls added this round now behave like the layout's older ones. The panel's `+` closes its menu when pressed again, and the panel's empty page no longer takes the keyboard from the terminal. Its menu walks with Home, End and typed letters, greys unavailable rows as other menus do, and no longer flashes Review as unavailable while it checks. Panel buttons share the tab strip's hover, its page arrows are the strip's size, Expand panel shows pressed while expanded, and a surface tab's close button has a tooltip. Files: a file that can't be read offers Try again beside Locate; the search field is a Tab stop; breadcrumbs announce themselves as buttons; menu icons are muted and submenu chevrons match the other menus. Details: Open in's menu scrolls past 420px; Choose what to show opens under its row; its tooltips (folder path, Open in, the Review row's reason) are the layout's own; a cut-off Review range shows its full name on hover; the half of a row's split under the pointer lights on top of the row. The sub-agent list's fold arrow has a tooltip, and the sub-agent button stays pressed while its list is open.

- Files and Review: the two file trees now look the same. There are no fold arrows: a folder's icon opens and closes with it. Review uses T3's file icons too, with Files' indents, row height, spacing and hover, and indent guides while the pointer is on the tree; it keeps its reviewed boxes and change letters. Files' menus (a row's right-click menu, a breadcrumb's folder menu, Open in) are real menus like the rest of the layout's, no longer cut off at the panel's edge, and Open in's is the same menu as Details'; cmd-w over one closes it, not the tab. With more than 200 matches, search keeps the ones whose file name matches and the shorter paths. It never shows one search's results under another's words: words not searched yet, as while the window is behind, show as loading. A file opened from a tab or a command no longer takes the keyboard from your terminal; only a click in the tree, a breadcrumb or Locate moves it to the tree. Selecting several rows (Shift, Cmd, Cmd-A) is gone: nothing used more than one. The Files header and Review's toolbar sit 12 in on both sides, under the panel head's ends; Review's buttons are 28, as the panel head's, and its icon buttons touch, as Files' Preview, Wrap and Tree do, 8 from Open in.

- Every menu now draws its rows one way: Files (a breadcrumb's folder list, Open in, a row's right-click menu), Details (Open in, the items to show, Copy full path), Details' Review row and Review's range menu, the panel's `+` menu, the agent menu, Snooze and the sub-agent list. A row is lit only while the pointer or the keys are on it; before, in several of them the last row hovered stayed lit after the pointer left. Moving fast between rows no longer leaves none lit, and nearby buttons no longer lose their hover the same way. An unavailable row is greyed the same everywhere and says why in the layout's own tooltip. In a long folder list, ↑/↓ scroll the lit row into view, and the row that opened a submenu stays lit while it's open. Space picks in Details' Open in, as Enter does. The full-name card on a cut-off tab name is the same card as every other tooltip.

- Open in and the Details rows were redrawn as one control each. At rest a split shows no fill or seam, only its chevron, as T3's (the Review row's chevron too); hovering lights one fill under both halves with the seam, and an open menu darkens it. Every chevron and the folder icon line up at the row end. The Review row shows the range Review is on in dim text. The Details card no longer has a shadow, which the popup cut into grey square corners. The Open in menu sits flush with the button's right edge, drops the check mark, and shows VSCodium's own icon. A disabled toggle no longer looks pressed.

- asciicn wallpaper: `+` now opens a menu (Choose image…, Open wallpaper folder), and you can drop an image straight onto Home, Windows included. A chosen image previews in Dots, with Braille, Blocks (`░▒▓█`) and Quadrants a click away, drawn the way asciicn draws an image. The framing card takes the switcher's place: while the picture loads it shows only the name and progress, then opens upward with the mode, Fill or Fit with Reset, and Zoom, while Cancel and Apply stay put. Zoom from 100% to 400% with the mouse wheel or ⌘-scroll at the pointer, or with the slider and − +, which move together; pan by dragging, with two fingers on a trackpad or with the arrow keys; Enter applies, Esc cancels. The crop button frames any picture, built-in ones too, and Delete… for a picture you added is now in that card instead of on the switcher. Importing is several times faster: a 12 MP photo shows in about half a second instead of over two, a large PNG in under a second instead of seven; a mode you've seen comes back at once, Apply takes about 0.2 s instead of 0.5, and Home shows a saved picture straight from disk at start. Very wide or very tall images are no longer squashed. In a light theme a picture from an image is drawn like ink on paper instead of a negative, and phone photos stored sideways come out upright. Switching pictures and resizing Home no longer stall while the picture redraws, and Home no longer goes blank for a moment when you switch pictures, change theme or apply: the last picture stays up until the next has loaded. Waits that take a while show it: a progress bar while an image is read, the last mode faded with a spinning button while a new one is drawn, a spinner by the name while a picture loads; quick ones show nothing. Pictures you added are drawn again once after updating.

## 2026-11-13

- Removed redundant split-arrow and visible-name tooltips. Actions, computer names and surface tabs now share actual text/container measurement and only reveal a full name when clipped; unchanged widths do not trigger updates.

- A rebuilt machine's Connect link no longer repeats the visible machine name in a tooltip; its accessibility label stays.

- Open in now detects the full T3 editor list, including VSCodium and JetBrains, instead of only four apps. Files’ split button matches the adjacent controls in size, shape and icon alignment, keeps both slots when disabled, and clickable menus use a pointer rather than a text cursor.

- Files now follows T3's tree structure, original file-icon shapes, directory breadcrumbs and filtered-tree search. Hover, selection and keyboard focus are separate; ignored entries dim without Review's change badges. The file header keeps fixed control slots, disabling unavailable actions instead of shifting them. Search has a padded focus ring. Breadcrumbs, tree rows and the split arrow have no tooltip. Directory breadcrumb hover brightens text without a background fill; keyboard focus rings remain. Collapsing a still-expanding tree cancels the old operation; directory reads are bounded and row statistics are cached.

- Wallpaper framing no longer rerasterizes every SVG tile at every Zoom step. Dragging, zooming and arrow keys reuse a cached, theme-coloured preview image; saved drawings keep their original SVG detail.

- Image imports start in Dots and offer Braille, Blocks (`░▒▓█`) and Quadrants in the preview's fixed top row. Their grids, cover/supersampling, autoLevels and glyph thresholds follow asciicn Studio; colours use eight value-opacity steps and the theme's nearest VGA-reference ANSI16 slot. New Dots use 4.5×9 cells; built-ins and existing square `.ans` stay unchanged. Reimport an original for the new processing. Switching only changes the draft, yields during generation and drops stale work; Studio files retain a disabled mode row. Fill/Fit, positioning, zoom, Reset and Apply/Cancel keep their fixed slots, including during mode changes.
- Replaced fixed Files/Review pages with closable per-space surface tabs, + and Open a surface. Files shares one tree; duplicate files/Review activate existing tabs. Panel `cmd-t` opens + and `cmd-w` closes the active surface. Hiding retains tabs; closing releases state, including Review's range. Each space retains only three recently displayed file previews/Editors. Tree menus reveal locally, copy relative paths and insert into this tab's last active terminal without Enter, restoring text clipboard safely. Terminal path clicks remain unavailable: the host provides no callback.

- Wallpaper controls now stay in place across built-in and imported pictures, progress, previews, errors and Studio guide expansion. Unavailable actions keep their slots and are disabled; deletion confirmation does not move the switcher.
- Shortened and aligned the English and Chinese layout recipes to fit Gallery's collection limit; the previous recipe was too large to be listed. The layout behaves the same.

## 2026-11-12

- Buttons now look and behave the same across the layout and its extras. A primary button is filled with your theme's ink, so asciicn wallpaper's **Choose image…** stays readable while it says **Opening…**. A disabled button fades to 64% and keeps its colours: the Actions editor's Save no longer turns grey, and Review's greyed buttons are easier to read. Hover now shows on dialogs, popovers, pane headers and the side panel in every theme, including Catppuccin, where it didn't show before. Icon buttons in Files and Review rest a little dimmer, like the rest of the layout. A few buttons changed size slightly: the pane header's sub-agents button, the pin in Lists, the Snooze calendar arrows and the Review bar's buttons.
- Shade-heavy `.ans` wallpapers now import without exceeding the tile writer's 1 MiB limit.
- Wallpaper imports preserve Unicode, leading-dash and hidden filenames. External `.ans`, `..ans` and `...ans` files are safely rejected; ordinary hidden names such as `.hidden.ans` work.
- If Apply saves the drawing but cannot build its final wallpaper, the preview stays open for another Apply. Retrying an unchanged draft reuses its saved file after checking the contents, without duplicate saves; the saved drawing remains even if you cancel.
- Confirmed wallpaper deletion cancels its in-progress conversion, so a late result cannot bring back the deleted entry or its cache.
- Detailed Dots wallpapers now save after previewing, fixing `Text file exceeds 1 MiB` on Apply. Large Studio `.ans` imports use the same save path, preserving the drawing and existing files.
- The panel's page header stays 40px tall: dragging its lower edge no longer stretches it into blank space. The panel can still be resized horizontally.
- asciicn wallpaper's `+` card separates **Choose image…** from **Import Studio file (.ans)…**, with **Create in asciicn Studio…** expanding three steps and **Open folder** as a fallback. Images preview across Home in Braille, Blocks or Dots (halftone), starting in Braille; **Apply** saves one wallpaper and selects it, **Cancel** keeps the previous one. Imported `.ans` files keep their rendered character style, without image-style choices. Colours follow the theme; other ASCII characters are approximated. Only the generated drawing is stored; your source image stays untouched. There is no post-save image editing.
- Deleting an added wallpaper now asks you to confirm its name; cancelling leaves its file and picture intact.
- Files and Review now keep their files, reading positions, line wrapping and file-tree widths independently. Long lines wrap by default; Files' toolbar wrap button and Lines in Review's settings switch each page to sideways scrolling and back. The Open in Review / Open in Files buttons and menu items are gone; use the page tabs and pick a file there. Each page starts with your previous wrapping and tree-width choices.
- Review's tree lists folders before files at every level and compares names naturally without case distinctions (`file2` before `file10`). Its diff and next/previous file navigation follow the same order. Both pages keep the resizing performance improvements, with reflow after the width holds for 300ms.
- The panel keeps full Files and Review data for only the three most recently viewed spaces per page; older spaces retain their reading choices and reload when revisited. Hidden Files pages stop reading and refreshing, and neither page keeps recursive folder watches. Files checks for changes while shown, usually every 5s locally or 10s remotely, slowing down for expensive reads; Review refreshes every 15s. Both catch up when shown again.
- Dragging the side panel's width no longer stutters: Files' code and Review's diff keep their wrapped lines where they broke while the width moves, and fit the new width a moment after you stop. A long file open in Files took about half a second for each step of the drag. The file column beside Files and Review no longer twitches as the panel resizes.
- Review no longer fails to render with themes such as Graphite whose checkbox color is translucent. Unchecked boxes keep the theme's transparency.
- Review's stuck file header covers the scrolling code in themes with translucent selection colors, so code no longer overlaps the filename.
- Review's wrapped lines of Chinese, Japanese or Korean now reach the panel's edge, as English ones do. They stopped well short: they were laid out as two English characters a character, while the code font, which has none, leaves them to a font that draws them narrower.
- Review's wrapped lines count each character's width by Unicode's tables, as terminals do: an emoji such as ✅ takes two columns, so a line with them no longer runs past the panel's edge, and an accent or an emoji joined from several stays whole instead of breaking across lines.

## 2026-11-11

- Switching Review's scope on a big diff no longer now and then shows "This view could not be re-rendered" in place of the page: wrapping its long lines is several times faster and no longer happens while the page draws.
- The Actions menu is narrower, as wide as the layout's other menus: 220 px instead of 280. A long action name is cut short. It now hangs right under the control with their right edges lined up, as the other menus hang from their buttons, instead of under wherever you clicked; so does the Review bar's menu in Herdr's own layout.
- The tab bar's last button (the panel's, or `+`) now stands right over the pane headers' last button, about as far from the window's corner as the sidebar's buttons from its edge. It sat 8 px further in.
- With the side panel widened over the work area, this layout's keys and Herdr's mark in the brand bar work again: going Home, the next or previous agent, switching tabs and spaces. They did nothing there. Going Home from it shows Home at once, and coming back finds the panel still wide.
- Coming back to Home no longer flashes: Home shows whole from its first frame, instead of one frame with a strip at the top while the tab row folded away (a wallpaper also shrank and grew back then), or with the side panel still open for a frame when you left one with it open.
- New extra, asciicn wallpaper: Home as a still picture in asciicn's style, in your theme's colours. Four come with it (a lighthouse, mountains at dusk, a nebula, embers), and you can add your own images or Studio `.ans` files from the switcher's `+` near Home's bottom-right corner. See [the extras](docs/user/extras.md#asciicn-wallpaper).
- The Review page's scope button no longer has a fill of its own over the toolbar: like the toolbar's other buttons, it fills only when hovered or while its menu is open.
- In this layout the Review bar is just the panel's button: the counts are gone from the tab bar (the Review page's scope menu still counts each scope), and nothing reads git for them any more. The analysis's spinner, `!` or dot sits inside the button, left of its icon, while the panel is closed; open, only the panel's Review tab shows it. Herdr's own layout keeps its counts.
- Review on a big diff: the file column's count is the group shown's, as its tree lists them; the file in front when a group shows has its folders open; a group's summary shows only once AI has analyzed the diff, not the folder rules' boilerplate; a binary file is just its header, without a "Binary file" line under it; a group tab of binary files only drops the dot before its file count; and the tabs' counts are no longer made again on every redraw.
- Review's file tree starts with its folders folded, as Files' does; a group's subgroups stay open, and a file you click or step to with `j`/`k` opens the folders down to it.
- Outside Herdr T3, the Review bar's counts lose the outline and the lines between them, and stay dim until you hover one or it's the diff shown. The logo stays last with its mark after it, also without the outline.
- Review's groups are tabs, as pulls.review's: one row across the page under the toolbar (each tab with its icon, lines added and removed, how many files and a ring for how much you've reviewed), and the one you pick is the diff and the file tree, alone. Before AI analyzes the diff the folder groups (Docs, Code…) are listed too. Subgroups remain rows in the tree. The tabs keep pulls.review's compact two lines (the name over lines added and removed and files) in this layout's outline, the group shown lit as the file tree's selected row; lined up with the toolbar's buttons and the file headers, in the panel's 12px type.
- Files and Review show loading, empty and failed the same way: a spinner and a line while loading, an icon, a title and a hint when there's nothing to show, and a red bar under the toolbar with Retry when something fails. Files' file that can't be read, or folder that can't be listed, now gets that bar and Retry instead of a grey sentence.
- Files and Review now look like one panel: the panel's body is a card, as the panes on the left are, each page's toolbar its first row; neither page paints a background of its own, so toolbar, content and file column (Files' line numbers included) all show the card's color, set apart only by their lines; both toolbars use T3's small borderless buttons with the same insets. A file row's right-click menu is the same on both pages, with Mark reviewed added on Review. Review's reviewed boxes lead each row, right after the chevron. With no review to show, Review's toolbar still stands, naming the page.
- Files and Review share one frame: a toolbar across the top, the content on the left, and the file tree in a column on the right (256 to start; drag its left edge). Each page keeps its own width and whether the column is hidden with the toolbar's rightmost button. Files' search and a Collapse all / Expand all button head its column; Review's column says how many files there are. Review keeps this shape at any panel width: its group sidebar and Groups: Tabs / Sidebar setting are gone, and the header no longer slides away on a long scroll.
- Files and Review draw their files with one tree, as T3's: 24px rows in the layout's font, folders with a chevron, a folder holding just one folder as one row (`a / b`), and the arrow keys, Home, End and Enter to move and open. In Review the tree and diff share one order; the file you're reading is its one lit row, set by a click or `j`/`k` and following the diff as it scrolls, where before every file in view was lit. Review's Files: Tree / List setting is gone. Only code (Files' editor, Review's diff) is in the code font, the one your settings pick; paths and the rest are in the layout's.
- Go to (`cmd-p`) lists the panes you were in lately first, newest first, as T3's command palette lists recent threads, however you moved between them: `cmd-p`, Enter goes back to where you just were. The pane you're in comes last, and typing, a name that matches comes before a folder or space that does. This replaces the Back row, which only knew jumps made from Go to.
- The Review page's base picker lists the default branch right under Automatic, as T3's does, the other branches newest first after it. Before, a `main` not committed to lately sat among the rest.
- Inbox: an agent waiting on you leads the cards, however long it has waited; the rest still go by when each came back, and `cmd-]` walks them in that order. Before, one waiting ten minutes sat under a card that had just gone quiet.
- Pinning from a button or a menu puts the agent on top of Pinned, as T3 does, instead of at the end. A drag into Pinned still lands where you drop it.
- With more than one machine, `ctrl-1…9` and the next and previous space keys follow Spaces as drawn, each machine's spaces together. Before, a space opened on another machine could sit between this computer's in Herdr's order, so the keys hopped machines.
- The Review page compares a branch with any base, as T3 does: on Changes, the base after `head →` is a button. Pick another branch, local or remote (a row's switch takes its remote), or Automatic for the default branch; each space keeps its pick, Changes counts against it and Commits lists what's past it. A space with nothing picked opens on its branch's Changes, as T3's diff panel does, rather than on uncommitted files or a prompt to pick a diff. The scope menu's Branches submenu is gone; the Review bar's own menu keeps its Branches page.
- Menus open their next level beside them, as T3's submenus, instead of turning into another menu or page: Snooze's times in an agent's right-click menu, Commits in the Review page's scope menu, and Language, Agent and Model in its settings. Rest on the row, or click it; → or Enter opens it from the keyboard and ← or Esc goes back. Moving the pointer across other rows toward it doesn't switch it.
- The tab bar's `⧉` (Show all panes) is gone, beside the agent's name and at the end of a zoomed tab's panes alike: the pane header's zoom button or `cmd-shift-enter` shows a zoomed tab's panes again.
- The space panel's keys follow T3's: `cmd-alt-b` shows or hides it on the page last shown, with the keyboard in the panel `cmd-w` closes it instead of the tab behind, and with the Review extra `cmd-shift-g` opens Review, or closes the panel showing it. `cmd-d` stays Herdr's split. Updating: `scripts/update.sh` adds the new keys.
- Each space keeps its own panel, as T3 keeps one per thread: open or closed, its page and widened or not come back as you switch to it, and a space you haven't opened it in has it closed. Its width stays one for the window.

- With Inbox, a settled or snoozed agent's pane header says so where its status mark goes: Settle's check, or the clock and the time left. Split beside one at work, you see at a glance which is put away.

- New: Files, a read-only view of the current space's folder, on this computer or another machine, in a new panel at the window's right. Open it with the panel button at the tab bar's right end (the sidebar's toggle, mirrored) or `cmd-alt-b`. The tree on the right dims what Git ignores and marks changed files A, M, D or R; pick a file to read it on the left, with syntax colors, a Markdown preview or the image. Search files finds any file by its path. Right-click a row to copy its path, mention it in the space's agent, or reveal it in Finder. See [the guide](docs/user/guide.md#features).
- The panel is one for the whole window: as tall as the sidebar, it stays as you switch tabs and shows the current space. Its top row has its pages, `⤢` to widen it over the tabs, and `×` to close it.
- Review moved into that panel, as its second page, beside Files. It is no longer a pane in a tab: there's no Review pane, tab or Inbox card, and the `Open in` setting is gone. Each space keeps its own review. The diff is on the left and its files on the right, with group tabs above both. The pulls.review logo moved to the panel's Review tab. The scope button at the left of the Review page's header, as T3 Code's diff panel has it, says what you're reviewing (Changes, Uncommitted, Outgoing, Incoming or a commit) and opens a menu to pick another: those four with their counts, then Commits, a searchable submenu beside it. On one commit of a branch, its short SHA and `‹ ›` step through the branch's commits. `scripts/update.sh` adds the page by itself when the extra is installed, and renames a Review bar block with the id `review` to `review-bar`.

- Right-clicking anything that stands for an agent, a space, a repo, a machine, a tab or a pane opens its menu, the same wherever you right-click it. New: an Inbox card or settled or snoozed row, an Agents row or sub-agent row, a repo's dim row in Spaces (Open, Copy path), a machine's heading (New space here, Connect) and a space in the Inbox's filter. An agent's menu has Pin, Settle and Snooze (Wake once snoozed; in Lists only Pin), then Rename, Copy address and Send back, then Close. A space's adds New tab and Copy path. Items come in groups with a rule between them, as T3's, and what can't be done right now isn't listed. Settling an agent from its menu while you look at another leaves you where you are. In the tab bar, right-clicking the parent or a dimmed title opens that agent's menu instead of its pane's. Herdr's own theme and keybinds menu, which nothing here opened, is gone.
- Pinning an agent from the tab bar's menu ends its snooze, as pinning it from the agents list always has. Behind this, every pin, label and stored value now goes through one place each. Your pins, Home, actions and the Inbox's open shelves move to their new names by themselves the first time the layout starts; there's nothing to do.
- With Inbox, the tabs at the top right hug their names, evenly spaced and flush against Actions; hovering one turns its icon into the ×. They show no status mark there, so the slot after each name that holds one in Lists is gone.
- With Inbox, the tabs at the top right line up against Actions: short of room, the ones nearest it stay whole and the far end fades out, instead of the last tab being cut off against Actions. In Lists too, the end of the tab bar that's cut now fades out.
- The wheel over the tab bar now only scrolls the tabs, up and down as sideways, instead of switching to the next or previous tab; click a tab to go to it.
- `scripts/update.sh` stops, changing nothing, when the layout names a mod that isn't in this checkout or the app, and says which. Installed anyway, Herdr would start on its own layout the next time it opens, as if this one were gone.
- The server icon in the sidebar footer is gone. Add a machine from Herdr's Settings.
- In a narrow sidebar, Herdr's name at the top left goes and its mark stays, instead of showing `Her…`.
- Hiding the sidebar, its toggle now stands where Herdr's mark was, instead of a few pixels to the right.

## 2026-11-10

- The confirmation before closing a terminal, deleting an action or clearing Settled matches the rest of the layout: its button says what it does (Close, Delete) in red text, as the Actions editor's Delete, instead of a filled Confirm, with no band behind the buttons.
- Split, the panes beside the one you're in recede: their header's icon, name and folder dim, back up when you hover them, as T3's split terminals show where you are with no ring. A status mark that needs you stays as bright.
- With Inbox showing, the tab bar is about the agent you're looking at, the card Inbox lights, as T3's thread header. At the left: the space, which takes you to an empty tab there, the one already waiting or else a new one, and replaces `+` while Inbox shows; the parent when it's a sub-agent, and the agent's name, which opens its menu, as `⌄` after it does: Pin, Snooze and Settle, as on its card, and Rename when it's alone in its tab. A right-click on the agent's name opens the same menu, as in T3; on the space, the space's menu. Only the agent you're looking at: another agent in the same tab is reached by its card, or its pane. At the right, apart from it: its sub-agents' tabs, then the tabs with no agent. With a program in focus, the agent stays there unlit; in a tool's tab you went to from the bar it dims, and a click goes back. Once you start something new, from the space at the left or with `cmd-t`, there's only the space: the last agent's name doesn't follow you there, until you look at an agent again. In a narrow window the parent shortens to `…`. An agent's pane shown alone, the only one in its tab or zoomed, no longer repeats the agent's name in its header; split, each pane still says its own.
- A zoomed tab with several panes shows them in the tab bar, a segment each, in Lists and Inbox alike: click one to zoom it instead, or `⧉` to see them all again. It used to show only a `Z` after the tab's name. With Inbox, the agent's own tab puts `⧉` beside the agent's name and shows only its panes that aren't agents; the other agents in it are reached by their cards.
- Undo in the sidebar footer no longer flashes Herdr's "This view could not be re-rendered" warning over the Inbox, and neither does switching themes with a file shown whole in Review.
- Settings of the layout's own: the sliders button in the sidebar's footer, or `cmd-shift-,`, opens them, laid out as Herdr's Settings. Changes apply at once and survive updates.
  - **After putting away**: Home, as before, or Next card: settling, snoozing, dragging or sweeping away the agent you're looking at opens the next card, and Home once none is left. If you removed `"home"` from `t3-inbox`'s props to get this, pick Next card instead: an update puts the prop back.
  - **Home shows**, a dropdown: Default, the page with its three buttons; Terminal, a shell in your home folder; or one of your own mods whose `mod.json` says `"home": true`.
- Home is one thing alone now, its page, its terminal or your mod: no pane header, nor the empty strip one leaves above a full-screen program, nothing to split or close, and with the sidebar shown it fills the height where the empty tab bar was. Home also holds no agent: start one in its terminal and that space becomes an ordinary one, named for its folder, where you are; going Home next makes a new Home. It used to take Home over, so going Home, Settle and Snooze all landed on it.
- A pane header's sub-agent menu drops the counts on top, as its button already says them. Each row's status moves from a dot on its program icon to the row's right end, marked as in Agents: a spinner while working, `!` when it needs you, a ring when idle. The time or `Needs you` before it, the indents and the details card on hover stay.

## 2026-11-09

- Settings → Look: Herdr T3's layout card shows what the layout is for. One card that needs you is lit, the rest sit folded in Working. The old picture was the whole window shrunk until it read as noise.

- Lists no longer follows Inbox's ways with attention:
  - `cmd-shift-s` does nothing in Lists. Settle belongs to Inbox, which has a Settled shelf to put agents on.
  - Closing the agent you're on in Lists, its whole tab or its last pane, goes back to the tab you were on before in that space, as closing any other tab does. It used to go to Home.
  - A snoozed agent's row spins while it works, as its tab does. It used to read idle. With the sidebar hidden in Lists, its toggle counts it as working too.
  - Moving to an agent of another space in Lists keeps Inbox's space filter. It used to clear it.
- Snooze: a failed turn, or new work you give the agent in view, ends its snooze even if Inbox hasn't shown since Herdr started. It used to stay snoozed, its done dot hidden until the snooze ran out.

- Inbox: with Working folded, its header sits as far from Snoozed's as Snoozed's from Settled's. It used to sit 5px further.

- Lists: Agents rows no longer show a remote machine icon between the title and controls. Hover a row to see the machine's name in its details.

- Program icons follow Herdr's official artwork throughout the layout, preserving each component's icon size and the artwork's original whitespace and colors.

- Inbox: remote machine marks no longer open a separate tooltip. Hover the card to see the machine's name in its details.

- Review bar: a commit or branch picked from the logo's menu loads in the Review pane. It used to wait 30 seconds and fail with a timeout, while a count's click worked.
- Review pane: fewer reads and less work while you review.
  - On a branch, commit or push/pull page, editing files in the worktree no longer reads the review again: only a commit, a checkout or a moved branch does. The uncommitted changes' page still follows every file you save.
  - Stepping between commits of the same diff no longer reads the whole diff once more for its commit list. Each refresh still does, so a new commit reaches the list.
  - A jin.review that cuts long lines and measures them itself spares the pane doing it again for each batch of diffs.
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
