// A pulls.review review drawn in a pane, beside the agent that wrote the change: groups (the AI
// analysis, else rule-based), each group's files and their diffs, reviewed marks, one commit at
// a time. Opened by the pulls-review mod in "herdr" mode with props `{ root, page, n, analyze }`;
// later opens in the same space arrive through shared(PANE). Everything comes from the jin.review daemon.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, h_resizable, resizable_panel, VirtualListScrollHandle, InputState } from "gpui-base";
import { focused, panes, props, setShared, shared, spaces, theme, window as appWindow } from "herdr";
import { buildItems, contentWidth, groupFiles, pageLabel, rowsToAsk, LOOKAHEAD } from "./rows.js";
import { PANE, WIDE, SPLIT_MIN, DISABLED, pref, setPref, zoom, button } from "./controls.js";
import { colors, loadReview, loadRows, pollReview, applyReview, analyzeReview } from "./review-load.js";
import { loadSettings, models, submitModel, pageRows, locale, settingsPanel } from "./settings.js";
import { diffCommits, showPage, commitRows, commitMenu } from "./commits.js";
import { groupSidebar, groupHeader, groupTabs } from "./groups.js";
import { aside } from "./files.js";
import { setReviewed, toggleFull, headerPress, diffView, hbars, foldMenu } from "./diff.js";
import { analysisStatus, statusPanel, head, header } from "./header.js";
import { reviewKey } from "./keys.js";

// As the app's group aside beside the diffs at `lg`: a fifth of the row, at least 280, at most half.
const ASIDE_MIN = 280, ASIDE_MAX_RATIO = 0.5;

export default class ReviewPane extends View {
  init(_props, cx) {
    const p = props() ?? {};
    // The page a count's click asked to analyze, until its first read. Props outlive a restart, where a stale ask mustn't start a paid run.
    this.analyzeFor = p.analyze === true && localStorage.getItem("tab") === null ? p.page : null;
    this.tab = localStorage.getItem("tab") ?? focused()?.tab;
    localStorage.setItem("tab", this.tab ?? "");
    this.root = localStorage.getItem("root") ?? p.root;
    this.page = localStorage.getItem("page") ?? p.page;
    this.base = localStorage.getItem("base") ?? this.page;
    this.handled = Number(localStorage.getItem("handled") ?? p.n ?? 0);
    // The one popup open over the diff, if any: "settings", "status" or "fold".
    this.popup = null; this.closedPopup = null; this.popupClosedAt = 0;
    this.agents = null; this.shared = null; this.settingsError = null;
    this.height = 600; this.headerHidden = false; this.scrolledDownBy = 0; this.baseCommits = null;
    // The model field searches the agent's catalog; Enter picks the model it names exactly, else the text as typed.
    this.modelInput = InputState.new({ placeholder: "Search or type a model" });
    // The row lit on a settings page and in the fold menu, by keys or the pointer; Enter on one picks it.
    this.pageAt = -1; this.foldAt = -1;
    this.modelInput.on("change", (_e, cx) => { this.pageAt = -1; cx.notify(); });
    this.modelInput.on("submit", (_e, cx) => submitModel(this, cx));
    // The commit list's search, and the row lit in it.
    this.commitSearch = InputState.new({ placeholder: "Search commits" });
    this.commitAt = 0;
    this.commitSearch.on("change", (_e, cx) => { this.commitAt = 0; this.scrollTop = { ...this.scrollTop, "commit-list": 0 }; cx.notify(); });
    this.commitSearch.on("submit", (_e, cx) => { const row = this.commitRows()[this.commitAt]; if (row) showPage(this, row.page, cx); });
    // The colors the rows on screen are in.
    this.colorsKey = JSON.stringify(colors(theme()));
    this.review = null; this.error = null; this.version = 0; this.width = 900; this.view = 600; this.diffHeight = 600; this.frames = 0; this.sideWidth = [0, 0, 0]; this.shift = [0, 0, 0];
    this.startingUntil = 0; this.loading = null; this.loadId = 0;
    this.marks = 0; this.marking = 0;
    this.collapsed = new Set(); this.full = new Map(); this.parts = new Map(); this.seen = new Set(); this.folded = new Set();
    this.handle = cx.focus_handle();
    this.scroll = VirtualListScrollHandle.new();
    this.barsOn = false; this.barsRun = 0;
    this.load(cx);
    // While a run goes the pane follows it; otherwise the folder watch and a slow timer catch new diffs.
    cx.timer.every(1500, (cx) => { if (this.analyzing()) this.poll(cx); });
    // Unseen, the slow timer and the watch only note a read is due; it follows within a second of the pane being seen again.
    // Hidden panes keep their timers, and a run's poll goes on: tabs show its state.
    cx.timer.every(15000, (cx) => this.refresh(cx));
    cx.timer.every(1000, (cx) => { if (this.dirty && this.onScreen()) this.load(cx); });
    // Scrolling redraws only the list. What the rest shows of where it is - the aside's group, the files and groups in view,
    // as the app's scroll spy marks them - is checked here and redrawn when it moved.
    // Off screen, what the list shows can't move: nothing to measure.
    cx.timer.every(150, (cx) => { if (!this.onScreen()) return; const spied = this.spied(); if (spied !== this.lastSpied) { this.lastSpied = spied; cx.notify(); } });
  }

