// Home as a still picture in asciicn's dots (https://asciicn.dev, MIT, see LICENSE-asciicn): one of its own, one of the
// person's images drawn as its Studio draws an image in Braille, or a frame they made in that Studio, in the theme's colours.
// Every picture is tiles of one theme colour at one opacity (ascii-art.js); the theme tints them, so a new theme repaints
// them at once. The built-ins are under scenes/ (scripts/wallpaper.mjs); imports are the `.ans` files in
// <appHome>/asciicn-wallpaper/ (an image becomes one there), each converted once into its .tiles/<name>/, its
// scene.json written last and keyed by the file's cksum and the converter's VERSION, so a changed or half-converted one,
// or one an older converter made, is converted again.
// The pointer near the bottom-right corner shows the switcher: ‹ › step through them all, × deletes an import, and + opens
// a card above it that takes one in: the system's file dialog for an image or an .ans file, the folder to drop .ans files
// into, and asciicn's Studio (on an image in Braille and true colour; its .ans button saves) for finer control.
// The picture picked is the person's, shared under `asciicn-wallpaper.scene`, so a new Home shows it too.
//
// The picture scales with the pane's height. Across, its subject (the scene's `focus`) is pinned by a percentage left and
// a fixed margin, which layout works out itself: a width change, as the sidebar folding, only shows more or less of the
// edges, with no frame laid out late and nothing rasterised again. Sizing from the width would do both, so only a picture
// narrower than the pane does (Studio's frames are about 1.2:1, the built-ins 2.4:1): it fills the width and is cut
// evenly at the top and bottom.
// Reaching Home other than by t3-tabs (which lays it out first), the pane shows for a frame or two 60px short (still under
// `main`'s header and the unfolded tab row, see t3-tabs' fitRow) before it takes its height: the picture hangs from the
// bottom, which stays put, and a smaller height counts only once it has lasted 250ms, so that dip neither moves nor rescales it.
// shortcut: imports go through sh, cp, rm, cksum and base64, the dialog through osascript (macOS) or zenity (Linux), an image
// through sips (macOS) or ImageMagick (Linux); on Windows the card offers only the folder, until Herdr gives mods a file picker.
// shortcut: an image's EXIF rotation is ignored, so a phone photo can come out on its side; rotate it first if that bites.
import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { appHome, exec, notify, readTextFile, setShared, settings, shared, theme, watchFolder, window, writeTextFile } from "herdr";
import { SCENES } from "./scenes.js";
import { VERSION, brailleAns, convert, decodeBmp, imageGrid } from "./ascii-art.js";

const MOD = "asciicn-wallpaper", KEY = `${MOD}.scene`;
const BUILT_IN = SCENES.map((s) => ({ ...s, base: `mods/${MOD}/scenes/${s.id}` }));
const zoom = () => Number(settings()?.zoom) || 1;
// Where the pointer shows the switcher: it at its widest, 12 from the corner, and about 60 more each way.
const CORNER = { w: 340, h: 104 };
// Imports being converted, by name: the module is shared by every copy, so two Homes don't convert one file twice.
const converting = new Set();
const tick = (cx) => new Promise((go) => cx.timer.after(0, () => go(undefined)));
// A generator from ascii-art.js run to its end, a tick wherever it yields null.
async function finish(it, cx) {
  for (let step = it.next(); ; step = it.next()) {
    if (step.done) return step.value;
    await tick(cx);
  }
}
const sh = (script, dir, timeout) => exec("sh", ["-c", script], { cwd: dir, timeout });
const quote = (s) => `'${s.replaceAll("'", "'\\''")}'`;
// Studio on an image, in Braille and true colour: the set that converts most faithfully.
const STUDIO = "https://asciicn.dev/studio?source=image&charset=braille&color=truecolor";
const opener = () => ({ macos: "open", windows: "explorer" })[window()?.platform] ?? "xdg-open";

export default class Wallpaper extends View {
  init(_props, cx) {
    this.height = null;
    this.over = false;
    this.hot = null;
    this.imported = [];
    this.importing = null;
    this.dir = `${appHome()}/${MOD}`;
    cx.spawn(async (cx) => {
      await exec("mkdir", ["-p", `${this.dir}/.tiles`]);
      await this.refresh(cx);
      // Our own tile writes land here too: only an .ans file, or a batch that means everything, is news.
      for (;;) if ((await watchFolder(this.dir)).some((p) => p === this.dir || p.endsWith(".ans"))) await this.refresh(cx);
    });
  }

