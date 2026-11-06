// Home's default page: where putting the agent in view away lands, with nothing to look at but the keys for what's next.
// t3-tabs owns the place itself (a space of its own); this is only what it shows until someone arranges something else there.
import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme } from "herdr";
import { keyOf } from "./tip.js";

const HINTS = [["t3-chrome.next", "Next agent"], ["mod.open:t3-picker", "Go to"], ["space.new", "New space"]];

export default class Home extends View {
  render() {
    const t = theme();
    return v_flex().size_full().items_center().justify_center().gap(10).text_size(12).font_medium().text_color(t.muted)
      .children(HINTS.map(([action, word]) => [keyOf(action), word]).filter(([key]) => key).map(([key, word]) => h_flex().w(144).gap(8).items_center().justify_between()
        .child(word)
        .child(div().flex_none().px(5).py(1).rounded(4).bg(t.foreground + "14").text_color(t.foreground).child(key))));
  }
}
