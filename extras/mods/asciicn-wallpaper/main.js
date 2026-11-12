// Home as a still picture in asciicn's dots (https://asciicn.dev, MIT, see LICENSE-asciicn): one of its own, one of the
// person's images previewed in Braille, blocks or dots, or a frame they made in that Studio, in the theme's colours.
// Every picture is tiles of one theme colour at one opacity (ascii-art.js); the theme tints them, so a new theme repaints
// them at once. The built-ins are under scenes/ (scripts/wallpaper.mjs); imports are the `.ans` files in
// <appHome>/asciicn-wallpaper/ (an image becomes one there), each converted once into its .tiles/<name>/, its
// scene.json written last and keyed by the file's cksum and the converter's VERSION, so a changed or half-converted one,
// or one an older converter made, is converted again.
// The pointer near the bottom-right corner shows the switcher: ‹ › step, × asks before deleting, and + opens the add card.
// An image previews across Home; only Apply writes its .ans. Studio exports import as finished drawings.
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
import { appHome, exec, nextCommand, notify, openOverlay, readTextFile, setShared, settings, shared, theme, watchFolder, window, writeTextFile } from "herdr";
import { SCENES } from "./scenes.js";
import { VERSION, imageAns, convert, decodeBmp, imageGrid } from "./ascii-art.js";
import { enter, focusRoot, stop, stopsEnd, stopsInit } from "./focus.js";
import { button as drawButton, radiusOf } from "./button.js";

