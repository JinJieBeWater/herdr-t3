import { step, menuJump } from "./list.js";
import { settingsBack, submitModel } from "./settings.js";
import { FOLDS, foldAll } from "./diff.js";

export function reviewKey(view, e, cx) {
  // Typing a model name isn't a shortcut; Escape closes the panel.
  if (view.popup === "settings") {
    const page = view.settingsPage;
    // Escape goes back a page, then closes.
    if (e.keystroke === "escape") return page ? settingsBack(view, cx) : view.closePopup(cx);
    if (!page) return;
    if (e.key === "enter" && page === "model") return submitModel(view, cx);
    const rows = view.pageRows();
    if ((e.key === "enter" || e.key === "space") && page !== "model") {
      const row = rows[view.pageAt];
      if (row) { settingsBack(view, cx); row.pick(cx); }
      return;
    }
    // In the search field, Home and End are the caret's and typing is the field's.
    const to = page === "model" ? step(e, view.pageAt, rows.length) : menuJump(view, e, rows.map(r => r.name), view.pageAt);
    if (to >= 0) { view.pageAt = to; cx.stop_propagation(); cx.notify(); }
    return;
  }
  if (view.popup === "fold") {
    if (e.keystroke === "escape") view.closePopup(cx);
    else if (e.key === "enter" || e.key === "space") { if (view.review && !view.switching && FOLDS[view.foldAt]) foldAll(view, FOLDS[view.foldAt], cx); }
    else {
      const to = menuJump(view, e, FOLDS.map(fold => fold.label), view.foldAt);
      if (to < 0) return;
      view.foldAt = to;
    }
    cx.stop_propagation(); cx.notify();
    return;
  }
  // Typing is the search's, and Enter its submit.
  if (view.popup === "commits") {
    if (e.keystroke === "escape") { view.closePopup(cx); view.handle.focus(); cx.stop_propagation(); return; }
    const to = step(e, view.commitAt, view.commitRows().length);
    if (to >= 0) { view.commitAt = to; cx.stop_propagation(); cx.notify(); }
    return;
  }
  // The status has no keys of its own, and what's under it is out of reach while it's up.
  if (view.popup && e.keystroke !== "escape") return;
  const actions = {
    escape: () => view.closePopup(cx),
    j: () => view.step(1, cx), k: () => view.step(-1, cx),
    r: () => { const f = view.currentFile(); if (f) view.setReviewed(f, !f.reviewed, cx); },
    f: () => { const f = view.currentFile(); if (f) view.toggleFull(f, cx); },
    c: () => { if (view.current) { view.collapsed.has(view.current) ? view.collapsed.delete(view.current) : view.collapsed.add(view.current); view.version++; cx.notify(); } },
    s: () => view.toggleSplit(cx),
  };
  const action = actions[e.keystroke];
  // Switching, the list is the old page's: only Escape works.
  if (view.switching && e.keystroke !== "escape") return;
  if (action) { action(); cx.stop_propagation(); }
}
