// Go to a pane, drawn as T3's command palette and the New menu (t3-new-menu): a row a pane, agents and programs
// alike, named and marked as its pane header is, so lazygit beside an agent is found as itself. From the shipped
// picker (mod.clone). First a Back row to the pane the last jump from here left, so ⌘P, Enter goes back and forth.
// ↑/↓ and Enter to go, ctrl+d to close a pane (asking first while a program runs), Esc to leave.
import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex, InputState, Input, v_virtual_list, VirtualListScrollHandle } from "gpui-base";
import { theme, spaces, panes, agents, terminals, focused, run, closeOverlay, props, window, layout, shared, setShared } from "herdr";
import { modStatus, namer, programOf } from "./name.js";
import { ownStatus, subAgents, treeStatus } from "./tree.js";
import { projectMark } from "./project.js";

const ROW = 46;
const SHOWN = 6; // rows before the list scrolls; a virtual list has no height of its own, and the popup hugs its content

const icon = (t, p) => !p?.icon ? svg("mods/t3-picker/terminal.svg").size(12).flex_none().text_color(t.muted)
  : p.tint ? svg(p.icon).size(12).flex_none().text_color(t.muted) : image(p.icon).size(12).flex_none();

// Settled or snoozed (until it wakes) in the inbox isn't news, so its done dot goes, as in the tabs and pane headers.
function settled(p) {
  const find = (n) => n?.id === "sidebar-lists" ? n : (n?.children ?? []).map(find).find(Boolean);
  const labels = terminals().find((k) => k.address === p.terminal)?.labels;
  return find(layout())?.active === "inbox" && Boolean(labels?.settled || Number(labels?.snoozed) > Date.now());
}