const MOD = "asciicn-wallpaper", KEY = `${MOD}.scene`;
const BUILT_IN = SCENES.map((s) => ({ ...s, base: `mods/${MOD}/scenes/${s.id}` }));
const zoom = () => Number(settings()?.zoom) || 1;
// Where the pointer shows the switcher: it at its widest, 12 from the corner, and about 60 more each way.
const CORNER = { w: 340, h: 104 };
// Imports being converted, by name: the module is shared by every copy, so two Homes don't convert one file twice.
const converting = new Map();
// Draft pixels, style and generation live only for this run; each Home owns its preview folder.
// Clear abandoned folders once per app run, before any copy can start drawing a new preview.
let previewsReady;
const STYLES = [
  { id: "braille", name: "Braille", detail: "Fine dots" },
  { id: "blocks", name: "Blocks", detail: "Pixel mosaic" },
  { id: "dots", name: "Dots", detail: "Round grains" },
];
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
    stopsInit(this, cx);
    this.height = null;
    this.over = false;
    this.hot = null;
    this.imported = [];
    this.importing = null;
    this.draft = null;
    this.dir = `${appHome()}/${MOD}`;
    cx.spawn(async (cx) => {
      this.ready = previewsReady ??= exec("rm", ["-rf", `${this.dir}/.preview`])
        .then(() => exec("mkdir", ["-p", `${this.dir}/.tiles`, `${this.dir}/.preview`]));
      await this.ready;
      await this.refresh(cx);
      // Our own tile writes land here too: only an .ans file, or a batch that means everything, is news.
      for (;;) if ((await watchFolder(this.dir)).some((p) => p === this.dir || p.endsWith(".ans"))) await this.refresh(cx);
    });
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command === "focus") enter(this, cx, this.draft ? "wallpaper-preview-cancel" : "wallpaper-add");
        if (this.deleting && command === `delete:${this.deleting.token}`) {
          const { scene } = this.deleting;
          this.deleting = null;
          await this.remove(scene, cx);
        }
      }
    });
  }

  close() {
    stopsEnd(this);
    this.closed = true;
    const draft = this.draft;
    this.draft = null;
    if (draft) exec("rm", ["-rf", draft.dir]).catch(() => null);
  }

  async drawTiles(text, out, cx, job = null) {
    if (job?.cancelled) return null;
    const made = await exec("mkdir", ["-p", out]);
    if (made.code !== 0) throw new Error(made.stderr.trim());
    const it = convert(text), tiles = [];
    let step;
    while (!(step = it.next()).done) {
      if (job?.cancelled) return null;
      if (!step.value) { await tick(cx); continue; }
      const { svg: body, ...tile } = step.value;
      await writeTextFile(`${out}/${tile.file}`, body, null);
      tiles.push(tile);
    }
    if (!tiles.length) throw new Error("No visible marks. Try another picture or adjust its contrast in Studio.");
    return { focus: 0.5, ...step.value, tiles };
  }

  // The folder's .ans files: each shown once converted, converted when it isn't yet or changed since; tiles of a removed one go.
  async sourceFiles() {
    const listed = await sh('for f in .ans .*.ans *.ans; do [ -f "$f" ] || continue; sum=$(cksum < "$f") || exit; printf "%s\\0%s\\0" "$sum" "${f%.ans}"; done', this.dir);
    if (listed.code !== 0) throw new Error(listed.stderr.trim());
    const fields = listed.stdout.split("\0"), files = [];
    for (let i = 0; i + 1 < fields.length; i += 2) {
      const name = fields[i + 1], sum = fields[i].trim().split(/\s+/).join("-");
      if (!name || name === "." || name === "..") {
        notify({ title: "Couldn't import the wallpaper", body: `${name}.ans: Rename this file before importing it.`, level: "warning" });
        continue;
      }
      files.push({ sum: `${sum}-${VERSION}`, name });
    }
    return files;
  }

  async refresh(cx, retryName = null) {
    const files = await this.sourceFiles();
    const cleaned = await sh('cd .tiles || exit; for d in .*/ */; do d=${d%/}; case "$d" in .|..) continue;; esac; [ -e "../$d.ans" ] || rm -rf "./$d" || exit; done', this.dir);
    if (cleaned.code !== 0) throw new Error(cleaned.stderr.trim());
    const shown = [], todo = [];
    for (const f of files) {
      let kept = null;
      try { kept = JSON.parse((await readTextFile(`${this.dir}/.tiles/${f.name}/scene.json`)) ?? "null"); } catch { kept = null; }
      if (kept?.sum !== f.sum || (kept.failed && f.name === retryName)) todo.push(f);
      else if (!kept.failed) shown.push({ ...kept, id: `file:${f.name}`, name: f.name, base: `${MOD}/.tiles/${f.name}` });
    }
    this.imported = shown.sort((a, b) => a.name.localeCompare(b.name));
    if (this.picking && shown.some(s => s.name === this.picking)) {
      setShared(KEY, `file:${this.picking}`);
      this.picking = null;
    }
    cx.notify();
    for (const f of todo) await this.convertFile(f, cx);
  }

  async convertFile(f, cx) {
    const busy = converting.get(f.name);
    if (busy) { await busy.promise; await this.refresh(cx); return; }
    const job = { cancelled: false, promise: null };
    converting.set(f.name, job);
    job.promise = this.convertOwned(f, cx, job);
    let stale;
    try { stale = await job.promise; } finally { if (converting.get(f.name) === job) converting.delete(f.name); }
    if (stale && !job.cancelled) await this.refresh(cx);
  }

  async convertOwned(f, cx, job) {
    this.importing = f.name;
    cx.notify();
    const out = `${this.dir}/.tiles/${f.name}`, mark = (scene) => writeTextFile(`${out}/scene.json`, JSON.stringify({ sum: f.sum, ...scene }), null);
    let stale = false;
    const current = async () => {
      if (job.cancelled) return false;
      const sum = await sh(`cksum < ${quote(`./${f.name}.ans`)}`, this.dir);
      return !job.cancelled && sum.code === 0 && `${sum.stdout.trim().split(/\s+/).join("-")}-${VERSION}` === f.sum;
    };
    try {
      const text = await exec("cat", [`${this.dir}/${f.name}.ans`]);
      if (job.cancelled) return;
      await exec("rm", ["-rf", out]);
      if (text.code !== 0) throw new Error(text.stderr.trim());
      const scene = await this.drawTiles(text.stdout, out, cx, job);
      if (!scene || !(await current())) { stale = true; return true; }
      await mark(scene);
      if (!(await current())) { stale = true; return true; }
      this.imported = [...this.imported.filter((s) => s.name !== f.name), { ...scene, sum: f.sum, id: `file:${f.name}`, name: f.name, base: `${MOD}/.tiles/${f.name}` }]
        .sort((a, b) => a.name.localeCompare(b.name));
      if (this.picking === f.name) { this.picking = null; setShared(KEY, `file:${f.name}`); }
    } catch (e) {
      if (job.cancelled) return;
      await mark({ failed: true }).catch(() => null);
      if (!job.cancelled) notify({ title: "Couldn't import the wallpaper", body: `${f.name}.ans: ${e?.message ?? e}`, level: "warning" });
    } finally {
      if (job.cancelled || stale) await exec("rm", ["-rf", out]);
      this.importing = null;
      cx.notify();
    }
  }

  // No activate (a macOS focus timeout) or default location (an extra Downloads permission prompt).
  async choose(cx, ans = false) {
    if (this.opening) return;
    this.opening = true;
    cx.notify();
    const mac = window()?.platform === "macos";
    const title = ans ? "Import a Studio .ans file" : "Choose an image for your wallpaper";
    const picked = await (mac
      ? exec("osascript", ["-e", `POSIX path of (choose file with prompt "${title}" of type {"${ans ? "ans" : "public.image"}"})`], { timeout: 600000 })
      : exec("zenity", ["--file-selection", `--title=${title}`,
        ans ? "--file-filter=Studio files | *.ans" : "--file-filter=Images | *.png *.jpg *.jpeg *.webp *.gif *.bmp *.tif *.tiff *.heic"], { timeout: 600000 })).catch(() => null);
    this.opening = false;
    cx.notify();
    if (this.closed) return;
    if (!picked) {
      notify({ title: "No file dialog here", body: `Copy .ans files into ${this.dir}: Open folder shows it.`, level: "info" });
      return;
    }
    const from = picked.stdout.replace(/\r?\n$/, "");
    // Cancelled: osascript's -128, zenity's 1, nothing said.
    if (picked.code !== 0 || !from) return;
    const file = from.split("/").pop();
    let base = file.replace(/\.[^.]*$/, "").replace(/[\x00-\x1f\x7f/\\]/g, "-");
    if (!base || base === "." || base === "..") base = "wallpaper";
    this.guide = false;
    if (!ans) return this.startPreview(from, base, cx);
    try {
      if (!file.toLowerCase().endsWith(".ans")) throw new Error("Choose a .ans file exported from Studio.");
      const text = await exec("cat", [from]);
      if (text.code !== 0) throw new Error(text.stderr.trim());
      const name = await this.availableName(base);
      this.picking = name;
      await this.saveFile(name, text.stdout);
      await this.refresh(cx);
    } catch (e) { this.failed(base, `${e?.message ?? e}`, cx); }
  }

  async availableName(base) {
    const names = new Set((await this.sourceFiles()).map(f => f.name));
    let name = base;
    for (let n = 2; names.has(name); n++) name = `${base} ${n}`;
    return name;
  }

  async saveFile(name, text) {
    await this.ready;
    const out = `${this.dir}/.preview/save-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const made = await exec("mkdir", ["-p", out]);
      if (made.code !== 0) throw new Error(made.stderr.trim());
      const parts = text.match(/[\s\S]{1,65536}/gu) ?? [""], paths = [];
      // The native writer caps each call at 1 MiB; whole Unicode characters keep each part at most 256 KiB.
      for (const [i, part] of parts.entries()) {
        const path = `${out}/${i}.part`;
        await writeTextFile(path, part, null);
        paths.push(path);
      }
      const joined = await sh(`cat ${paths.map(quote).join(" ")} > ${quote(`${out}/drawing`)}`, this.dir);
      if (joined.code !== 0) throw new Error(joined.stderr.trim());
      // Unlike ln, link never treats an existing destination directory as a place to put the file.
      const saved = await exec("link", [`${out}/drawing`, `${this.dir}/${name}.ans`]);
      if (saved.code !== 0) throw new Error(saved.stderr.trim());
    } finally {
      await exec("rm", ["-rf", out]);
    }
  }

  async startPreview(from, name, cx) {
    await this.cancelPreview(cx);
    await this.ready;
    if (this.closed) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const draft = this.draft = { id, name, dir: `${this.dir}/.preview/${id}`, style: "braille", version: 0, busy: true, scene: null, text: null, pixels: null, error: null, applying: false };
    if (/** @type {any} */ (this).fs.keyboard) enter(this, cx, "wallpaper-preview-cancel");
    cx.notify();
    const bmp = `${draft.dir}/image.bmp`, mac = window()?.platform === "macos";
    try {
      const madeDir = await exec("mkdir", ["-p", draft.dir]);
      if (madeDir.code !== 0) throw new Error(madeDir.stderr.trim());
      const size = await (mac ? exec("sips", ["-g", "pixelWidth", "-g", "pixelHeight", from]) : exec("identify", ["-format", "%w %h", `${from}[0]`]));
      const [w, h] = mac ? ["Width", "Height"].map((d) => Number(size.stdout.match(new RegExp(`pixel${d}: (\\d+)`))?.[1])) : size.stdout.trim().split(" ").map(Number);
      if (!(w > 0 && h > 0)) throw new Error("it isn't a picture this computer can read");
      const grid = imageGrid(w, h);
      const made = await (mac ? exec("sips", ["-s", "format", "bmp", "-z", String(grid.height), String(grid.width), from, "--out", bmp])
        : exec("convert", [`${from}[0]`, "-resize", `${grid.width}x${grid.height}!`, `bmp3:${bmp}`]));
      if (made.code !== 0) throw new Error(made.stderr.trim() || "it couldn't be resized");
      const read = await sh(`base64 < ${quote(bmp)} | tr -d '\\n'; rm -f ${quote(bmp)}`, this.dir);
      if (read.code !== 0) throw new Error(read.stderr.trim());
      const pixels = await finish(decodeBmp(read.stdout), cx);
      if (this.draft !== draft) return;
      draft.pixels = pixels;
      await this.previewStyle("braille", cx);
    } catch (e) {
      if (this.draft !== draft) return;
      const missing = !mac && /ENOENT|not found|spawn/i.test(String(e?.message ?? e));
      draft.error = missing ? "Install ImageMagick to import pictures, or import a .ans file from Studio." : `${e?.message ?? e}`;
      draft.busy = false;
    } finally {
      if (this.draft !== draft) await exec("rm", ["-rf", draft.dir]);
      if (!this.closed) cx.notify();
    }
  }

  async previewStyle(style, cx) {
    const draft = this.draft;
    if (!draft?.pixels || draft.applying || !STYLES.some(s => s.id === style)) return;
    const version = ++draft.version, out = `${draft.dir}/${version}`;
    const current = () => this.draft === draft && draft.version === version;
    draft.style = style; draft.busy = true; draft.error = null;
    cx.notify();
    try {
      const text = await finish(imageAns(draft.pixels, style), cx);
      if (!current()) return;
      const scene = await this.drawTiles(text, out, cx);
      if (!current()) return;
      const previous = draft.scene?.out;
      draft.text = text;
      draft.scene = { ...scene, id: `preview:${draft.id}:${version}`, name: draft.name, base: `${MOD}/.preview/${draft.id}/${version}`, out };
      if (previous) await exec("rm", ["-rf", previous]);
    } catch (e) {
      if (current()) draft.error = `${e?.message ?? e}`;
    } finally {
      if (!current()) await exec("rm", ["-rf", this.draft === draft ? out : draft.dir]);
      else draft.busy = false;
      if (!this.closed) cx.notify();
    }
  }

  async cancelPreview(cx) {
    const draft = this.draft;
    this.draft = null;
    if (draft) await exec("rm", ["-rf", draft.dir]);
    if (!this.closed && /** @type {any} */ (this).fs.keyboard) enter(this, cx, "wallpaper-add");
    if (!this.closed) cx.notify();
  }

  async applyPreview(cx) {
    const draft = this.draft;
    if (!draft?.scene || draft.busy || draft.error || draft.applying) return;
    draft.applying = true;
    cx.notify();
    try {
      let name = draft.savedName;
      if (name) {
        const saved = await exec("cat", [`${this.dir}/${name}.ans`]);
        if (saved.code !== 0 || saved.stdout !== draft.text) name = null;
      }
      if (!name) {
        name = await this.availableName(draft.name);
        await this.saveFile(name, draft.text);
        draft.savedName = name;
      }
      this.picking = name;
      await this.refresh(cx, name);
      if (!this.imported.some(s => s.name === name) || shared(KEY) !== `file:${name}`) throw new Error("The drawing couldn't be prepared. Try Apply again.");
      await this.cancelPreview(cx);
    } catch (e) {
      draft.applying = false;
      this.failed(draft.name, `${e?.message ?? e}`, cx);
    }
  }

  failed(name, why, cx) {
    this.picking = null;
    notify({ title: "Couldn't import the wallpaper", body: `${name}: ${why}`, level: "warning" });
    cx.notify();
  }

  askRemove(scene) {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.deleting = { scene, token };
    openOverlay({ mod: "t3-actions", kind: "dialog", frame: "none", width: 512, props: {
      actions: "confirm", title: `Delete ${scene.name}?`,
      detail: "This permanently deletes the imported wallpaper and its cached drawing. Your original image is kept.",
      yes: "Delete", command: { name: `${MOD}.delete:${token}` },
    } });
  }

  // Update the selection only after the confirmed deletion succeeds.
  async remove(scene, cx) {
    if (!this.imported.some(s => s.id === scene.id)) return;
    const all = [...BUILT_IN, ...this.imported], i = all.findIndex(s => s.id === scene.id);
    const removed = await sh(`rm -f ${quote(`./${scene.name}.ans`)}`, this.dir);
    if (removed.code !== 0) {
      notify({ title: "Couldn't delete the wallpaper", body: `${scene.name}: ${removed.stderr.trim()}`, level: "warning" });
      return;
    }
    const job = converting.get(scene.name);
    if (job) job.cancelled = true;
    if (shared(KEY) === scene.id) setShared(KEY, all[(i - 1 + all.length) % all.length].id);
    this.imported = this.imported.filter((s) => s.id !== scene.id);
    this.hot = null;
    cx.notify();
    const cleaned = await exec("rm", ["-rf", `${this.dir}/.tiles/${scene.name}`]);
    if (cleaned.code !== 0) notify({ title: "Wallpaper deleted", body: `Its cached drawing couldn't be removed: ${cleaned.stderr.trim()}`, level: "warning" });
  }

  render() {
    const t = theme(), all = [...BUILT_IN, ...this.imported];
    const i = Math.max(0, all.findIndex((s) => s.id === shared(KEY))), scene = this.draft?.scene ?? all[i];
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
    const button = (id, icon, label, act) => stop(this, t, id, drawButton(t, id, { icon: `mods/${MOD}/icons/${icon}.svg`, label, hot: this.hot === id, act })
      .on_hover((on, cx) => { this.hot = on ? id : this.hot === id ? null : this.hot; cx.notify(); }), radiusOf("xs"));
    const go = (by) => () => setShared(KEY, all[(i + by + all.length) % all.length].id);
    const imported = scene.id.startsWith("file:");
    const switcher = h_flex().id("wallpaper-switcher").absolute().right(12).bottom(12).p(4).gap(4).items_center()
      .rounded(8).bg(t.chrome).text_size(12).text_color(t.dim)
      .opacity(this.over || this.guide || /** @type {any} */ (this).fs.keyboard ? 1 : 0).transition("opacity", { duration: 150, easing: "ease-out" })
      .child(button("wallpaper-back", "chevron-left", "Previous wallpaper", go(-1)))
      .child(div().min_w(96).max_w(160).overflow_x_hidden().text_ellipsis().whitespace_nowrap().text_center()
        .child(this.importing ? `Importing ${this.importing}…` : scene.name))
      .child(button("wallpaper-next", "chevron-right", "Next wallpaper", go(1)))
      .child(button("wallpaper-add", "plus", "Add a wallpaper", (cx) => { this.guide = !this.guide; cx.notify(); }))
      .when(imported, (el) => el.child(button("wallpaper-remove", "x", `Delete ${scene.name}`, () => this.askRemove(scene))));
    const corner = div().id("wallpaper-corner").absolute().right(0).bottom(0).w(CORNER.w).h(CORNER.h)
      .on_hover((on, cx) => { this.over = on; if (!on) this.hot = null; cx.notify(); })
      .child(switcher);
    return focusRoot(this, root.child(picture)
      .when(!this.draft, el => el.child(corner))
      .when(Boolean(this.draft), el => el.child(this.previewCard(t)))
      .when(this.guide && !this.draft, (el) => el.child(this.guideCard(t))));
  }

  // A card's full-width rows: T3's compact button, 28 with 12px words, to fit its 300 width.
  action(t, id, label, act, disabled = false, primary = false) {
    return stop(this, t, id, drawButton(t, id, { variant: primary ? "primary" : "outline", size: "compact", text: label, act, disabled }), radiusOf("compact"));
  }

  // T3's popover, 16px inset; three small visual choices fit its 300px width without a separate settings page.
  previewCard(t) {
    const d = this.draft;
    return v_flex().id("wallpaper-preview").absolute().right(12).bottom(12).w(300).p(16).gap(12)
      .rounded(8).bg(t.popover).border_1().border_color(t.border).shadow_lg().text_size(12).text_color(t.muted)
      .child(div().text_size(13).font_semibold().text_color(t.foreground).child("Preview wallpaper"))
      .child(div().truncate().child(d.name))
      .child(h_flex().gap(8).children(STYLES.map(s => stop(this, t, `wallpaper-style-${s.id}`,
        v_flex().id(`wallpaper-style-${s.id}`).flex_1().min_w(0).p(8).gap(4).items_center().rounded(6)
          .border_1().border_color(d.style === s.id ? t.accent : t.border).bg(d.style === s.id ? t.selected : t.raised)
          .text_color(t.foreground).hover(el => el.bg(t.hover))
          .role("button").accessibility_label(`${s.name}: ${s.detail}${d.style === s.id ? ", selected" : ""}`)
          .on_click((_e, cx) => { if (!d.applying) cx.spawn(cx => this.previewStyle(s.id, cx)); })
          .child(svg(`mods/${MOD}/icons/style-${s.id}.svg`).w(32).h(20))
          .child(s.name).child(div().text_size(10).text_color(t.dim).child(s.detail))))))
      .child(div().text_color(d.error ? t.ansi1 : t.dim)
        .child(d.error ?? (d.busy ? "Drawing preview…" : "Colours follow your theme. Try a style, then Apply.")))
      .child(h_flex().gap(8).justify_end()
        .child(this.action(t, "wallpaper-preview-cancel", "Cancel", cx => cx.spawn(cx => this.cancelPreview(cx)), d.applying))
        .child(this.action(t, "wallpaper-preview-apply", d.applying ? "Applying…" : "Apply", cx => cx.spawn(cx => this.applyPreview(cx)), d.busy || !!d.error || !d.scene || d.applying, true)));
  }

  guideCard(t) {
    const platform = window()?.platform;
    const choose = ans => cx => cx.spawn(cx => this.choose(cx, ans));
    return v_flex().id("wallpaper-guide").absolute().right(12).bottom(48).w(300).p(16).gap(12)
      .rounded(8).bg(t.popover).border_1().border_color(t.border).shadow_lg().text_size(12).text_color(t.muted)
      .child(h_flex().items_center().justify_between()
        .child(div().text_size(13).font_semibold().text_color(t.foreground).child("Add a wallpaper"))
        .child(stop(this, t, "wallpaper-guide-close", drawButton(t, "wallpaper-guide-close", { icon: `mods/${MOD}/icons/x.svg`, label: "Close", size: "micro", surface: "card",
          hot: this.hot === "wallpaper-guide-close", act: (cx) => { this.guide = false; this.studioGuide = false; cx.notify(); } })
          .on_hover((on, cx) => { this.hot = on ? "wallpaper-guide-close" : this.hot === "wallpaper-guide-close" ? null : this.hot; cx.notify(); }), radiusOf("micro"))))
      .child(div().child("Turn your image into character art, in your theme's colours."))
      .when(platform !== "windows", el => el
        .child(this.action(t, "wallpaper-choose", this.opening ? "Opening…" : "Choose image…", choose(false), this.opening, true))
        .child(this.action(t, "wallpaper-import", "Import Studio file (.ans)…", choose(true), this.opening)))
      .child(this.action(t, "wallpaper-studio-guide", this.studioGuide ? "Hide Studio guide" : "Create in asciicn Studio…", cx => { this.studioGuide = !this.studioGuide; cx.notify(); }))
      .when(this.studioGuide, el => el.child(v_flex().gap(8)
        .child(div().child("1. Open Studio, upload an image and adjust its look."))
        .child(this.action(t, "wallpaper-studio", "Open asciicn Studio ↗", () => exec(opener(), [STUDIO])))
        .child(div().child("2. Save with the .ans button under the picture."))
        .child(div().child("3. Return here and import that .ans file."))
        .child(div().text_color(t.dim).child("Colours adapt to your theme. Letter shapes become short bars; dots and blocks keep their shapes."))))
      .child(div().h(1).bg(t.border))
      .when(platform === "windows", el => el.child(div().child("Copy .ans files into the wallpaper folder to import them.")))
      .child(this.action(t, "wallpaper-folder", "Open folder", () => exec(opener(), [this.dir])));
  }
}
