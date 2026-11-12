// pulls.review in Herdr. In a bar it is the Review bar (bar.js), sized to fit its block; opened as an overlay it opens a
// review (open.js), or with props.menu the logo's menu. A review in "herdr" mode draws in the review page of the window's
// panel (the review mod).
// Bound in keys.json, `mod.open:pulls-review` reviews the focused pane's worktree.

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { props, run, settings, setShared, shared, theme, nextCommand } from "herdr";
import { watchReview, reviewBar, reviewMenu, initReviewMenu, menuClosed, pickCommand } from "./bar.js";
import { launch } from "./open.js";
import { stopsInit, stopsEnd, focusRoot } from "./focus.js";

export default class PullsReview extends View {
  init(_props, cx) {
    const p = props() ?? {};
    if (p.menu === "review") initReviewMenu(this);
    else if (p.overlay) cx.spawn(() => launch(p));
    else {
      // The panel's review page starts only when first shown and shared outlives the app, so a run's word from before a restart
      // would stay until that page is seen. The bar, always shown, drops it; a review still running says so again at its next poll (1.5s).
      const status = Object.entries(shared("review.status") ?? {}), left = status.filter(([, word]) => word !== "working");
      if (left.length < status.length) setShared("review.status", Object.fromEntries(left));
      watchReview(this, cx);
      stopsInit(this, cx);
      // The Review page's header asks here for the menu of what else to review: the bar has read the repository.
      cx.spawn(async () => { for (;;) { const c = await nextCommand(); if (c.startsWith("pick:")) await pickCommand(this, c); } });
    }
  }

  close() {
    stopsEnd(this);
    if (/** @type {any} */ (this).search) menuClosed();
  }

  render() {
    const p = props() ?? {};
    if (p.menu === "review") return reviewMenu(this);
    // Opening: nothing to see, and the overlay closes itself when it's done.
    if (p.overlay) return div();
    const bar = reviewBar(this, theme(), (_e, cx) => cx.stop_propagation());
    // Outside a repository there's no bar, and its block closes to nothing.
    return focusRoot(this, h_flex().size_full().items_center().justify_end()
      .child(h_flex().id("review-fit").flex_none().items_center().when(Boolean(bar), el => el.pr(8).child(bar)).on_size_change((size) => this.fit(size))));
  }

  // With the block's id in props.block, it sizes that block to the bar: layout.resize, which Herdr keeps with the
  // layout's clicks. on_size_change reports zoomed pixels; a layout's are logical.
  fit(size) {
    const id = props()?.block, px = Math.ceil(size.width / (Number(settings()?.zoom) || 1));
    if (!id || px === this.fitted) return;
    this.fitted = px;
    run("layout.resize", { id, px });
  }
}
