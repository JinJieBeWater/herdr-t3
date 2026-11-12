// The demo's stagehand, in a 0px block: opens what only a click opens, the way that click does.
// `herdr-app do demo-stage.actions-menu:<x>` drops the Actions menu from the bar at x (window px);
// `demo-stage.actions-last:<id>` makes that the action the bar's button runs, as running it does.
// `demo-stage.setting:<key>=<value>` picks that in the layout's settings, as its dialog (t3-chrome/settings.js) does.
// `demo-stage.menu:{"at":{"x":…,"y":…},"tab":…,"target":…}` opens a right-click menu there, as openMenu (shared/menu.js) does at the pointer.
import { View, div } from "gpui-kit";
import { nextCommand, openOverlay, run, setShared, settings, shared } from "herdr";

export default class Stage extends View {
  init(_props, cx) {
    cx.spawn(async () => {
      for (;;) {
        const command = await nextCommand(), cut = command.indexOf(":");
        const [name, arg] = cut < 0 ? [command, ""] : [command.slice(0, cut), command.slice(cut + 1)];
        const n = shared("t3-actions")?.list.length ?? 0;
        if (name === "actions-menu") openOverlay({ mod: "t3-actions", kind: "popup", at: { x: Number(arg) - 8, y: 36 * (Number(settings().zoom) || 1) },
          width: 280, height: Math.min(420, 45 + n * 28), props: { actions: "menu" } });
        if (name === "menu") { const { at, ...p } = JSON.parse(arg); openOverlay({ mod: "t3-menu", kind: "popup", width: 220, height: 260, at, props: p }); }
        if (name === "actions-last") setShared("t3-actions", { ...shared("t3-actions"), last: arg });
        if (name === "setting") {
          const [key, value] = arg.split("=");
          setShared("t3.settings", { ...shared("t3.settings"), [key]: value });
          if (key === "homeMod") run("t3-tabs.home-mod");
        }
      }
    });
  }

  render() {
    return div();
  }
}
