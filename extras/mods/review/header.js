import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { LU, MONO, COMPACT, button, iconButton, popover } from "./controls.js";
import { donut } from "./groups.js";
import { scopeHeader } from "./scope.js";

// As the app's describeProgress, but the file's name only: the agent's paths run long, often through its own scratch folder.
function progressText(progress) {
  const n = progress?.paths?.length ?? 0;
  if (progress?.kind === "reading") return `Reading ${n} ${n === 1 ? "file" : "files"}: ${progress.paths[0]?.split("/").pop() ?? ""}${n > 1 ? ", …" : ""}`;
  if (progress?.kind === "organizing") return "Organizing groups…";
  if (progress?.kind === "thinking") return `Thinking… (step ${progress.step})`;
  return "Starting…";
}

// Running or failed: what the status shows; with neither, as the app's dialog, it isn't shown.
export function analysisStatus(view) {
  const a = view.review?.analysis, running = view.analyzing();
  return { running, error: view.analyzeError ?? (running ? null : a?.error) };
}

// As the app's AnalyzeStatusModal, without the transcript the daemon doesn't keep: what the run is doing in a faint line,
// or why it failed, and once it's done a Re-run.
export function statusPanel(view, t) {
  const { running, error } = analysisStatus(view);
  return popover(view, t, "review-status-panel").w(320).p(16).gap(8).text_size(12)
    .child(div().font_medium().text_size(14).child("AI analysis"))
    .when(running, el => el.child(h_flex().gap(8).items_center().opacity(0.4)
      .child(svg("mods/workspace-chrome/spinner.svg").size(14).flex_none().text_color(t.working).spin(900))
      .child(div().min_w(0).child(progressText(view.review.analysis.progress)))))
    .when(Boolean(error), el => el.child(div().text_color(t.ansi1).child(error)))
    .when(!running, el => el.child(h_flex().justify_end()
      .child(button(t, "rerun", "Re-run", (cx) => { view.closePopup(cx); view.analyze(cx, true); }, { primary: true, icon: `${LU}/rotate-cw.svg` }))));
}

// What the header shows: a title, the page, colored parts (theme color names) and buttons.
export function head(view) {
  // Switching, the old page's counts and analysis aren't the new one's.
  const r = view.switching ? null : view.review, parts = [], buttons = [];
  if (r) {
    const files = r.files, done = files.filter(f => f.reviewed).length;
    parts.push({ text: `+${files.reduce((n, f) => n + f.additions, 0)}`, color: "ansi2" }, { text: `−${files.reduce((n, f) => n + f.deletions, 0)}`, color: "ansi1" },
      { text: `${done}/${files.length}`, color: "dim", donut: files.length ? done / files.length : 1 });
    const a = r.analysis, { error } = analysisStatus(view);
    const compact = view.width < COMPACT;
    // As the app's DiffAnalyzeButton, the analysis's state is the button's: running or failed, it opens the status; without
    // a spinner of its own while running, as the pane's header marks the review working;
    // an agent, the settings. An analysis of an older version (the app has none) says so after its Re-analyze.
    const analyze = !a.agent ? { text: "Set up agent", lead: `${LU}/key-round.svg`, primary: true, run: (cx) => view.togglePopup("settings", cx) }
      : view.analyzing() ? { text: "Analyzing…", run: (cx) => view.togglePopup("status", cx) }
      : error ? { text: "Analysis failed", lead: `${LU}/circle-alert.svg`, color: "ansi1", run: (cx) => view.togglePopup("status", cx) }
      : { text: a.state === "none" ? "Analyze with AI" : "Re-analyze", lead: `${LU}/sparkles.svg`, primary: a.state === "none", note: a.state === "outdated" ? "(outdated)" : null, run: (cx) => view.analyze(cx, a.state === "current") };
    buttons.push({ id: "analyze", ...analyze, ...compact && { text: null, icon: analyze.lead ?? `${LU}/sparkles.svg`, label: analyze.text } });
    buttons.push({ id: "fold-menu", icon: `${LU}/chevrons-up-down.svg`, label: "Expand or collapse files", active: view.popup === "fold", run: (cx) => view.togglePopup("fold", cx) });
  }
  // The view (unified or split, files as a tree or a list) is set in the settings, with the analysis.
  buttons.push({ id: "settings", icon: "mods/review/icons/settings.svg", label: "Settings", active: view.popup === "settings", run: (cx) => view.togglePopup("settings", cx) });
  // The diff shown is named by the scope button, which leads the header (scope.js).
  return { parts, buttons };
}

export function header(view, t, head) {
  // As T3's DiffPanel header: the scope and what it compares, the counts as its DiffStatLabel, then the tools. Narrow, the
  // words give way and the buttons never.
  return h_flex().id("review-header").h(40).flex_none().px(16).gap(8).items_center().overflow_hidden().border_b(1).border_color(t.border).bg(t.chrome)
    .child(scopeHeader(view, t))
    // The counts hold, as T3's stats beside its tools: a long commit subject truncates instead.
    .when(head.parts.length > 0, el => el.child(h_flex().id("review-counts").flex_none().gap(4).items_center().text_size(11).font_family(MONO)
      .children(head.parts.map(p => h_flex().gap(4).items_center().text_color(t[p.color] ?? t.dim)
        .when(p.donut !== undefined, el => el.ml(4).child(donut(t, p.donut)))
        .child(div().child(p.text))))))
    .child(div().flex_1())
    .child(h_flex().flex_none().gap(4).items_center()
      .children(head.buttons.map(b => b.text
        ? button(t, b.id, b.text, b.run, { after: b.after, icon: b.lead, color: t[b.color], primary: b.primary, note: b.note })
        : iconButton(t, b.id, b.icon, b.label, b.run, { color: t[b.color], disabled: b.disabled, active: b.active }))));
}