  remember() {
    for (const [key, value] of Object.entries({ root: this.root, page: this.page, base: this.base, handled: String(this.handled) })) localStorage.setItem(key, value);
  }

  open(page, cx) {
    if (page === this.page) return;
    // The old page stays on screen, dimmed and inert, until the new one's read replaces it: apply() then resets what belonged to it.
    this.page = page; this.switching = Boolean(this.review); this.error = null; this.analyzeError = null; this.startingUntil = 0; this.headerHidden = false;
    this.wasRunning = false; this.news = null;
    this.remember(); this.version++;
    this.load(cx);
  }

  // No review shown, or none yet: what belonged to the last one goes with it.
  forget() { this.review = null; this.switching = false; this.groupKey = null; this.current = null; this.full.clear(); this.parts.clear(); this.shift = [0, 0, 0]; }

  // The window active and this pane's tab the one shown.
  onScreen() { return appWindow()?.active !== false && spaces().some(s => s.active && s.tabs.some(c => c.id === this.tab && c.active)); }

  refresh(cx) { if (this.onScreen()) this.load(cx); else this.dirty = true; }

  load(cx, poll = false) { return loadReview(this, cx, poll); }

  loadRows(cx) { return loadRows(this, cx); }

  poll(cx) { return pollReview(this, cx); }

  apply(r) { return applyReview(this, r); }

  analyze(cx, force) { return analyzeReview(this, cx, force); }

  // A run going, as the app's from the click: the daemon answers before the worktree server has started it, and a read until then finds none.
  analyzing() { return (!this.switching && this.review?.analysis.state === "running") || Date.now() < this.startingUntil; }

  // What its tab and pane header show (t3's name.js), as the word an agent would report: a run going, then how it ended
  // until the tab is looked at. In the pane, the button keeps a failure.
  // shortcut: a pane starts only when shown, so the Review bar drops a run's word from before a restart (its main.js); with no bar in the layout, that word stays until its tab is shown.
  report() {
    const a = this.switching ? null : this.review?.analysis, real = a?.state === "running";
    if (!panes().some(p => p.mod === PANE && p.tab === this.tab)) return;
    if (this.wasRunning && !real) this.news = this.analyzeError ?? a?.error ? "blocked" : "done";
    this.wasRunning = real;
    if (this.analyzing() || this.onScreen()) this.news = null;
    this.keep("status", this.analyzing() ? "working" : this.news ?? null);
  }

  // This tab's entry in a value shared by tab, none with no value. Every write redraws every mod: only a change, and tabs
  // without a review pane drop out.
  keep(name, value) {
    const key = `${PANE}.${name}`, mine = panes().filter(p => p.mod === PANE), all = shared(key) ?? {};
    if (!mine.some(p => p.tab === this.tab)) return;
    const live = Object.entries(all).filter(([tab]) => tab !== this.tab && mine.some(p => p.tab === tab));
    if (JSON.stringify(all[this.tab] ?? null) === JSON.stringify(value) && live.length === Object.keys(all).length - (this.tab in all ? 1 : 0)) return;
    setShared(key, Object.fromEntries(value ? [...live, [this.tab, value]] : live));
  }

  // What this tab's pane shows, for the Review bar to light its count and find the repository: Herdr gives a mod pane no
  // folder, and a tab of its own has no terminal to borrow one from.
  publish() { this.keep("shown", { root: this.root, page: this.page, base: this.base }); }