  // The folder's .ans files: each shown once converted, converted when it isn't yet or changed since; tiles of a removed one go.
  async refresh(cx) {
    const listed = await sh('for f in *.ans; do [ -f "$f" ] && cksum "$f"; done; cd .tiles && for d in */; do [ -e "../${d%/}.ans" ] || rm -rf "$d"; done; :', this.dir);
    const files = listed.stdout.split("\n").map((l) => l.match(/^(\d+) (\d+) (.+)\.ans$/)).filter(Boolean).map((m) => ({ sum: `${m[1]}-${m[2]}-${VERSION}`, name: m[3] }));
    const shown = [], todo = [];
    for (const f of files) {
      let kept = null;
      try { kept = JSON.parse((await readTextFile(`${this.dir}/.tiles/${f.name}/scene.json`)) ?? "null"); } catch { kept = null; }
      if (kept?.sum !== f.sum) todo.push(f);
      else if (!kept.failed) shown.push({ ...kept, id: `file:${f.name}`, name: f.name, base: `${MOD}/.tiles/${f.name}` });
    }
    this.imported = shown.sort((a, b) => a.name.localeCompare(b.name));
    cx.notify();
    for (const f of todo) await this.convertFile(f, cx);
  }

  async convertFile(f, cx) {
    if (converting.has(f.name)) return;
    converting.add(f.name);
    this.importing = f.name;
    cx.notify();
    const out = `${this.dir}/.tiles/${f.name}`, mark = (scene) => writeTextFile(`${out}/scene.json`, JSON.stringify({ sum: f.sum, ...scene }), null);
    try {
      const text = await exec("cat", [`${this.dir}/${f.name}.ans`]);
      await exec("rm", ["-rf", out]);
      await exec("mkdir", ["-p", out]);
      if (text.code !== 0) throw new Error(text.stderr.trim());
      const it = convert(text.stdout), tiles = [];
      let step;
      while (!(step = it.next()).done) {
        if (!step.value) { await tick(cx); continue; }
        const { svg: body, ...tile } = step.value;
        await writeTextFile(`${out}/${tile.file}`, body, null);
        tiles.push(tile);
      }
      // Marked as tried, so the folder's next change doesn't convert it again.
      if (!tiles.length) {
        await mark({ failed: true });
        notify({ title: "Couldn't import the wallpaper", body: `${f.name}.ans has no picture in it. In asciicn's Studio, save with the .ans button.`, level: "warning" });
        return;
      }
      await mark({ focus: 0.5, width: step.value.width, height: step.value.height, tiles });
      this.imported = [...this.imported.filter((s) => s.name !== f.name), { focus: 0.5, ...step.value, sum: f.sum, tiles, id: `file:${f.name}`, name: f.name, base: `${MOD}/.tiles/${f.name}` }]
        .sort((a, b) => a.name.localeCompare(b.name));
      if (this.picking === f.name) { this.picking = null; setShared(KEY, `file:${f.name}`); }
    } catch (e) {
      await mark({ failed: true }).catch(() => null);
      notify({ title: "Couldn't import the wallpaper", body: `${f.name}.ans: ${e?.message ?? e}`, level: "warning" });
    } finally {
      converting.delete(f.name);
      this.importing = null;
      cx.notify();
    }
  }

  // The system's file dialog for an image or an .ans file, then into the folder, where the watch converts it: an .ans
  // copied, an image drawn as one. No `activate`: macOS no longer lets a process take the front, and osascript waits 2s to
  // find out. No `default location` (Downloads, where the browser saves): naming a folder makes macOS ask whether Herdr may
  // read it; the dialog opens where it was last.
  async choose(cx) {
    this.opening = true;
    cx.notify();
    const mac = window()?.platform === "macos";
    const picked = await (mac
      ? exec("osascript", ["-e", 'POSIX path of (choose file with prompt "Choose a picture for your wallpaper, or an .ans file from asciicn\'s Studio" of type {"public.image", "ans"})'], { timeout: 600000 })
      : exec("zenity", ["--file-selection", "--title=Choose a picture for your wallpaper, or an .ans file from asciicn's Studio",
        "--file-filter=Pictures and .ans | *.png *.jpg *.jpeg *.webp *.gif *.bmp *.tif *.tiff *.heic *.ans"], { timeout: 600000 })).catch(() => null);
    this.opening = false;
    cx.notify();
    if (!picked) {
      notify({ title: "No file dialog here", body: `Copy .ans files into ${this.dir}: Open folder shows it.`, level: "info" });
      return;
    }
    const from = picked.stdout.trim();
    // Cancelled: osascript's -128, zenity's 1, nothing said.
    if (picked.code !== 0 || !from) return;
    const file = from.split("/").pop(), ans = file.toLowerCase().endsWith(".ans");
    const base = file.replace(/\.[^.]*$/, "").replace(/[^\w .-]+/g, "-").trim() || "wallpaper";
    const taken = await sh("ls *.ans 2>/dev/null; :", this.dir);
    const names = new Set(taken.stdout.split("\n").map((l) => l.slice(0, -4)));
    let name = base;
    for (let n = 2; names.has(name); n++) name = `${base} ${n}`;
    this.picking = name;
    this.guide = false;
    if (ans) {
      const copied = await exec("cp", [from, `${this.dir}/${name}.ans`]);
      if (copied.code !== 0) return this.failed(name, copied.stderr.trim(), cx);
    } else if (!(await this.drawImage(from, name, cx))) return;
    await this.refresh(cx);
  }

