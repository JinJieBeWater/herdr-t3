// Preloaded by check.sh into every mod check: while a mod's render() runs, the cx it was given refuses what Herdr refuses
// there (gpui-kit.d.ts: notify, new, focus_handle; InputState.new), so a check fails where Herdr would keep the view's last
// frame and show "This view could not be re-rendered". A check's fake cx doesn't know it's drawing; this does.
// It finds each mod as the checks load it: a bundle run in a vm context that sets `Mod`.
const vm = require("node:vm");

function guard(ctx) {
  const Mod = ctx?.Mod;
  if (typeof Mod !== "function" || Mod.prototype.__renderGuard) return;
  const render = Mod.prototype.render;
  Mod.prototype.__renderGuard = true;
  Mod.prototype.render = function (cx, ...rest) {
    if (!cx || typeof cx !== "object") return render.call(this, cx, ...rest);
    const refuse = (what) => () => { throw new Error(`${what} is not allowed during the 'render' phase`); };
    const saved = {};
    for (const k of ["notify", "new", "focus_handle"]) if (typeof cx[k] === "function") { saved[k] = cx[k]; cx[k] = refuse(`cx.${k}()`); }
    const input = ctx.InputState, inputNew = input?.new;
    if (inputNew) input.new = refuse("InputState.new()");
    try { return render.call(this, cx, ...rest); } finally { Object.assign(cx, saved); if (inputNew) input.new = inputNew; }
  };
}

for (const name of ["runInContext", "runInNewContext"]) {
  const run = vm[name];
  vm[name] = function (code, ctx, ...rest) {
    const result = run.call(this, code, ctx, ...rest);
    guard(ctx);
    return result;
  };
}