  diffCommits() { return diffCommits(this); }

  commitRows() { return commitRows(this); }

  models() { return models(this); }

  pageRows() { return pageRows(this); }

  locale() { return locale(this); }

  // A popup's button toggles it. A press on the button while open is also a press outside it, which already closed it:
  // that press mustn't reopen it. The settings read the daemon's agents and settings on opening: the browser may have changed them.
  togglePopup(name, cx) {
    // The button's press stops there, short of the pane that would take the keyboard.
    this.handle.focus();
    if (this.popup === name) return this.closePopup(cx);
    if (this.closedPopup === name && Date.now() - this.popupClosedAt <= 300) return;
    this.popup = name; this.foldAt = -1;
    if (name === "settings") loadSettings(this, cx);
    // On the row shown, so ↑/↓ start from it.
    if (name === "commits") { this.commitAt = Math.max(0, this.commitRows().findIndex(r => r.page === this.page)); this.commitSearch.focus(); }
    cx.notify();
  }

  // `outside`: closed by a press outside it, which may be on its own button.
  closePopup(cx, outside = false) {
    if (!this.popup) return;
    this.closedPopup = outside ? this.popup : null; this.popup = null; this.popupClosedAt = Date.now();
    this.modelInput.set_value(""); this.commitSearch.set_value(""); this.pageAt = -1; this.settingsPage = null;
    cx.notify();
  }

  setReviewed(files, reviewed, cx) { return setReviewed(this, files, reviewed, cx); }

  toggleFull(file, cx) { return toggleFull(this, file, cx); }

  group() { return this.review?.groups.find(g => g.key === this.groupKey) ?? null; }

  headerPress(file, x, cx) { return headerPress(this, file, x, cx); }

  // Rebuilt only when something it shows changed: render runs on every live change in Herdr. Of the files, only those whose
  // items changed are built again (`parts`); the rest of a group of thousands is joined as it was.
  items() {
    const split = this.splitShown(), group = this.group(), id = `${this.version}:${this.groupKey}:${split}:${Math.round(this.view / 40)}`;
    if (id !== this.itemsId) {
      // Kept only once all of it is built: a throw part way would leave the list and its lookups out of step, never rebuilt.
      const list = group ? buildItems(this.review, group, { collapsed: this.collapsed, full: this.full, split, width: this.view, parts: this.parts }) : [];
      // In one pass: the heights v_virtual_list takes (the trailing blank's last), the height from the last header on, and
      // how wide the code runs, from each open file's widths, measured once per build of its items.
      const measure = (items) => split ? ["left", "right", "solo"].map(side => contentWidth(items, side)) : [0, 0, contentWidth(items)];
      const sizes = [], widths = measure([]);
      let tail = 0;
      for (const item of list) {
        sizes.push(item.size);
        if (item.kind === "file" || item.kind === "group") tail = 0;
        tail += item.size;
        const part = item.kind === "file" && !this.collapsed.has(item.path) && this.parts.get(item.path);
        if (part) (part.widths ??= measure(part.items)).forEach((w, i) => { widths[i] = Math.max(widths[i], w); });
      }
      sizes.push(0);
      // The range last drawn was another list's: until this one draws, scrollToTop mustn't go by it.
      this.itemsId = id; this.visible = null; this.itemList = list; this.sideWidth = widths; this.sizes = sizes; this.tail = tail;
    }
    return this.itemList;
  }

  // The list's heights as v_virtual_list takes them, the blank after the items last.
  listSizes() { const trailing = this.trailing(); this.sizes[this.sizes.length - 1] = trailing; return this.sizes; }

  // How far code can scroll sideways: a split side (0 left, 1 right), or the full-width rows (2: unified ones, or a split
  // view's added and removed files), as far as its longest line runs past its width.
  sideMax(side) { return Math.max(0, this.sideWidth[side] - (side === 2 ? this.view : this.view / 2)); }

  select(path, cx, { scroll = true } = {}) {
    const owner = this.review.groups.find(g => groupFiles(g).includes(path));
    if (owner && owner.key !== this.groupKey) { this.groupKey = owner.key; this.version++; }
    this.current = path;
    if (scroll) {
      const index = this.items().findIndex(item => item.key === `f:${path}`);
      if (index >= 0) this.scrollToTop(index, cx);
    }
    cx.notify();
  }