  // An image as asciicn's Studio draws one in Braille and true colour (ascii-art.js brailleAns): scaled to the sample grid
  // and written as a BMP by sips or ImageMagick, read back as base64, and saved as `<name>.ans`.
  async drawImage(from, name, cx) {
    this.importing = name;
    cx.notify();
    const bmp = `${this.dir}/.tiles/.image.bmp`, mac = window()?.platform === "macos";
    try {
      const size = await (mac ? exec("sips", ["-g", "pixelWidth", "-g", "pixelHeight", from]) : exec("identify", ["-format", "%w %h", `${from}[0]`]));
      const [w, h] = mac ? ["Width", "Height"].map((d) => Number(size.stdout.match(new RegExp(`pixel${d}: (\\d+)`))?.[1])) : size.stdout.trim().split(" ").map(Number);
      if (!(w > 0 && h > 0)) throw new Error("it isn't a picture this computer can read");
      const grid = imageGrid(w, h);
      const made = await (mac ? exec("sips", ["-s", "format", "bmp", "-z", String(grid.height), String(grid.width), from, "--out", bmp])
        : exec("convert", [`${from}[0]`, "-resize", `${grid.width}x${grid.height}!`, `bmp3:${bmp}`]));
      if (made.code !== 0) throw new Error(made.stderr.trim() || "it couldn't be resized");
      const read = await sh(`base64 < ${quote(bmp)} | tr -d '\\n'; rm -f ${quote(bmp)}`, this.dir);
      const text = await finish(brailleAns(await finish(decodeBmp(read.stdout), cx)), cx);
      await writeTextFile(`${this.dir}/${name}.ans`, text, null);
      return true;
    } catch (e) {
      const missing = !mac && /ENOENT|not found|spawn/i.test(String(e?.message ?? e));
      this.failed(name, missing ? "Install ImageMagick to import pictures, or save one as .ans in asciicn's Studio." : `${e?.message ?? e}`, cx);
      return false;
    } finally {
      this.importing = null;
      cx.notify();
    }
  }

  failed(name, why, cx) {
    if (this.picking === name) this.picking = null;
    notify({ title: "Couldn't import the wallpaper", body: `${name}: ${why}`, level: "warning" });
    cx.notify();
  }

  // The import and its tiles; the one before it shows.
  async remove(scene, all, i, cx) {
    setShared(KEY, all[(i - 1 + all.length) % all.length].id);
    this.imported = this.imported.filter((s) => s.id !== scene.id);
    this.hot = null;
    cx.notify();
    await sh(`rm -rf ${quote(`${scene.name}.ans`)} ${quote(`.tiles/${scene.name}`)}`, this.dir);
  }

