// No UI. Writes the colors Herdr draws with now (Settings picks, layout themes and the system's light or
// dark mode included) to ~/.cache/herdr-app-theme.json, so terminal programs such as Pi can follow them.
// Its block is 0px but shown: a hidden copy never starts. The Pi side: JinJieBeWater/pi-stuff, packages/pi-herdr-theme.
import { View, div } from "gpui-kit";
import { theme, themes, settings, home, readTextFile, writeTextFile } from "herdr";

const file = () => `${home()}/.cache/herdr-app-theme.json`;

export default class ThemeExport extends View {
  init() {
    this.written = null;
  }

  // Runs whenever Herdr's live data changes, the theme included; writes only when the colors do.
  render() {
    const name = settings().theme;
    const known = themes().find((t) => t.name === name);
    const text = `${JSON.stringify({ name, light: known?.light, colors: { ...known?.colors, ...theme() } }, null, 2)}\n`;
    if (text !== this.written && !this.writing) {
      this.writing = true;
      readTextFile(file())
        .then((old) => (old === text ? null : writeTextFile(file(), text, old)))
        .then(() => (this.written = text))
        // Another window wrote first: the next render tries again.
        .catch(() => {})
        .finally(() => (this.writing = false));
    }
    return div();
  }
}
