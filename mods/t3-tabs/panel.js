// The space panel (docs/adr/0011): one `panel` column at the window's right, its pages the children of the `panel-body`
// stack, as in Herdr's own main layout. Shown or hidden, and which page, are the layout's clicks: one for the whole window.
import { layout, run } from "herdr";

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
  if (panelState().wide) run("layout.show", { id: "work" });
  run("layout.hide", { id: "panel" });
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
  run(panelState().wide ? "layout.show" : "layout.hide", { id: "work" });
}
