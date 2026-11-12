// The space panel's Files page (docs/adr/0011, docs/research/space-panel-plan.md): the active space's folder, read-only, as
// one block: the file picked on the left, the tree on the right by the window's edge, the split between them dragged.
// One copy serves every space, here or on another machine: what each one shows is kept by its id.
import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, h_resizable, resizable_panel, v_virtual_list, VirtualListScrollHandle, InputState, Input, Editor, EditorState, TextView } from "gpui-base";
import { spaces, agents, nextCommand, exec, readTextFile, watchFolder, theme, settings, shared, setShared, run, notify, appHome, window } from "herdr";
import * as fs from "fs/promises";
import uFuzzy from "./vendor/ufuzzy.js";
import { panelState, showPage } from "./panel.js";
import { step, scrollList } from "./list.js";
import { fileIcon, folderIcon } from "./file-icons.js";
import { FILE_STATUS, LIST, IGNORED, PROBE, REMOTE_SEARCH, RANKED, join, parentOf, nameOf, ancestors, parseListing, parseStatus, parseIgnored, markIgnored, treeRows, terms, narrows,
  filterPaths, rank, kindOf, languageOf, readProblem, ticket } from "./model.js";

const MOD = "mods/t3-files";
const MONO = "JetBrains Mono"; // Review's, for paths
const ROW = 28, RESULTS = 200, REMOTE_IMAGE = 512 * 1024, TEXT_MAX = 1024 * 1024;
const TREE = 280, TREE_MIN = 200;
// Here, the folder watch tells; a missed event waits for this. Another machine has no watch: it's asked this often while shown.
const LOCAL_EVERY = 60000, REMOTE_EVERY = 10000;
const CACHE = "cache/t3-files"; // under the app's home, where image() can read
const MARKDOWN = "t3-files.markdown"; // "code" once someone picked it; Preview otherwise

const GIT = ["--no-optional-locks", "-c", "core.fsmonitor=false"]; // reads that write nothing under .git, so the watch stays quiet

const count = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const zoom = () => Number(settings()?.zoom) || 1;

// What one space's page knows and shows.
function blank(sp) {
  return { id: sp.id, root: sp.folder, on: sp.machine ?? null, git: undefined, real: null, entries: new Map(), expanded: new Set(), ignored: new Set(),
    marks: new Map(), dirs: new Set(), version: 0, file: null, view: null, lit: null, query: "", at: -1, results: null, total: 0, paths: null };
}