  // The blank after the list, so its last header can still reach the top: a view's height less what follows that header.
  trailing() { this.items(); return Math.max(0, Math.ceil(this.diffHeight - this.tail)); }

  /**
   * Brings an item's top to the list's top, exactly. The list scrolls only to the near edge: an item above the view lands at
   * the top, one below at the bottom. So below, first bottom-align the first item a view's height past it, which puts this
   * one just over the top; once that frame is drawn, scroll to this one, now above the view, so its top lands at the top.
   * Rows arriving in between rebuild the list: the item is found again by its key, and brought up afresh.
   */
  scrollToTop(index, cx) {
    const sizes = this.listSizes(), start = this.visible?.start ?? 0;
    const token = this.settling = {}, key = this.itemList[index]?.key, built = this.itemsId;
    if (index <= start) return this.scroll.scroll_to_item(index);
    let last = index, height = sizes[index];
    // A pixel's margin, so a rounded height still carries it past the top.
    while (height <= this.diffHeight + 1 && last + 1 < sizes.length) height += sizes[++last];
    this.scroll.scroll_to_item(last);
    const drawn = this.frames;
    let tries = 0;
    const settle = (cx) => {
      if (this.settling !== token) return;
      const at = this.items().findIndex(item => item.key === key);
      if (at < 0) return;
      if (this.itemsId !== built) return this.scrollToTop(at, cx);
      if (this.frames > drawn) { this.scroll.scroll_to_item(index); cx.notify(); }
      else if (++tries < 30) cx.timer.after(8, settle);
    };
    cx.timer.after(8, settle);
  }

  step(delta, cx) {
    const group = this.group();
    if (!group) return;
    const files = groupFiles(group), at = files.indexOf(this.current);
    const next = files[Math.min(files.length - 1, Math.max(0, at + delta))];
    if (next) this.select(next, cx);
  }

  currentFile() { return this.review?.files.find(file => file.path === this.current) ?? null; }

  rowsWanted() {
    const g = this.switching ? null : this.group();
    return g ? rowsToAsk(groupFiles(g), path => this.fileAt(path), this.visibleFiles(), this.collapsed) : [];
  }

  // The file cut short whose end the list shows or nears, as many items on as a batch looks files ahead: its next page is due.
  pageWanted() {
    const { start = 0, end = 0 } = this.visible ?? {};
    return this.switching ? null : (this.itemList ?? []).slice(start, end + LOOKAHEAD).find(item => item.more)?.path ?? null;
  }

  // A file by its path, from a map made once per read: a branch's files run to thousands, and a render looks up a group's every one.
  fileAt(path) {
    if (this.pathsOf !== this.review) { this.pathsOf = this.review; this.paths = new Map(this.review?.files.map(file => [file.path, file])); }
    return this.paths.get(path);
  }

