import { div, svg, image } from "gpui-kit";
import { h_flex, Switch } from "gpui-base";
import { exec, window as appWindow } from "herdr";
import { request } from "./daemon.js";
import { scrollList } from "./list.js";
import { PANE, MODEL_ROW, WIDE, SPLIT_MIN, pref, setPref, pickMark, searchField, popover } from "./controls.js";

// Models the settings list before the search must narrow them.
const LISTED = 200;

// As the app's LOCALES (core/locales.ts): the languages an analysis can write in, by their own names.
const LOCALES = [["en", "English"], ["zh-CN", "简体中文"], ["zh-TW", "繁體中文"], ["ja", "日本語"], ["ko", "한국어"], ["es", "Español"], ["fr", "Français"],
  ["de", "Deutsch"], ["pt-BR", "Português (Brasil)"], ["ru", "Русский"], ["it", "Italiano"], ["id", "Bahasa Indonesia"]];

// In the browser, as mods/pulls-review opens one.
function openUrl(url) {
  const platform = appWindow()?.platform;
  const [command, args] = platform === "macos" ? ["open", [url]]
    : platform === "windows" ? ["rundll32", ["url.dll,FileProtocolHandler", url]] : ["xdg-open", [url]];
  exec(command, args).catch(() => {});
}

// The settings panel reads the daemon's agents and shared settings each time it opens: the browser may have changed them.
export function loadSettings(view, cx) {
  const root = view.root;
  cx.spawn(async (cx) => {
    try {
      const [agents, shared] = await Promise.all([request(root, "GET", "/api/agents"), request(root, "GET", "/api/settings")]);
      view.agents = agents; view.shared = shared; view.settingsError = null;
      view.modelInput.set_value("");
    } catch (e) { view.settingsError = e?.message ?? String(e); }
    cx.notify();
  });
}

// Picking an agent or model makes the local agent the provider, as the app's Local agent settings do.
function saveLlm(view, patch, cx) {
  // Whether an agent is set up changes the Analyze button.
  saveShared(view, { llm: { provider: "local-agent", ...patch } }, cx, true);
}

// The daemon's PUT replaces all its settings, and every pane shares the one daemon: saves go one at a time, each
// writing only its own fields over the settings as they are now, so one save can't undo another's.
let saving = Promise.resolve();

function saveShared(view, patch, cx, reload = false) {
  const merged = (s) => ({ ...s, ...patch, ...patch.llm && { llm: { ...s?.llm, ...patch.llm } } });
  view.shared = merged(view.shared);
  cx.notify();
  const root = view.root;
  const turn = saving.then(async () => request(root, "PUT", "/api/settings", merged(await request(root, "GET", "/api/settings"))));
  saving = turn.catch(() => {});
  cx.spawn(async (cx) => {
    try { await turn; view.settingsError = null; }
    catch (e) { view.settingsError = e?.message ?? String(e); }
    cx.notify();
    if (reload) view.load(cx);
  });
}

// The picked agent and model, the agent's catalog, and the models the search lists (past LISTED it must narrow them).
export function models(view) {
  const llm = view.shared?.llm ?? {}, agent = llm.provider === "local-agent" ? llm.agent : "", model = llm.agentModel ?? "";
  const catalog = view.agents?.find(a => a.name === agent)?.models ?? [];
  const query = view.modelInput.value().trim().toLowerCase();
  const matches = query ? catalog.filter(m => `${m.id} ${m.name}`.toLowerCase().includes(query)) : catalog;
  const shown = matches.slice(0, LISTED);
  // The rows above the catalog, while a search names them too: else ↓ would stop on Default before the first match.
  const lead = [{ key: "model-default", id: "", name: "Default" }, ...(model && !catalog.some(m => m.id === model) ? [{ key: "model-custom", id: model, name: model, detail: "Custom" }] : [])]
    .filter(m => m.name.toLowerCase().includes(query));
  return { agent, model, catalog, matches, shown, rows: [...lead, ...shown] };
}

// Enter in the model field: the lit row, else the model it names exactly, else the text as typed.
export function submitModel(view, cx) {
  const typed = view.modelInput.value().trim(), { catalog, rows } = view.models(), lit = rows[view.pageAt];
  if (!view.shared || (!typed && !lit)) return;
  const hit = lit ?? catalog.find(m => [m.id, m.name].some(x => x.toLowerCase() === typed.toLowerCase()));
  settingsBack(view, cx);
  saveLlm(view, { agentModel: hit?.id ?? typed }, cx);
}

// The rows of the settings page shown, each with what picking it writes.
export function pageRows(view) {
  const page = view.settingsPage, locale = view.locale(), { agent, model, rows } = view.models();
  if (page === "language") return LOCALES.map(([code, name]) => ({ id: `locale-${code}`, name, on: code === locale, pick: (cx) => saveShared(view, { locale: code }, cx) }));
  // One agent's model ids mean nothing to another: switching resets to its default.
  if (page === "agent") return (view.agents ?? []).map(a => ({ id: `agent-${a.name}`, name: a.label, detail: a.version, on: a.name === agent, pick: (cx) => saveLlm(view, { agent: a.name, agentModel: "" }, cx) }));
  return rows.map(m => ({ id: m.key ?? `model-${m.id}`, name: m.name, detail: m.detail, on: m.id === model, pick: (cx) => saveLlm(view, { agentModel: m.id }, cx) }));
}

