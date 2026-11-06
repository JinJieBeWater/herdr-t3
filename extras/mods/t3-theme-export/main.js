// No UI. Writes the colors Herdr draws with now (Settings picks, layout themes and the system's light or
// dark mode included) to ~/.cache/herdr-app-theme.json, so terminal programs such as Pi can follow them.
// Its block is 0px but shown: a hidden copy never starts. The Pi side: JinJieBeWater/pi-stuff, packages/pi-herdr-theme.
import { View, div } from "gpui-kit";
import { theme, settings, home, readTextFile, writeTextFile } from "herdr";

const file = () => `${home()}/.cache/herdr-app-theme.json`;
const colors = () => `${JSON.stringify({ name: settings().theme, colors: theme() }, null, 2)}\n`;

export default class ThemeExport extends View {
  init() {
    this.written = null;
  }

  // Runs when the colors change and on other full refreshes (another mod's setShared), not on live data: it reads none.
  render() {
    this.write();
    return div();
  }

  async write() {
    if (this.writing) return;
    this.writing = true;
    try {
      // A change during a write has no render of its own, so look again after each.
      for (let text = colors(); text !== this.written; text = colors()) {
        const old = await readTextFile(file());
        if (old !== text) await writeTextFile(file(), text, old);
        this.written = text;
      }
    } catch {
      // Something else changed the file, or it can't be written: the next refresh tries again.
    } finally {
      this.writing = false;
    }
  }
}