  render(cx) {
    const t = theme();
    // Herdr doesn't tell a mod pane its tab, and a tab opened for it may not have the focus yet when it starts: a pane
    // whose tab holds no review pane takes the one review pane's tab no other has claimed.
    const mine = panes().filter(p => p.mod === PANE), titles = shared(`${PANE}.titles`) ?? {};
    if (!mine.some(p => p.tab === this.tab)) {
      const free = mine.filter(p => !(p.tab in titles));
      if (free.length === 1) { this.tab = free[0].tab; localStorage.setItem("tab", this.tab); }
    }
    // The name pane headers and tabs give this pane (t3's name.js), rather than the folder's; here, not in init, which a reload skips.
    // A tab of its own, unnamed, reads as this pane too (t3-tabs).
    this.keep("titles", this.page ? pageLabel(this.page, this.switching ? null : this.review) : "review");
    // Its icon in pane headers and tabs (t3's name.js), pulls.review's own logo. In a tab of its own it has a card in t3-inbox,
    // whose Settle closes it: its marks and analysis are the daemon's, so that loses nothing.
    if (shared(`${PANE}.program`)?.icon !== `mods/${PANE}/icons/logo.svg` || shared(`${PANE}.program`).inbox !== true) setShared(`${PANE}.program`, { icon: `mods/${PANE}/icons/logo.svg`, tint: false, name: "Review", inbox: true });
    this.report();
    // A later open in this tab: another page, maybe another worktree.
    const request = shared(PANE);
    if (request && request.tab === this.tab && request.n > this.handled) {
      this.handled = request.n;
      if (request.root !== this.root) { this.root = request.root; this.watching = null; this.seen.clear(); this.collapsed.clear(); this.page = null; this.forget(); }
      // With a base, the header's switch picking another page of the same diff: its commits stay.
      this.base = request.base ?? request.page;
      if (!request.base) this.baseCommits = null;
      this.remember();
      // Only the bar's counts ask for an analysis, so anything else takes back an ask not yet read.
      this.analyzeFor = request.analyze === true ? request.page : null;
      // The page already shown has no read coming to act on the ask.
      const again = this.analyzeFor && request.page === this.page;
      this.open(request.page, cx);
      if (again) this.load(cx);
    }
    this.publish();
    if (JSON.stringify(colors(t)) !== this.colorsKey) {
      this.colorsKey = JSON.stringify(colors(t));
      if (this.review) {
        for (const file of this.review.files) delete file.hunks;
        // A whole file shown has them too: it's read again, still shown.
        const whole = [...this.full.keys()];
        this.full.clear();
        for (const path of whole) { const file = this.fileAt(path); if (file) this.toggleFull(file, cx); }
        this.version++;
        this.load(cx);
      }
    }
    // Files in view or just after have no rows (just opened, scrolled to, or changed since): ask for them, one read at a time;
    // or a file cut short nears its end: its next page. Not after a failed read (Retry and the slow timer read again) nor
    // while a mark lands (its own read follows): a read then would fail or be dropped, and ask again at once.
    if ((this.rowsWanted().length || this.pageWanted()) && !this.loading && !this.error && !this.marking) this.loadRows(cx);
    const wide = this.width >= WIDE, sidebar = this.sidebarShown(), group = this.group();
    // A group newly shown, however it came to be, opens its subgroups; its tab's caret folds them.
    if (this.groupKey !== this.expandedFor) { this.expandedFor = this.groupKey; this.expandedTab = this.groupKey; }
    // As the app below `lg`, where the header eats a big share of the screen: it slides away after a long scroll down and
    // comes back on any scroll up.
    const hidden = this.headerHidden && !wide;
    // As the app at `lg`: beside the diffs, an aside with the header and files of the group in view, a fifth of the row;
    // a chapter's header (a group with subgroups) across the row above. Narrower, the header leads the diffs. Either way it
    // shows only at the list's top, as the app's scrolls away with the diffs.
    const row = this.width - (sidebar ? 256 : 0);
    const column = () => v_flex().size_full().min_w(0).min_h(0)
      .when(!sidebar && !hidden, el => el.child(groupTabs(this, t)))
      .when(Boolean(group) && (!wide || group.children.length > 0) && this.atTop(), el => el.child(groupHeader(this, t, group)))
      .child(!wide ? div().flex_1().min_h(0).child(diffView(this, t))
        : h_resizable("review-aside-width").flex_1().min_h(0)
          .child(resizable_panel().size(Math.max(ASIDE_MIN, Math.round(row / 5))).size_range(ASIDE_MIN, Math.max(ASIDE_MIN, Math.round(row * ASIDE_MAX_RATIO))).child(aside(this, t)))
          .child(resizable_panel().child(diffView(this, t))));
    // Its run over, nothing else closes the panel: the next run would bring it back, or the next press only close it unseen.
    const { running, error } = analysisStatus(this);
    if (this.popup === "status" && (!this.review || this.switching || !(running || error))) this.popup = null;
    return v_flex().id("review-pane").relative().size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(12)
      .track_focus(this.handle).on_key_down((e, cx) => this.key(e, cx))
      .on_mouse_down("left", () => this.handle.focus())
      .on_size_change((size, cx) => {
        const width = size.width / zoom(), height = size.height / zoom();
        if (Math.abs(width - this.width) >= 1 || Math.abs(height - this.height) >= 1) { this.width = width; this.height = height; cx.notify(); }
      })
      .when(!hidden, el => el.child(header(this, t, this.head())))
      .when(Boolean(this.error), el => el.child(h_flex().flex_none().px(12).py(6).gap(8).bg(t.ansi1 + "18").text_color(t.ansi1).text_size(11)
        .child(div().flex_1().min_w(0).child(this.error))
        .child(button(t, "retry", "Retry", (cx) => this.load(cx)))))
      .child((!this.review
        // As the app's FeedbackLoading.
        ? div().flex_1().py(48).when(!this.error, el => el.child(h_flex().gap(8).items_center().justify_center().text_color(t.dim).role("status")
          .child(svg("mods/workspace-chrome/spinner.svg").size(14).flex_none().text_color(t.working).spin(900)).child("Loading the review…")))
        // The divider drags; Herdr keeps the width under the group's id (renamed when the default changes, to take it).
        // As the app's group sidebar: w-64, at least 192, at most 40% of the page.
        : sidebar ? h_resizable("review-sidebar-width").flex_1().min_h(0)
          .child(resizable_panel().size(256).size_range(192, Math.max(192, Math.round(this.width * 0.4))).child(groupSidebar(this, t)))
          .child(resizable_panel().child(column()))
        : div().flex_1().min_h(0).child(column())).when(Boolean(this.switching), el => el.opacity(DISABLED)))
      // Built only while open: render runs on every live change, and a catalog runs to hundreds of rows.
      // Each 4 under its button (T3's sideOffset) in the 40 header: 38 under the 28s, 36 under the 24 switch.
      .when(this.popup === "settings", el => el.child(div().absolute().top(38).right(16).child(settingsPanel(this, t))))
      // Under its button, the one left of the gear.
      .when(this.popup === "fold" && Boolean(this.review) && !this.switching && !hidden, el => el.child(div().absolute().top(38).right(48).child(foldMenu(this, t))))
      // Under the header's left end, where the switch starts.
      .when(this.popup === "commits" && !hidden, el => el.child(div().absolute().top(36).left(16).child(commitMenu(this, t))))
      // At the pane's end rather than under its button: 320 wide, it would run off a narrow pane from there.
      .when(this.popup === "status", el => el.child(div().absolute().top(38).right(16).child(statusPanel(this, t))));
  }