// A press on the panel stops there, so the keyboard is sent where the page wants it: the model search, else the pane's keys.
function openPage(view, id, cx) {
  view.settingsPage = id; view.pageAt = -1;
  (id === "model" ? view.modelInput : view.handle).focus();
  cx.notify();
}

// Back to the settings' main page. The model field is going, and the keyboard with it unless it's sent back.
export function settingsBack(view, cx) {
  view.settingsPage = null; view.modelInput.set_value(""); view.pageAt = -1;
  view.handle.focus();
  cx.notify();
}

/**
 * The settings, as the app's settings dialog in a panel: the view's choices, then the analysis's - analyzing when a count opens a review,
 * and the language, agent and model, each a row naming its value. A row's press opens its list as a page of the panel,
 * as the app's selects open theirs (Herdr can't float a list over the rows after it); a pick, or Escape, comes back.
 */
export function settingsPanel(view, t) {
  const page = view.settingsPage, locale = view.locale(), { agent, model, catalog, matches, shown } = view.models();
  const split = pref("split") === true, autoAnalyze = pref("autoAnalyze") === true;
  // As T3's MenuGroupLabel and MenuSeparator.
  const label = (text) => div().h(28).px(8).flex_none().flex().items_center().text_size(12).font_medium().text_color(t.dim).child(text);
  const rule = () => div().h(1).my(4).mx(8).flex_none().bg(t.border);
  const link = (id, text, url) => div().id(id).text_color(t.muted).hover(s => s.text_color(t.foreground).underline()).role("link")
    .on_click((_e, cx) => { cx.stop_propagation(); openUrl(url); }).child(text);
  // As T3's ComboboxStatus, its 12 in the panel's 4 and 8.
  const note = (text, color = t.dim) => div().p(8).flex_none().text_size(12).font_medium().text_color(color).child(text);
  const choice = (r, i) => h_flex().id(r.id).h(28).px(8).gap(8).flex_none().items_center().rounded(4)
    .when(i === view.pageAt, el => el.bg(t.selected)).on_hover((on, cx) => { if (on && view.pageAt !== i) { view.pageAt = i; cx.notify(); } })
    .role("radio_button").accessibility_label(r.name).on_click((_e, cx) => { settingsBack(view, cx); r.pick(cx); })
    .child(pickMark(t, r.on))
    .child(div().flex_1().min_w(0).truncate().child(r.name))
    .when(Boolean(r.detail), el => el.child(div().flex_none().text_size(12).text_color(t.dim).child(r.detail)));
  // A setting that opens its page, as T3's MenuSubTrigger: its name, its value and a chevron.
  const nav = (id, text, value) => h_flex().id(`settings-${id}`).h(28).px(8).gap(8).flex_none().items_center().rounded(4).hover(s => s.bg(t.selected))
    .role("button").accessibility_label(`${text}: ${value}`).on_click((_e, cx) => openPage(view, id, cx))
    .child(div().flex_none().child(text))
    .child(div().flex_1().min_w(0).truncate().text_right().text_color(t.dim).child(value))
    .child(svg("mods/review/icons/chevron-right.svg").size(16).mr(-2).flex_none().text_color(t.dim));
  const current = view.agents?.find(a => a.name === agent), typed = view.modelInput.value().trim();
  const options = page ? view.pageRows() : [];
  const rows = !page ? [
    label("View"),
    // Split needs a diff SPLIT_MIN wide: narrower, the choice is kept and the diff unified, so it shows faded.
    choiceRow(t, "Diff", [["view-unified", "Unified", !split], ["view-split", "Split", split, view.view < SPLIT_MIN]], (id, cx) => { if ((id === "view-split") !== split) view.toggleSplit(cx); }),
    // A tree by default, as the app's own toggle.
    choiceRow(t, "Files", [["files-tree", "Tree", pref("fileList") !== "list"], ["files-list", "List", pref("fileList") === "list"]], (id, cx) => {
      setPref("fileList", id === "files-list" ? "list" : "tree"); cx.notify();
    }),
    // The sidebar needs the pane WIDE: narrower, the choice is kept and the groups are tabs, so it shows faded.
    choiceRow(t, "Groups", [["groups-tabs", "Tabs", pref("groupNav") !== "sidebar"], ["groups-sidebar", "Sidebar", pref("groupNav") === "sidebar", view.width < WIDE]], (id, cx) => {
      setPref("groupNav", id === "groups-sidebar" ? "sidebar" : "tabs"); cx.notify();
    }),
    // Read by mods/pulls-review on the next open: a pane beside the agent, or a tab of its own.
    choiceRow(t, "Open in", [["open-pane", "Pane", pref("openIn") !== "tab"], ["open-tab", "Tab", pref("openIn") === "tab"]], (id, cx) => {
      setPref("openIn", id === "open-tab" ? "tab" : "pane"); cx.notify();
    }),
    rule(),
    label("AI"),
    Switch.new("auto-analyze").checked(autoAnalyze).accessibility_label("Analyze automatically")
      .on_change((on, cx) => { setPref("autoAnalyze", on); cx.notify(); })
      // As T3's MenuCheckboxItem, its switch variant.
      .child(h_flex().h(28).pl(8).pr(6).gap(16).items_center().rounded(4).hover(s => s.bg(t.selected))
        .child(div().flex_1().child("Analyze automatically"))
        .child(div().w(22).h(14).p(1).flex_none().flex().rounded_full().bg(autoAnalyze ? t.accent : t.input)
          .when(autoAnalyze, el => el.justify_end())
          .child(div().size(12).rounded_full().bg(t.background)))),
    view.settingsError && note(view.settingsError, t.ansi1),
    // As the app's LanguageMenu, the language the analysis writes in (the pane's own words stay English): unset, the
    // daemon's default, the system's.
    view.shared && nav("language", "Language", LOCALES.find(([code]) => code === locale)?.[1] ?? locale ?? ""),
    !view.agents ? !view.settingsError && note("Looking for agents…")
      : view.agents.length ? nav("agent", "Agent", current ? `${current.label} ${current.version}` : "None") : note("No agent CLI found on PATH"),
    Boolean(current) && nav("model", "Model", !model ? "Default" : catalog.find(m => m.id === model)?.name ?? model),
    rule(),
    // Credit, as the app's footer: pulls.review is antfu's; this pane draws from JinJieBeWater's fork of it.
    h_flex().id("settings-credit").h(28).px(8).gap(4).flex_none().items_center().text_size(11).text_color(t.dim)
      .child(image(`mods/${PANE}/icons/logo.svg`).w(12).h(12).flex_none())
      .child(link("credit-upstream", "pulls.review", "https://github.com/antfu/pulls.review")).child("by")
      .child(link("credit-antfu", "@antfu", "https://github.com/antfu")).child("·")
      .child(link("credit-fork", "fork", "https://github.com/JinJieBeWater/pulls.review")).child("by")
      .child(link("credit-jinjie", "@JinJieBeWater", "https://github.com/JinJieBeWater")),
  ] : [
    h_flex().id("settings-back").h(28).px(8).gap(8).flex_none().items_center().rounded(4).hover(s => s.bg(t.selected))
      .role("button").accessibility_label("Back").on_click((_e, cx) => settingsBack(view, cx))
      .child(svg("mods/review/icons/chevron-left.svg").size(16).mx(-2).flex_none().text_color(t.dim))
      .child(div().font_medium().child({ language: "Language", agent: "Agent", model: "Model" }[page])),
    page !== "model" && rule(),
    // The search sits above the catalog, which runs to hundreds for some agents. Its own rule stands in for the page's.
    page === "model" && searchField(t, view.modelInput).mx(8).mt(5).mb(5),
    // A page's list shrinks where the panel runs short; everything above it stays put. Pi lists hundreds: past LISTED the search finds the rest.
    scrollList(view, `${page}-list`, { count: options.length, row: MODEL_ROW, at: view.pageAt, draw: (i) => choice(options[i], i), wheeled: (keep) => { view.pageAt = keep; } })
      .h(options.length * MODEL_ROW).min_h(0).flex_shrink_1(),
    page === "model" && shown.length < matches.length && note(`${matches.length - LISTED} more: search to narrow`),
    page === "model" && Boolean(typed) && !matches.length && note(`Enter to use “${typed}”`),
  ];
  // Clipped: whatever outgrows the height scrolls inside its list, or is cut, rather than drawn past the panel.
  // As T3's: a select as tall as there's room for, 38 down and 8 short of the pane's foot; a combobox, as the search's page is, 368 at most.
  return popover(view, t, "review-settings-panel").w(320).max_h(Math.max(160, Math.min(page === "model" ? 368 : view.height, view.height - 46))).overflow_hidden().p(4)
    .children(rows.filter(Boolean));
}

// The language the analysis writes in: the one set, else the daemon's default.
export function locale(view) { return view.shared?.locale ?? view.shared?.defaultLocale; }

// A setting's row: its name, then its options as one segmented control; `pick(id, cx)` on a press.
function choiceRow(t, name, options, pick) {
  // A menu row's 4 either side of the 28 track.
  return h_flex().h(36).px(8).gap(8).flex_none().items_center()
    .child(div().flex_1().child(name))
    // As Custom snooze's segmented group (T3's ToggleGroup): an `input` track, the picked option `selected`; the others brighten on hover.
    .child(h_flex().flex_none().p(2).gap(2).rounded(8).bg(t.input)
      .children(options.map(([id, text, on, faded]) => div().id(id).h(24).px(10).flex().items_center().rounded(6).text_size(12).font_medium()
        .text_color(on ? t.foreground : t.dim).when(on, el => el.bg(t.selected)).when(!on, el => el.hover(s => s.text_color(t.foreground)))
        .when(Boolean(faded), el => el.opacity(0.5))
        .role("radio_button").accessibility_label(`${name}: ${text}`)
        .on_click((_e, cx) => pick(id, cx))
        .child(text))));
}
