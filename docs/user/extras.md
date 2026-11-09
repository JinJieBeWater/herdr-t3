# Herdr T3 extras

English · [中文](extras.zh-CN.md)

Not part of the layout and not copied by an install; add them by hand if you want them.

## pulls.review

`extras/mods/pulls-review` and `extras/mods/review`: a Review bar and a review pane, for [my pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo) (its CLI is `jin.review`). The bar counts what there is to review in the focused worktree (the branch's commits past the default branch, uncommitted files, commits to push and pull), and a click opens that review, one per space: `Open in` in the pane's settings picks a pane beside the agent or a tab. The pane's own toolbar switches between the diff's commits. The logo's menu picks a commit of the branch or another branch instead, and opens it the same way. Analyze automatically applies to a count's click only. Also published alone as [herdr-pulls-review](https://github.com/JinJieBeWater/herdr-pulls-review): install it as [its README](https://github.com/JinJieBeWater/herdr-pulls-review#install) says (`herdr.dev/mods/JinJieBeWater/herdr-pulls-review`, or copy both folders into `~/.config/herdr-app/mods/`), then ask your Herdr agent to put its block in this layout's `tabs-row` row, right after `tabs`. `scripts/update.sh` keeps that block when it updates the layout. The pane's tab and header show its analysis with this layout's marks.

## Theme export for Pi

`extras/mods/t3-theme-export` is the Herdr half of [pi-herdr-theme](https://github.com/JinJieBeWater/pi-stuff/tree/main/packages/pi-herdr-theme), a Pi extension in [my Pi setup](https://github.com/JinJieBeWater/pi-stuff) that makes Pi's colors follow Herdr's. The mod has no UI: whenever the colors Herdr draws with change (a pick in Settings, a layout's theme, the system's light or dark mode, a built-in preset), it writes `{ "name", "colors" }` to `~/.cache/herdr-app-theme.json`; the extension watches that file and regenerates Pi's theme. Install both: copy the folder into `~/.config/herdr-app/mods/`, then ask your Herdr agent to add `{ "id": "theme-export", "type": "block", "size": { "px": 0 }, "content": { "mod": "t3-theme-export" } }` at the end of this layout's `work` column, once. Leave it shown: a hidden block never starts. It only runs in a layout that has it: switch to another and Pi keeps its colors, so add the block there too if you want Pi to follow. `scripts/update.sh` keeps that block when it updates this layout.

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