  // Split as chosen, where the diff is wide enough for two sides; narrower it's unified, the choice kept.
  splitShown() { return pref("split") === true && this.view >= SPLIT_MIN; }

  // The sidebar as chosen, from WIDE, as the app's from `lg`; narrower the groups are tabs, the choice kept.
  sidebarShown() { return pref("groupNav") === "sidebar" && this.width >= WIDE; }

  toggleSplit(cx) {
    setPref("split", pref("split") !== true);
    cx.notify();
  }

  key(e, cx) { return reviewKey(this, e, cx); }

  head() { return head(this); }

  // The group or subgroup at the list's top, as the app's aside sticks for the group scrolled to; before the list draws, its first.
  asideGroup() {
    const g = this.group(), items = this.itemList ?? [];
    if (!g) return null;
    for (let i = Math.min(this.visible?.start ?? 0, items.length - 1); i >= 0; i--) if (items[i].kind === "group") return items[i].group;
    return g.files.length || !g.children.length ? g : g.children[0];
  }

  // The files whose rows the list last drew, as the app marks the files in view.
  visibleFiles() {
    const { start = 0, end = 0 } = this.visible ?? {};
    return new Set((this.itemList ?? []).slice(start, end).filter(item => item.kind !== "group").map(item => item.path));
  }

  spied() { return this.review ? JSON.stringify([this.asideGroup()?.key, [...this.visibleFiles()], [...this.visibleGroups()], this.atTop(), this.stickyFile()?.path, this.pageWanted()]) : ""; }

  // Whether the list is at its first item: the group's header shows only then.
  atTop() { return (this.visible?.start ?? 0) === 0; }

  // The file whose rows open the view once its header has scrolled past the top: that header sticks there, as the app's.
  stickyFile() {
    const item = (this.itemList ?? [])[this.visible?.start ?? 0];
    return item && item.kind !== "file" && item.kind !== "group" ? this.fileAt(item.path) ?? null : null;
  }

  hbars(t) { return hbars(this, t); }

  // The subgroups whose rows the list last drew, as the app marks the groups in view.
  visibleGroups() {
    const keys = new Set(), items = this.itemList ?? [], { start = 0, end = 0 } = this.visible ?? {};
    let current = null;
    for (let i = 0; i < Math.min(end, items.length); i++) {
      if (items[i].kind === "group") current = items[i].group.key;
      if (i >= start && current) keys.add(current);
    }
    return keys;
  }
}
