// The demo's stagehand, in a 0px block: opens what only a click opens, the way that click does.
// `herdr-app do demo-stage.actions-menu:<x>` drops the Actions menu from the bar at x (window px);
// `demo-stage.actions-last:<id>` makes that the action the bar's button runs, as running it does.
import { View, div } from "gpui-kit";
import { nextCommand, openOverlay, setShared, settings, shared } from "herdr";

export default class Stage extends View {
  init(_props, cx) {
    cx.spawn(async () => {
      for (;;) {
        const [name, arg] = (await nextCommand()).split(":");
        const n = shared("t3-actions")?.list.length ?? 0;
        if (name === "actions-menu") openOverlay({ mod: "t3-actions", kind: "popup", at: { x: Number(arg) - 8, y: 36 * (Number(settings().zoom) || 1) },
          width: 280, height: Math.min(420, 45 + n * 28), props: { actions: "menu" } });
        if (name === "actions-last") setShared("t3-actions", { ...shared("t3-actions"), last: arg });
      }
    });
  }

  render() {
    return div();
  }
}