export default class Files extends View {
  init(_props, cx) {
    this.states = new Map();
    this.uf = new (/** @type {any} */ (uFuzzy))();
    this.treeScroll = VirtualListScrollHandle.new();
    this.search = InputState.new({ placeholder: "Search files" });
    this.search.on("change", (_e, cx) => { const st = this.current(); if (st && this.search.value() !== st.query) this.find(st, this.search.value(), cx); });
    this.search.on("submit", (_e, cx) => { const st = this.current(); const r = st?.results?.[st.at]; if (r) this.pick(st, r.path, cx); });
    this.handle = cx.focus_handle();
    this.cached = new Set();
    cx.spawn(async () => { await exec("rm", ["-rf", `${appHome()}/${CACHE}`]).catch(() => null); });
    cx.timer.every(REMOTE_EVERY, (cx) => this.poll(cx));
    // `t3-files.open:<path from the space's folder>` and `t3-files.search:<words>`, for keys and scripts (the demo's).
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand(), st = this.current(), at = c.indexOf(":"), [what, arg] = [c.slice(0, at), c.slice(at + 1)];
        if (!st || at < 0) continue;
        if (what === "open") { this.open(st, arg, cx); this.reveal(st, arg, cx); }
        else if (what === "search") { this.search.set_value(arg); this.find(st, arg, cx); }
      }
    });
  }

  // Its images go with it; one a crash left is cleared at the next start.
  async close() {
    await Promise.all([...this.cached].map((f) => fs.unlink(`${appHome()}/${f}`).catch(() => null)));
  }

  current() {
    const sp = spaces().find((s) => s.active);
    return sp ? this.states.get(sp.id) : null;
  }

  // The active space's state, made the first time and made again when its folder moves.
  stateFor(sp, cx) {
    let st = this.states.get(sp.id);
    if (!st || st.root !== sp.folder || st.on !== (sp.machine ?? null)) {
      this.states.set(sp.id, st = blank(sp));
      if (st.root) this.load(st, cx);
    }
    return st;
  }

  live(st) { return this.states.get(st.id) === st; }
  changed(st) { st.version++; st.rows = null; }

  load(st, cx) {
    cx.spawn(async (cx) => {
      const top = await exec("git", ["rev-parse", "--show-toplevel", "--show-prefix"], { cwd: st.root, on: st.on }).catch(() => null);
      const [dir, prefix] = top?.code === 0 ? top.stdout.split("\n") : [];
      st.git = dir ? { top: dir, prefix: prefix ?? "" } : null;
      const real = await exec("pwd", ["-P"], { cwd: st.root, on: st.on }).catch(() => null);
      st.real = real?.code === 0 ? real.stdout.trim() : st.root;
      await this.refresh(st, cx);
      if (!st.on) this.watch(st, cx);
    });
  }

  // Git's marks, and every folder shown listed again.
  async refresh(st, cx) {
    if (!this.live(st) || st.git === undefined) return;
    st.refreshed = Date.now();
    const shown = ["", ...st.expanded].filter((p) => p === "" || ancestors(p).every((a) => st.expanded.has(a)));
    await Promise.all([this.status(st), ...shown.map((p) => this.list(st, p))]);
    cx.notify();
  }

  async status(st) {
    if (!st.git) return;
    const fresh = ticket(st, "status");
    const r = await exec("git", [...GIT, "status", "--porcelain=v2", "-z", "--untracked-files=all"], { cwd: st.git.top, on: st.on }).catch(() => null);
    if (r?.code !== 0 || !fresh()) return;
    Object.assign(st, parseStatus(r.stdout, st.git.prefix));
    this.changed(st);
  }

  async list(st, rel) {
    const fresh = ticket(st, `list:${rel}`), dir = join(st.root, rel);
    const inIgnored = [rel, ...ancestors(rel)].some((p) => p && st.ignored.has(p));
    const [r, ig] = await Promise.all([
      exec("sh", ["-c", LIST, "files", dir], { on: st.on }).catch((e) => ({ code: 1, stdout: "", stderr: String(e) })),
      st.git && !inIgnored ? exec("sh", ["-c", IGNORED, "files", dir, rel ? `${rel}/` : ""], { cwd: st.root, on: st.on }).catch(() => null) : null,
    ]);
    if (!fresh()) return;
    if (r.code !== 0) {
      if (rel) { st.entries.delete(rel); st.expanded.delete(rel); } else st.error = "This folder can't be listed.";
    } else {
      const entries = parseListing(r.stdout);
      st.entries.set(rel, entries);
      if (!rel) st.error = null;
      if (ig) {
        markIgnored(st.ignored, rel, entries, parseIgnored(ig.stdout));
      }
    }
    this.changed(st);
  }

  // Here, Herdr's watch: a burst is taken as one, Git asked again, and only the folders shown that hold a change listed again.
  watch(st, cx) {
    cx.spawn(async (cx) => {
      try {
        while (this.live(st)) {
          const paths = await watchFolder(st.root);
          if (!this.live(st)) return;
          await cx.sleep(300);
          const rel = (p) => [st.real, st.root].map((r) => p === r ? "" : p.startsWith(`${r}/`) ? p.slice(r.length + 1) : null).find((x) => x !== null) ?? null;
          const all = paths.map(rel);
          const work = all.filter((p) => p !== null && p !== ".git" && !p.startsWith(".git/"));
          if (all.includes("")) await this.refresh(st, cx);
          else {
            const folders = new Set(work.map(parentOf).filter((p) => st.entries.has(p) && (p === "" || st.expanded.has(p))));
            await Promise.all([this.status(st), ...[...folders].map((p) => this.list(st, p))]);
          }
          if (work.length || all.includes("")) {
            st.paths = null;
            if (st.query) this.find(st, st.query, cx);
            if (st.file && (all.includes("") || work.includes(st.file))) this.open(st, st.file, cx, true);
          }
          cx.notify();
        }
      } catch { /* a watch Herdr refused: the timer still refreshes */ }
    });
  }

  // While the page shows: another machine's space every 10 s, the window in front; here, a minute after the last refresh.
  poll(cx) {
    const st = this.current(), p = panelState();
    if (!st || st.git === undefined || !p.open || p.page !== "files") return;
    if (st.on ? !window()?.active : Date.now() - (st.refreshed ?? 0) < LOCAL_EVERY) return;
    if (!st.on) return void cx.spawn(async (cx) => this.refresh(st, cx));
    this.recheck(st, cx);
  }

  // Git, the folders shown and the file asked again. Another machine's image comes over whole each time: one changed there
  // shows when it's picked again.
  recheck(st, cx) {
    cx.spawn(async (cx) => {
      await this.refresh(st, cx);
      if (st.file && !(st.on && kindOf(st.file) === "image")) this.open(st, st.file, cx, true);
    });
  }

  toggle(st, path, cx) {
    if (st.expanded.has(path)) st.expanded.delete(path);
    else {
      st.expanded.add(path);
      cx.spawn(async (cx) => { await this.list(st, path); cx.notify(); });
    }
    st.lit = null;
    this.changed(st);
    cx.notify();
  }

  // Opens the folders down to `path` (a file's, or a folder lit until the next click) and brings its row into view.
  reveal(st, path, cx) {
    for (const p of ancestors(path)) st.expanded.add(p);
    st.lit = path && path !== st.file ? path : null;
    this.changed(st);
    cx.spawn(async (cx) => {
      for (const p of ancestors(path)) if (!st.entries.has(p)) await this.list(st, p);
      const i = path ? this.rows(st).findIndex((r) => r.path === path) : 0;
      if (i >= 0 && this.live(st)) this.treeScroll.scroll_to_item(i, path ? "center" : "top");
      cx.notify();
    });
    cx.notify();
  }

  // A search result: the file opens, and the tree shows where it is.
  pick(st, path, cx) {
    st.query = ""; st.results = null; st.at = -1;
    this.search.set_value("");
    this.open(st, path, cx);
    this.reveal(st, path, cx);
  }

  // Shows a file; `again` reads it again where it may have changed, and leaves it as it was if it hasn't.
  open(st, rel, cx, again = false) {
    if (!again) {
      if (st.view?.code) st.view.code.release();
      st.file = rel; st.lit = null; st.view = { loading: true };
      this.changed(st);
      cx.notify();
    }
    const fresh = ticket(st, "file"), abs = join(st.root, rel), kind = kindOf(rel);
    cx.spawn(async (cx) => {
      const view = await this.read(st, abs, rel, kind, fresh).catch(() => ({ problem: "This file can't be read." }));
      if (!view || !fresh() || st.file !== rel) return;
      const old = st.view;
      if (again && old && view.text !== undefined && view.text === old.text) return;
      if (old?.image && old.image !== view.image) this.uncache(old.image);
      if (view.text !== undefined && (kind === "text" || shared(MARKDOWN) === "code")) view.code = this.editor(rel, view.text);
      if (old?.code) old.code.release();
      st.view = view;
      cx.notify();
    });
  }

  /** @returns {Promise<any>} */
  async read(st, abs, rel, kind, fresh) {
    if (st.marks.get(rel) === "D" && !(st.entries.get(parentOf(rel)) ?? []).some((e) => e.name === nameOf(rel)))
      return { problem: "This file was deleted." };
    let size = null;
    if (st.on) {
      const p = await exec("sh", ["-c", PROBE, "probe", abs], { on: st.on });
      if (p.code !== 0) return { problem: "This file can't be read." };
      const [bytes, nuls] = p.stdout.trim().split(" ").map(Number);
      size = bytes;
      if (kind !== "image" && bytes > TEXT_MAX) return { problem: "This file is larger than 1 MB, too large to preview." };
      if (kind !== "image" && nuls > 0) return { problem: "This is a binary file, so there's no text to show." };
    }
    if (kind === "image") {
      if (st.on && size > REMOTE_IMAGE) return { problem: `This image is larger than 512 KB, too large to bring over from ${st.on}.` };
      const name = `${CACHE}/${Date.now()}-${nameOf(rel).replace(/[^\w.-]/g, "_")}`, dest = `${appHome()}/${name}`;
      await fs.mkdir(`${appHome()}/${CACHE}`, { recursive: true }).catch(() => null);
      if (st.on) {
        const r = await exec("base64", [abs], { on: st.on, timeout: 60000 });
        if (r.code !== 0) return { problem: "This image can't be read." };
        const bin = /** @type {any} */ (globalThis).atob(r.stdout.replace(/\s+/g, "")), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        await fs.writeFile(dest, bytes);
      } else {
        const r = await exec("cp", [abs, dest]);
        if (r.code !== 0) return { problem: "This image can't be read." };
      }
      if (!fresh()) { await fs.unlink(dest).catch(() => null); return null; }
      this.cached.add(name);
      return { image: name };
    }
    let text;
    try { text = await readTextFile(abs, { on: st.on }); }
    catch (e) { return { problem: readProblem(e) }; }
    if (text === null) return { problem: "This file isn't there anymore." };
    if (st.on && text.includes("\uFFFD")) return { problem: "This file isn't UTF-8 text, so there's nothing to show." };
    return { text };
  }

  uncache(name) {
    this.cached.delete(name);
    fs.unlink(`${appHome()}/${name}`).catch(() => null);
  }

  editor(rel, text) {
    const t = theme();
    return EditorState.new({ language: languageOf(nameOf(rel)), value: text, readonly: true, font_family: /** @type {string} */ (settings().font_family), font_size: 12,
      syntax: { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 } });
  }

  // Every term in the path, case aside. Here, over the folder's whole list, kept until something changes; elsewhere, there.
  find(st, query, cx) {
    st.query = query; st.at = 0;
    const words = terms(query), fresh = ticket(st, "search");
    if (!words.length) { st.results = null; cx.notify(); return; }
    cx.spawn(async (cx) => {
      let found, total;
      if (st.on) {
        await cx.sleep(200);
        if (!fresh()) return;
        const r = await exec("sh", ["-c", REMOTE_SEARCH, "search", query], { cwd: st.root, on: st.on }).catch(() => null);
        if (!fresh()) return;
        found = (r?.stdout ?? "").split("\n").filter(Boolean);
        total = found.length;
        st.more = total >= RANKED;
      } else {
        if (!st.paths) {
          const r = st.git
            ? await exec("git", [...GIT, "ls-files", "-co", "--exclude-standard", "-z"], { cwd: st.root }).catch(() => null)
            : await exec("sh", ["-c", "find . -name .git -prune -o -type f -print | sed 's|^\\./||' | head -n 200000"], { cwd: st.root }).catch(() => null);
          if (!fresh()) return;
          st.paths = (r?.stdout ?? "").split(st.git ? "\0" : "\n").filter(Boolean);
          st.lower = st.paths.map((p) => p.toLowerCase());
          st.last = null;
        }
        const from = narrows(query, st.last?.query) ? st.last.idx : null;
        const idx = await filterPaths(st.lower, words, from, () => cx.sleep(0), fresh);
        if (!idx) return;
        st.last = { query, idx };
        total = idx.length;
        found = idx.slice(0, total <= RANKED ? RANKED : RESULTS).map((i) => st.paths[i]);
        st.more = false;
      }
      st.results = found.length <= RANKED ? rank(this.uf, found, query, RESULTS) : found.slice(0, RESULTS).map((path) => ({ path, ranges: [] }));
      st.total = total;
      st.at = Math.min(Math.max(st.at, 0), st.results.length - 1);
      cx.notify();
    });
    cx.notify();
  }

  // The agent a mention goes to: the space's focused one, else one in its tab in view, else its first.
  agentFor(st) {
    const sp = spaces().find((s) => s.id === st.id), mine = agents().filter((a) => a.space === st.id), tab = sp?.tabs.find((c) => c.active)?.id;
    return mine.find((a) => a.focused) ?? mine.find((a) => a.tab === tab) ?? mine[0] ?? null;
  }

  menuItems(st, path) {
    const abs = join(st.root, path), agent = this.agentFor(st), mac = window()?.platform === "macos", dir = this.rows(st).find((r) => r.path === path)?.dir;
    return [
      { label: "Copy path", icon: "copy", hint: st.on ?? "", run: (cx) => cx.write_to_clipboard(abs) },
      { label: "Copy relative path", icon: "copy", run: (cx) => cx.write_to_clipboard(path) },
      ...(agent ? [{ label: "Mention in agent", icon: "at-sign", hint: agent.program?.name ?? "", run: (cx) => this.mention(path, agent.address, cx) }] : []),
      ...(!st.on && mac ? [{ label: "Reveal in Finder", icon: "folder-open", run: () => exec("open", ["-R", abs]) }] : []),
      ...(!st.on && !dir && (mac || window()?.platform === "linux") ? [{ label: "Open in default app", icon: "external-link", run: () => exec(mac ? "open" : "xdg-open", [abs]) }] : []),
    ];
  }

  // Into the agent's input as a paste, never sent: the clipboard carries it and gets its text back. Paste reads the clipboard a
  // moment later, so it's put back after 150 ms. A clipboard holding no text (an image) isn't touched.
  mention(path, address, cx) {
    const previous = cx.read_from_clipboard();
    if (previous === undefined) {
      notify({ title: "The clipboard holds something that isn't text", body: "Mention in agent would replace it. Copy relative path, then paste it yourself.", level: "warning" });
      return;
    }
    cx.write_to_clipboard(`@${path} `);
    run("pane.focus", { terminal: address });
    run("terminal.paste");
    cx.spawn(async (cx) => { await cx.sleep(150); cx.write_to_clipboard(previous); });
  }

  rows(st) { return st.rows ??= treeRows(st); }

  render(cx) {
    const t = theme(), sp = spaces().find((s) => s.active);
    if (!sp) return div().id("t3-files").size_full();
    const st = this.stateFor(sp, cx);
    // The search field shows this space's words.
    if (this.searchFor !== st.id) { this.searchFor = st.id; if (this.search.value() !== st.query) this.search.set_value(st.query); }
    // Shown again (the page, or the window in front): what changed meanwhile, now.
    const p = panelState(), shown = p.open && p.page === "files" && Boolean(window()?.active);
    if (shown && !this.shown && st.git !== undefined) this.recheck(st, cx);
    this.shown = shown;
    const width = this.size?.width ?? 800;
    return div().id("t3-files").relative().size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(13)
      .on_size_change((size, cx) => { this.size = { width: size.width / zoom(), height: size.height / zoom() }; cx.notify(); })
      .on_mouse_down("right", (e, cx) => {
        if (!this.menuFor) return;
        this.menu = { path: this.menuFor, x: e.local_position.x / zoom(), y: e.local_position.y / zoom(), at: -1 };
        this.menuFor = null;
        this.handle.focus();
        cx.notify();
      })
      .child(h_resizable("t3-files-split").size_full()
        .child(resizable_panel().child(this.content(st, t)))
        .child(resizable_panel().size(TREE).size_range(TREE_MIN, Math.max(TREE_MIN, Math.round(width * 0.6))).child(this.side(st, t))))
      .when(Boolean(this.menu), (el) => el.child(this.menuView(st, t)));
  }

  // The file: where it is, Preview or Code for Markdown, Review for a change, then it; with none, a quiet line.
  content(st, t) {
    const v = st.view, md = kindOf(st.file ?? "") === "markdown", code = shared(MARKDOWN) === "code";
    if (!st.file) return v_flex().id("t3-files-empty").size_full().items_center().justify_center().gap(8).text_color(t.dim)
      .child(svg(`${MOD}/icons/file-text.svg`).size(24).text_color(t.dim))
      .child(div().text_size(13).child("No file open"))
      .child(div().text_size(12).child(st.root ? "Pick one in the tree, or search for it." : "This space has no folder."));
    const review = !st.on && st.git && st.marks.has(st.file) && panelState().pages.includes("review");
    const parts = st.file.split("/");
    const crumb = (label, path, last) => div().id(`crumb-${path}`).flex_none().px(4).rounded(4).text_color(last ? t.foreground : t.muted)
      .when(!last, (el) => el.cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground)).on_click((_e, cx) => this.reveal(st, path, cx)))
      .child(label);
    const tab = (label, on, value) => div().id(`t3-files-${value}`).h(24).px(8).flex().items_center().rounded(6).text_size(12)
      .text_color(on ? t.foreground : t.muted).when(on, (el) => el.bg(t.selected)).when(!on, (el) => el.cursor_pointer().hover((s) => s.text_color(t.foreground)))
      .on_click((_e, cx) => { if (on) return; if (value === "code" && st.view?.text !== undefined && !st.view.code) st.view.code = this.editor(st.file, st.view.text); setShared(MARKDOWN, value); cx.notify(); })
      .child(label);
    return v_flex().size_full().min_w(0)
      .child(h_flex().h(40).flex_none().pl(8).pr(8).gap(8).items_center().border_b(1).border_color(t.border)
        .child(h_flex().flex_1().min_w(0).overflow_hidden().items_center().text_size(12).font_family(MONO)
          .child(crumb(nameOf(st.root.replace(/\/$/, "")) || st.root, "", false))
          .children(parts.flatMap((part, i) => [div().flex_none().text_color(t.dim).child("/"), crumb(part, parts.slice(0, i + 1).join("/"), i === parts.length - 1)])))
        .when(md, (el) => el.child(h_flex().flex_none().gap(2).child(tab("Preview", !code, "preview")).child(tab("Code", code, "code"))))
        .when(Boolean(review), (el) => el.child(div().id("t3-files-review").flex_none().h(24).px(8).flex().items_center().rounded(6).border(1).border_color(t.border)
          .text_size(12).text_color(t.muted).cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_click(() => { setShared("review.reveal", { space: st.id, file: st.git.prefix + st.file, n: Date.now() }); showPage("review"); })
          .child("Review ↗"))))
      .child(div().flex_1().min_h(0).min_w(0)
        .child(!v || v.loading ? div().p(16).text_size(12).text_color(t.dim).child("Loading…")
          : v.problem ? div().p(16).text_size(13).text_color(t.dim).child(v.problem)
          : v.image ? div().size_full().p(16).flex().items_center().justify_center().child(image(v.image).max_w_full().max_h_full())
          : md && !code ? div().id("t3-files-md").size_full().overflow_y_scrollbar().px(24).py(16).child(TextView.markdown(`t3-files-md-${st.id}-${st.file}`, v.text).selectable(true).scrollable(false).text_size(14))
          : v.code ? Editor.new(v.code).size_full()
          : div()));
  }

  // The tree, or what the search finds: by the window's edge, the field over it.
  side(st, t) {
    const results = st.results;
    return v_flex().id("t3-files-side").size_full().min_w(0).border_l(1).border_color(t.border)
      .on_key_down((e, cx) => {
        if (e.key === "escape" && st.query) { st.query = ""; st.results = null; this.search.set_value(""); }
        else if (results?.length) { const to = step(e, st.at, results.length); if (to < 0) return; st.at = to; }
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      // As T3's Combobox search: 12 across and 10 above, a 26 field, 6 to the rule.
      .child(div().flex_none().px(12).pt(10)
        .child(h_flex().h(33).pb(6).gap(4).items_center().border_b(1).border_color(t.border)
          .child(svg(`${MOD}/icons/search.svg`).size(16).flex_none().text_color(t.dim))
          .child(Input.new(this.search).flex_1().h_full().text_size(13).text_color(t.foreground))))
      .child(div().flex_1().min_h(0).pt(4).px(4)
        .child(results ? this.found(st, t) : this.tree(st, t)));
  }

  tree(st, t) {
    if (!st.root || st.error || !st.entries.has("")) return div().p(8).text_size(12).text_color(t.dim).child(!st.root ? "This space has no folder." : st.error ?? "Loading…");
    const rows = this.rows(st);
    if (!rows.length) return div().p(8).text_size(12).text_color(t.dim).child("This folder is empty.");
    const byPath = new Map(rows.map((r) => [r.path, r]));
    const draw = (r) => {
      const open = r.dir && st.expanded.has(r.path), mark = !r.dir && st.marks.get(r.path), lit = r.path === st.file || r.path === st.lit;
      return h_flex().id(`row-${r.path}`).h(ROW).w_full().pl(8 + r.depth * 14).pr(8).gap(6).items_center().rounded(6).text_size(12).font_family(MONO)
        .when(lit, (el) => el.bg(t.selected)).when(!lit, (el) => el.hover((s) => s.bg(t.hover)))
        .child(r.dir ? svg(`${MOD}/icons/chevron-${open ? "down" : "right"}.svg`).size(12).flex_none().text_color(t.dim) : div().w(12).flex_none())
        .child(image(`${MOD}/${r.dir ? folderIcon(r.name, open) : fileIcon(r.name, r.path)}`).size(14).flex_none().when(r.ignored || r.gone, (el) => el.opacity(0.5)))
        .child(div().flex_1().min_w(0).truncate().when(r.ignored || r.gone, (el) => el.opacity(0.5)).when(r.gone, (el) => el.line_through()).child(r.name))
        .when(Boolean(mark), (el) => el.child(letter(mark)))
        .when(r.dir && !open && st.dirs.has(r.path), (el) => el.child(div().size(6).mr(5).flex_none().rounded_full().bg(t.muted)));
    };
    return v_virtual_list("t3-files-tree", rows.length, ROW, (i) => rows[i].path, (range) => rows.slice(range.start, range.end).map(draw))
      .size_full().track_scroll(this.treeScroll)
      .on_item_click((key, cx) => { const r = byPath.get(key); if (!r) return; if (r.dir) this.toggle(st, key, cx); else this.open(st, key, cx); })
      .on_item_secondary_click((key) => { this.menuFor = key; });
  }

  // Search results: the name, then its folder dimmed, matched letters bright; at most 200, and how many more.
  found(st, t) {
    const results = st.results;
    if (!results.length) return div().p(8).text_size(12).text_color(t.dim).child("No matching files.");
    const pieces = (text, from, ranges, color) => {
      const out = [];
      let at = 0;
      for (const [a, b] of ranges) {
        const s = Math.max(a - from, at), e = Math.min(b - from, text.length);
        if (e <= s) continue;
        if (s > at) out.push(div().flex_none().text_color(color).child(text.slice(at, s)));
        out.push(div().flex_none().text_color(t.foreground).font_semibold().child(text.slice(s, e)));
        at = e;
      }
      if (at < text.length) out.push(div().flex_none().text_color(color).child(text.slice(at)));
      return out;
    };
    const draw = (i) => {
      const r = results[i], cut = r.path.lastIndexOf("/") + 1, dir = r.path.slice(0, Math.max(0, cut - 1));
      return h_flex().id(`found-${i}`).h(ROW).px(8).gap(6).items_center().rounded(6).text_size(12).font_family(MONO).overflow_hidden().whitespace_nowrap()
        .when(i === st.at, (el) => el.bg(t.selected))
        .on_hover((on, cx) => { if (on && st.at !== i) { st.at = i; cx.notify(); } })
        .on_click((_e, cx) => this.pick(st, r.path, cx))
        .on_mouse_down("right", () => { this.menuFor = r.path; })
        .child(image(`${MOD}/${fileIcon(r.path)}`).size(14).flex_none())
        .child(h_flex().flex_none().children(pieces(r.path.slice(cut), cut, r.ranges, t.foreground)))
        .when(Boolean(dir), (el) => el.child(h_flex().min_w(0).overflow_hidden().children(pieces(dir, 0, r.ranges, t.dim))));
    };
    const shownAll = !st.more && st.total <= results.length;
    return v_flex().size_full().min_h(0)
      .child(div().flex_1().min_h(0).child(scrollList(this, "t3-files-found", { count: results.length, row: ROW, at: st.at, draw, wheeled: (keep) => { st.at = keep; } }).size_full()))
      .when(!shownAll, (el) => el.child(div().flex_none().px(8).py(6).text_size(11).text_color(t.dim).truncate()
        .child(`${results.length} of ${count(st.total)}${st.more ? "+" : ""} matches · type more to narrow`)));
  }

  // A row's menu, where it was pressed: T3's menu measures (shared with t3-menu), closed by a press beside it or Escape.
  menuView(st, t) {
    const m = this.menu, items = this.menuItems(st, m.path), w = 220, h = items.length * 28 + 8;
    const size = this.size ?? { width: w, height: h };
    const x = Math.max(4, Math.min(m.x, size.width - w - 4)), y = Math.max(4, Math.min(m.y, size.height - h - 4));
    const close = (cx) => { this.menu = null; cx.notify(); };
    const choose = (it, cx) => { close(cx); it.run(cx); };
    return div().id("t3-files-menu-backdrop").absolute().inset_0()
      .on_mouse_down("left", (_e, cx) => { cx.stop_propagation(); close(cx); })
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); close(cx); })
      .child(v_flex().id("t3-files-menu").absolute().left(x).top(y).w(w).p(4).rounded(8).border(1).border_color(t.border).bg(t.popover).shadow_lg().text_size(14)
        .track_focus(this.handle)
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_key_down((e, cx) => {
          if (e.key === "escape") return close(cx);
          if (e.key === "enter") { const it = items[m.at]; if (it) choose(it, cx); return; }
          const to = step(e, m.at, items.length);
          if (to >= 0) { m.at = to; cx.notify(); }
        })
        .children(items.map((it, i) => h_flex().id(`t3-files-mi-${i}`).h(28).px(8).gap(8).rounded(4).items_center()
          .when(i === m.at, (el) => el.bg(t.selected))
          .on_hover((on, cx) => { const to = on ? i : m.at === i ? -1 : m.at; if (to !== m.at) { m.at = to; cx.notify(); } })
          .on_click((_e, cx) => choose(it, cx))
          .child(svg(`${MOD}/icons/${it.icon}.svg`).size(16).mx(-2).flex_none().text_color(t.muted))
          .child(div().flex_1().min_w(0).truncate().child(it.label))
          .when(Boolean(it.hint), (el) => el.child(div().flex_none().text_size(12).font_medium().text_color(t.dim).child(it.hint))))));
  }
}

// As Review's FileStatus: the letter in its status's color, on a tenth of it; T3's sm Badge.
function letter(mark) {
  const color = FILE_STATUS[mark] ?? FILE_STATUS.M;
  return div().h(16).min_w(16).px(3).flex_none().flex().items_center().justify_center().rounded(4).font_family(MONO).font_medium().text_size(10).text_color(color).bg(color + "1a").child(mark);
}
