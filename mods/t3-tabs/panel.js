// The space panel (docs/adr/0011, 0012): one `panel` column at the window's right, its pages the children of the `panel-body`
// stack, as in Herdr's own main layout. Shown or hidden, which page and wide or not are the layout's clicks; each space keeps its own.
import { layout, run, spaces, shared, setShared } from "herdr";
import { KEY } from "./store.js";

const find = (node, id) => node?.id === id ? node : (node?.children ?? []).reduce((hit, c) => hit ?? find(c, id), null);

/** { open, page, pages, wide }: pages are the stack's children ids, in order (`review` only where the extra is installed). */
export function panelState() {
  const root = layout(), panel = find(root, "panel"), body = find(root, "panel-body"), work = find(root, "work");
  return { open: Boolean(panel && !panel.hidden), page: body?.active ?? null, pages: (body?.children ?? []).map(c => c.id), wide: Boolean(panel && work?.hidden) };
}

export function showPage(page) {
  if (!panelState().pages.includes(page)) return false;
  run("layout.select", { stack: "panel-body", child: page });
  run("layout.show", { id: "panel" });
  return true;
}

// Closing it gives the work column back, if the panel had taken its place.
export function hidePanel() {
  const s = panelState();
  if (s.wide) run("layout.show", { id: "work" });
  run("layout.hide", { id: "panel" });
  remember({ open: false, page: s.page, wide: false });
}

/** A page's own entry: opens the panel on it, or closes the panel already showing it. Without a page, the panel on its last one. */
export function togglePanel(page) {
  const s = panelState();
  if (s.open && (!page || s.page === page)) hidePanel();
  else if (page) showPage(page);
  else if (s.page) showPage(s.page);
}

// The panel over the whole work area, the tab bar included, and back: for a split diff or a long file.
export function toggleWide() {
  const s = panelState();
  run(s.wide ? "layout.show" : "layout.hide", { id: "work" });
  remember({ open: true, page: s.page, wide: !s.wide });
}

// Widening hides the tab bar's copy and leaving wide brings it back with an old space in mind: written here, as it happens, it
// finds the space's record already as the panel shows and restores nothing.
function remember(now) {
  const space = spaces().find(p => p.active), all = /** @type {Record<string, any>} */ (shared(KEY.panels) ?? {});
  if (space && !same(all[space.id], now)) setShared(KEY.panels, { ...all, [space.id]: now });
}

const same = (a, b) => Boolean(a) && a.open === b.open && a.page === b.page && a.wide === b.wide;

/**
 * Each space keeps its panel, as T3 keeps one per thread: switching shows that space's (closed if it never had one), and whatever
 * opens, closes, pages or widens it is recorded. The width stays the window's. Called from render by the copy that can see the
 * panel's state change: the tab bar's, or while wide, which hides the tab bar, the panel's head (`whenWide`). A copy taking over
 * from the other starts from what shows rather than restoring, as the other has been recording.
 */
export function syncPanel(view, whenWide) {
  const s = panelState(), space = spaces().find(p => p.active);
  if (!space || !s.pages.length || s.wide !== whenWide) { view.panelSpace = null; return; }
  const now = { open: s.open, page: s.page, wide: s.wide }, all = /** @type {Record<string, any>} */ (shared(KEY.panels) ?? {});
  if (space.id !== view.panelSpace) {
    const takeover = view.panelSpace == null;
    view.panelSpace = space.id; view.panelPending = null;
    const kept = all[space.id], want = { open: Boolean(kept?.open), page: s.pages.includes(kept?.page) ? kept.page : s.page, wide: Boolean(kept?.open && kept?.wide) };
    if (!takeover && !same(want, now)) {
      // The layout's clicks land after this frame: until then (or until something else wins) what shows isn't a choice.
      // Restoring wide hides this copy: the head goes on from there.
      if (!want.wide) view.panelPending = { want, until: Date.now() + 1000 };
      run("layout.select", { stack: "panel-body", child: want.page });
      run(want.wide ? "layout.hide" : "layout.show", { id: "work" });
      run(want.open ? "layout.show" : "layout.hide", { id: "panel" });
      return;
    }
  }
  if (view.panelPending) {
    if (!same(view.panelPending.want, now) && Date.now() < view.panelPending.until) return;
    view.panelPending = null;
  }
  // shortcut: a closed space's entry stays; prune by spaces() if the record ever grows noticeably.
  remember(now);
}