  render() {
    const t = theme(), all = [...BUILT_IN, ...this.imported];
    const i = Math.max(0, all.findIndex((s) => s.id === shared(KEY))), scene = all[i];
    const root = div().id("wallpaper").size_full().relative().overflow_hidden()
      .on_size_change((size, cx) => {
        const height = this.seen = Math.round(size.height / zoom()), width = Math.round(size.width / zoom());
        if (width !== this.width) { this.width = width; cx.notify(); }
        if (!this.height || height > this.height) { this.height = height; cx.notify(); }
        else if (height < this.height) cx.timer.after(250, (cx) => { if (this.seen < this.height) { this.height = this.seen; cx.notify(); } });
      });
    if (!this.height) return root;
    const unit = Math.max(this.height / scene.height, (this.width ?? 0) / scene.width), w = scene.width * unit, h = scene.height * unit;
    const picture = div().id(`wallpaper-${scene.id}`).absolute().bottom((this.height - h) / 2).left(`${scene.focus * 100}%`).ml(-scene.focus * w).w(w).h(h)
      .children(scene.tiles.map((l) => svg(`${scene.base}/${l.file}`).absolute().left(l.x0 * unit).top(l.y0 * unit)
        .w((l.x1 - l.x0) * unit).h((l.y1 - l.y0) * unit).text_color(t[l.tint]).opacity(l.opacity)));
    // As T3's xs icon button: 24, icon 14, radius 6.
    const button = (id, icon, label, act) => div().id(id).size(24).flex_none().flex().items_center().justify_center().rounded(6)
      .text_color(this.hot === id ? t.foreground : t.dim).hover((s) => s.bg(t.hover))
      .on_hover((on, cx) => { this.hot = on ? id : this.hot === id ? null : this.hot; cx.notify(); })
      .role("button").accessibility_label(label)
      .on_click((_e, cx) => act(cx))
      .child(svg(`mods/${MOD}/icons/${icon}.svg`).size(14));
    const go = (by) => () => setShared(KEY, all[(i + by + all.length) % all.length].id);
    const imported = scene.id.startsWith("file:");
    const switcher = h_flex().id("wallpaper-switcher").absolute().right(12).bottom(12).p(4).gap(4).items_center()
      .rounded(8).bg(t.chrome).text_size(12).text_color(t.dim)
      .opacity(this.over || this.guide ? 1 : 0).transition("opacity", { duration: 150, easing: "ease-out" })
      .child(button("wallpaper-back", "chevron-left", "Previous wallpaper", go(-1)))
      .child(div().min_w(96).max_w(160).overflow_x_hidden().text_ellipsis().whitespace_nowrap().text_center()
        .child(this.importing ? `Importing ${this.importing}…` : scene.name))
      .child(button("wallpaper-next", "chevron-right", "Next wallpaper", go(1)))
      .child(button("wallpaper-add", "plus", "Add a wallpaper", (cx) => { this.guide = !this.guide; cx.notify(); }))
      .when(imported, (el) => el.child(button("wallpaper-remove", "x", `Delete ${scene.name}`, (cx) => cx.spawn(async (cx) => this.remove(scene, all, i, cx)))));
    const corner = div().id("wallpaper-corner").absolute().right(0).bottom(0).w(CORNER.w).h(CORNER.h)
      .on_hover((on, cx) => { this.over = on; if (!on) this.hot = null; cx.notify(); })
      .child(switcher);
    return root.child(picture).child(corner).when(this.guide, (el) => el.child(this.guideCard(t)));
  }

  // How a picture gets in, above the switcher: a popover as T3's (radius 8, 16 in), 4 over the switcher as its menus hang 4
  // from their button; buttons as its sm (28), outlined; a rule, then the Studio for finer control.
  guideCard(t) {
    const platform = window()?.platform;
    const action = (id, label, act) => div().id(id).h(28).px(10).flex().flex_none().items_center().rounded(8).text_size(12)
      .text_color(t.foreground).border_1().border_color(t.border).bg(t.raised).hover((s) => s.bg(t.hover))
      .role("button").accessibility_label(label).on_click((_e, cx) => act(cx)).child(label);
    return v_flex().id("wallpaper-guide").absolute().right(12).bottom(48).w(300).p(16).gap(12)
      .rounded(8).bg(t.popover).border_1().border_color(t.border).shadow_lg().text_size(12).text_color(t.muted)
      .child(h_flex().items_center().justify_between()
        .child(div().text_size(13).font_semibold().text_color(t.foreground).child("Add a wallpaper"))
        // As T3's 20px icon button: radius 4, icon 12.
        .child(div().id("wallpaper-guide-close").size(20).flex().items_center().justify_center().rounded(4).text_color(t.dim)
          .hover((s) => s.bg(t.hover).text_color(t.foreground)).role("button").accessibility_label("Close")
          .on_click((_e, cx) => { this.guide = false; cx.notify(); }).child(svg(`mods/${MOD}/icons/x.svg`).size(12))))
      .child(div().child("Choose a picture: it's drawn in Braille dots, in your theme's colours."))
      .child(h_flex().gap(8)
        .when(platform !== "windows", (el) => el.child(action("wallpaper-choose", this.opening ? "Opening…" : "Choose picture…",
          (cx) => { if (!this.opening) cx.spawn(async (cx) => this.choose(cx)); })))
        .child(action("wallpaper-folder", "Open folder", () => exec(opener(), [this.dir]))))
      .child(div().h(1).bg(t.border))
      .child(div().text_color(t.dim).child("For finer control (contrast, dithering, other characters), make it in asciicn's Studio, save it with the .ans button under the picture, then choose that file."))
      .child(h_flex().child(action("wallpaper-studio", "Open asciicn Studio ↗", () => exec(opener(), [STUDIO]))));
  }
}