export default class Picker extends View {
  init(_props, cx) {
    this.at = null;
    this.filter = "";
    // As T3's palette it fades in; a transition only eases later changes, so it draws clear first.
    this.shown = false;
    cx.timer.after(34, (cx) => { this.shown = true; cx.notify(); });
    this.scroll = VirtualListScrollHandle.new();
    this.input = InputState.new({ placeholder: "Search terminals…" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); this.at = 0; this.scroll.scroll_to_item(0); cx.notify(); });
    this.input.on("submit", () => this.choose(this.items()[this.at ?? 0]));
    this.input.focus();
  }

  // Every pane, the current space's first, then its machine's, as New orders spaces; each space's in tab order.
  items() {
    const q = this.filter.toLowerCase(), ps = panes(), all = terminals(), name = namer(), kids = subAgents(agents(), all);
    const mine = spaces().find((s) => s.active)?.machine ?? null;
    const rank = (s) => (s.active ? 0 : (s.machine ?? null) === mine ? 1 : 2);
    const rows = [...spaces()].sort((a, b) => rank(a) - rank(b) || (a.machine ?? "").localeCompare(b.machine ?? "")).flatMap((s) => s.tabs.flatMap((c) =>
      ps.filter((p) => p.tab === c.id).map((p) => {
        const under = p.terminal ? kids(p.terminal) : [];
        return {
          key: `pane:${p.pane}`, p, s, label: name(p), program: programOf(p), team: under.length, here: s.active && c.active && p.focused,
          status: p.mod ? modStatus(p) : treeStatus(ownStatus(p.status, p.terminal, all), under),
          // A tab's own name only if someone gave it: else it's its position ("4") or what it was first, not what runs in it.
          words: [s.name, s.machine ?? "", c.named ? c.name : "", name(p), programOf(p)?.name ?? "", p.program?.key ?? "", (p.cwd ?? "").split(/[\\/]/).pop()],
        };
      })));
    const back = !q && rows.find((r) => r.p.pane === shared("t3-picker.back") && !r.p.focused);
    const found = rows.filter((r) => !q || r.words.join(" ").toLowerCase().includes(q));
    return back ? [{ ...back, key: `back:${back.p.pane}`, back: true }, ...found] : found;
  }

  choose(item) {
    if (!item) return;
    closeOverlay(props().overlay);
    // The pane this leaves, for the next open's Back row. Only jumps from here are seen: a click elsewhere isn't.
    const from = focused()?.pane;
    if (from && item.p.pane !== from) setShared("t3-picker.back", from);
    run("pane.focus", { pane: item.p.pane });
  }

  // A virtual list's rows can't hold handlers: clicks come by key to on_item_click, hover is style alone.
  row(item, i, ps) {
    const t = theme(), on = this.at === i, s = item.s, st = item.status;
    // The same marks as the pane headers, tabs and agents list.
    const mark = st === "working" ? svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)
      : st === "blocked" ? div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(11).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!")
      : st === "done" && !settled(item.p) ? div().size(7).flex_none().rounded_full().bg(t.done) : null;
    return h_flex().id(item.key).w_full().h(ROW).px(8).gap(8).rounded(6).items_center().flex_none()
      .role("button").accessibility_label(item.back ? `Back to ${item.label}` : item.label)
      .when(on, (el) => el.bg(t.selected))
      .when(!on, (el) => el.hover((style) => style.bg(t.foreground + "0a")))
      .child(h_flex().size(16).flex_none().items_center().justify_center().child(projectMark(s, 16, t, ps)))
      .child(v_flex().flex_1().min_w(0)
        .child(div().truncate().text_color(t.foreground).when(Boolean(item.here), (d) => d.font_medium()).child(item.label))
        .child(h_flex().min_w(0).gap(4).items_center().text_size(11.5).text_color(t.dim)
          .child(icon(t, item.program))
          .child(div().flex_none().text_color(t.muted).child(item.program?.name ?? "Terminal"))
          .child(div().flex_none().child("·"))
          // As T3 marks a remote thread: a server icon, then the name.
          .when(Boolean(s.machine), (el) => el
            .child(svg("mods/t3-inbox/server.svg").size(12).flex_none().text_color(t.muted))
            .child(div().flex_none().text_color(t.muted).child(`${s.machine} ·`)))
          .child(div().min_w(0).truncate().child(s.name + (item.team ? ` · +${item.team}` : "")))))
      .when(Boolean(mark), (el) => el.child(mark))
      .when(Boolean(item.back), (el) => el.child(div().flex_none().text_size(12).font_medium().text_color(t.muted).child("↩ Back")));
  }

  render() {
    const t = theme(), ps = panes(), items = this.items();
    // Opens on Back, else where you are.
    if (this.at === null) { this.at = Math.max(0, items.findIndex((r) => r.back || r.here)); this.scroll.scroll_to_item(this.at); }
    this.at = Math.min(this.at, Math.max(0, items.length - 1));
    const key = (label) => div().flex_none().px(5).py(1).rounded(4).bg(t.foreground + "14").text_color(t.foreground).child(label);
    const hint = (label, what) => h_flex().gap(6).items_center().child(key(label)).child(what);
    return v_flex().id("picker").size_full().min_h(0).bg(t.popover).text_size(13)
      .opacity(this.shown ? 1 : 0).transition("opacity", { duration: 200, easing: "ease-in-out" })
      .on_key_down((e, cx) => {
        if (e.key === "escape") return closeOverlay(props().overlay);
        if (e.key === "down" || e.key === "up") {
          if (!items.length) return;
          this.at = (this.at + (e.key === "down" ? 1 : items.length - 1)) % items.length;
          this.scroll.scroll_to_item(this.at);
        } else if (e.key === "d" && e.modifiers.control && items[this.at]) {
          closeOverlay(props().overlay);
          // The tab bar's close, which asks first while a program runs; a tab's last pane closes the tab.
          return run(`t3-tabs.close-pane:${items[this.at].p.pane}`);
        } else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(h_flex().h(34).my(6).flex_none().px(16).gap(8).items_center()
        .child(svg("mods/t3-inbox/search.svg").size(16).flex_none().text_color(t.dim))
        .child(Input.new(this.input).flex_1().h_full().text_size(13).text_color(t.foreground)))
      // No heading: there is one kind of row, and the room goes to the list.
      .child(div().flex_none().mt(8).mb(8).px(8)
        .when(items.length > 0, (el) => el.h(Math.min(items.length, SHOWN) * ROW).child(v_virtual_list("picker-rows", items.length, ROW, (i) => items[i]?.key ?? String(i),
          (range) => items.slice(range.start, range.end).map((item, k) => this.row(item, range.start + k, ps)))
          .track_scroll(this.scroll).size_full()
          .on_item_click((id) => this.choose(this.items().find((item) => item.key === id)))))
        .when(items.length === 0, (el) => el.child(div().px(8).py(6).text_color(t.dim).child("No matching terminals."))))
      .child(h_flex().flex_none().px(16).py(10).gap(12).items_center().justify_between().bg(t.foreground + "06").text_size(12).font_medium().text_color(t.muted)
        .child(h_flex().gap(12).items_center()
          .child(hint("↑ ↓", "Navigate"))
          .child(hint("Enter", "Go"))
          .child(hint(window()?.platform === "macos" ? "⌃D" : "Ctrl+D", "Close pane"))
          .child(hint("Esc", "Close")))
        // New work goes through New, which picks the space (and for a new space, the machine).
        .child(h_flex().id("picker-new").gap(6).px(6).py(2).mr(-6).rounded(6).items_center().flex_none()
          .role("button").accessibility_label("New tab").hover((s) => s.bg(t.selected))
          .on_click(() => { closeOverlay(props().overlay); run("mod.open", { name: "t3-new-menu" }); })
          .child(svg("mods/t3-picker/square-pen.svg").size(14).text_color(t.muted))
          .child("New tab")));
  }
}
