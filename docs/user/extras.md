# Herdr T3 extras

English · [中文](extras.zh-CN.md)

Not part of the layout and not copied by an install; add them by hand if you want them.

## pulls.review

`extras/mods/pulls-review` and `extras/mods/review`: a Review bar and the space panel's Review page, for [my pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo) (its CLI is `jin.review`). The bar counts what there is to review in the focused worktree (the branch's commits past the default branch, uncommitted files, commits to push and pull), and a click opens that review on the panel's Review page, beside Files. Each space keeps its own review and the page shows the current space's; the page's scope button, at the left of its header, says what it shows and picks another: Changes (the branch against the default branch, with `head → base` after the button, its base a button to pick another branch, local or remote, kept for the space), Uncommitted, Outgoing and Incoming (commits to push and to pull), or from its Commits submenu a commit of the branch; on one commit, its short SHA and `‹ ›` step through the branch's commits. Long lines wrap at the panel's edge; `Lines: Scroll` in its settings scrolls them sideways instead, independently of Files. Analyze automatically applies to a count's click only. In this layout the bar is just the panel's button, in place of the logo, which is the panel's Review tab: no counts in the tab bar (the Review page's scope menu has them); the analysis shows with this layout's marks inside that button, left of its icon, while the panel is closed, and on the tab while it's open. In Herdr's own layout the counts stay, without an outline, dim until hovered or until theirs is the diff shown. Also published alone as [herdr-pulls-review](https://github.com/JinJieBeWater/herdr-pulls-review): install it as [its README](https://github.com/JinJieBeWater/herdr-pulls-review#install) says (`herdr.dev/mods/JinJieBeWater/herdr-pulls-review`, or copy both folders into `~/.config/herdr-app/mods/`), then ask your Herdr agent to put its bar block (`"id": "review-bar"`, with `"toggle": true` in its props) in this layout's `tabs-row` row, right before `tabs-end`, beside the panel's toggle, and `{ "id": "review", "type": "block", "content": { "mod": "review" } }` at the end of the `panel-body` stack. `scripts/update.sh` adds the page by itself once the extra is installed, and keeps the bar block, with `toggle`, when it updates the layout.

Review follows your theme, including translucent checkbox colors in themes such as Graphite. The stuck file header keeps an opaque background so scrolling code cannot overlap its filename.

## Theme export for Pi

`extras/mods/t3-theme-export` is the Herdr half of [pi-herdr-theme](https://github.com/JinJieBeWater/pi-stuff/tree/main/packages/pi-herdr-theme), a Pi extension in [my Pi setup](https://github.com/JinJieBeWater/pi-stuff) that makes Pi's colors follow Herdr's. The mod has no UI: whenever the colors Herdr draws with change (a pick in Settings, a layout's theme, the system's light or dark mode, a built-in preset), it writes `{ "name", "colors" }` to `~/.cache/herdr-app-theme.json`; the extension watches that file and regenerates Pi's theme. Install both: copy the folder into `~/.config/herdr-app/mods/`, then ask your Herdr agent to add `{ "id": "theme-export", "type": "block", "size": { "px": 0 }, "content": { "mod": "t3-theme-export" } }` at the end of this layout's `work` column, once. Leave it shown: a hidden block never starts. It only runs in a layout that has it: switch to another and Pi keeps its colors, so add the block there too if you want Pi to follow. `scripts/update.sh` keeps that block when it updates this layout.

## asciicn wallpaper

A Home that is a still picture in [asciicn](https://asciicn.dev)'s style, in your theme's colours, so it changes with the theme, light or dark. It comes with four of asciicn's pictures (Lighthouse, Mountain dusk, Nebula, Ember), and takes your own images or `.ans` files.

Move the pointer to Home's bottom-right corner and a switcher shows there: `‹ ›` step through the pictures. `+` opens a card with **Choose image…** as the main action and **Import Studio file (.ans)…** for a picture already made in Studio.

**Choose image…** picks an image (PNG, JPG, HEIC and the like) and previews it across Home in **Dots** (halftone), with no style selector. **Import Studio file (.ans)…** opens the same composition preview while keeping the file's character style.

Before applying, choose **Fill** (cover, the default) or **Fit** (contain), drag the picture to position it, and use the zoom slider from 1× to 4×. Fit at 1× shows the whole picture; zooming in can crop it. With the preview canvas focused, arrow keys adjust its position; the slider can also be used with the keyboard. **Reset** restores centred Fill at 1×. **Apply** saves one `.ans` wallpaper and its composition, then selects it when ready; **Cancel** returns to your previous wallpaper without saving or changing its composition. Only the drawing and composition are stored; your source image stays untouched. After Apply, the controls disappear and the wallpaper cannot be dragged or reopened for editing.

If Apply saves the drawing but cannot build its final wallpaper, it keeps the preview open. Fix the reported problem and press **Apply** again: an unchanged draft reuses its own saved file if its contents still match, rather than saving a duplicate. The saved `.ans` stays in your folder even if you then cancel.

For finer control (contrast, dithering, other characters), expand **Create in asciicn Studio…** and follow its three steps: 1. **Open asciicn Studio ↗**; 2. make your picture and save with the **.ans** button under it (it goes to Downloads); 3. return here and choose **Import Studio file (.ans)…**, adjust its composition, then **Apply**. Existing Braille and block drawings keep their character styles. The wallpaper you select stays selected, in a new Home too. To delete one you added, press `×`, check its name in the confirmation, then confirm; cancelling leaves it alone. Confirming removes its saved composition and stops any conversion of that wallpaper, so it cannot reappear when an old conversion finishes.

What you add is kept in `~/.config/herdr-app/asciicn-wallpaper/` as `.ans` files: the auxiliary **Open folder** shows it, an `.ans` file you copy there shows up too, and one you change there is drawn again. Copying a file there bypasses the preview and uses the default composition. Braille, blocks, quadrants and halftone dots keep their shapes; other ASCII characters are approximated as marks as big as they are dark, so a picture made of letters keeps its shading, not its letter shapes. Colours become the nearest of your theme's, rather than the original image's exact colours. Saved composition survives a restart, theme change or cache rebuild. Resizing Home or opening and closing the sidebar keeps the same placement and zoom settings, but can change how much is cropped. Built-in pictures and older wallpapers keep their previous fill and subject alignment. A phone photo that's on its side in Herdr was rotated by a camera tag: rotate it in Preview first.

Unicode names, names beginning with `-` and ordinary hidden files such as `.hidden.ans` are supported. External files named exactly `.ans`, `..ans` or `...ans` are rejected; rename them to a meaningful name first. Dense shade characters (`░`, `▒`, `▓`) can be imported too, without oversized generated tiles.

Install: copy `extras/mods/asciicn-wallpaper` into `~/.config/herdr-app/mods/`, then pick asciicn wallpaper under **Home shows** in this layout's settings. `scripts/update.sh` updates it, and leaves what you added alone. Image selection is available on macOS, and on Linux with `zenity` and ImageMagick installed; without ImageMagick, use **Import Studio file (.ans)…**. Where no file picker is available (including Windows), use **Open folder** to copy in `.ans` files. The built-in pictures are asciicn's, MIT (`LICENSE-asciicn`).

## Theme and settings

The layout sets no theme: yours stays. `extras/themes/` holds two light and dark pairs if you want them:

- `catppuccin-mocha` and `catppuccin-latte`: [Catppuccin](https://catppuccin.com)'s official palette, terminal colors as its spec gives them and the panels in Catppuccin's own surfaces (mantle behind, base for cards, surface0 for selection and borders), with blue as the accent.
- `t3-code-dark` and `t3-code-light`: the colors T3 Code's web app draws by default, a true black canvas with accent `#346bf1` and a `#fcfcfc` canvas with accent `#1b4ed8`, with the VS Code terminal palette T3 Code uses. Terminal text takes the chat's 90% foreground, so an agent's replies read like T3 Code's.

Copy the files you want into `~/.config/herdr-app/themes/` and pick one in Settings, or set a pair in `settings.json` so it follows the system's light and dark mode, for example `"theme": { "light": "catppuccin-latte", "dark": "catppuccin-mocha" }`. The preview's other settings:

```json
{
  "font": "Geist Mono",
  "ui_font": "Geist",
  "font_size": 12,
  "zoom": 1.1,
  "minimum_contrast": 3
}
```
