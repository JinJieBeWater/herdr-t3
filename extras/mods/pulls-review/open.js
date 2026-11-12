// Where a review opens, and opening it: `open` in this folder's config.json picks the fork's daemon (in a Herdr pane, the
// installed app or the browser) or the official CLI.

import { spaces, exec, hc, window, notify, closeOverlay, shared, setShared, appHome, readTextFile } from "herdr";
import { reviewLocation } from "./bar.js";
import { argPage, changedFiles, git } from "./review-git.js";
import { showPage } from "./panel.js";

// `open` in this folder's config.json, which the person creates; none means "herdr" (see mods/README.md):
// "herdr":    the fork's daemon, drawn in the review page of the window's panel (the review mod).
// "pwa":      the fork's `jin.review -d --pwa`, in the installed jin.review app.
// "browser":  the fork's `jin.review -d`, one background server for every repo, in the browser.
// "official": the `pulls.review` CLI. Each worktree gets its own server, kept running by herdr-core.
const MODES = ["herdr", "pwa", "browser", "official"];
const LABEL = "pulls-review.root";
const PANE = "review";

async function readMode() {
  const text = await readTextFile(`${appHome()}/mods/pulls-review/config.json`).catch(() => null);
  let open;
  try { open = text ? JSON.parse(text).open : "herdr"; } catch { throw new Error("mods/pulls-review/config.json isn't valid JSON."); }
  if (!MODES.includes(open)) throw new Error(`"open" in mods/pulls-review/config.json is one of ${MODES.join(", ")}.`);
  return open;
}

async function cli(command, args, options) {
  try { return await exec(command, args, options); }
  catch { throw new Error(`${command} isn't installed. See mods/README.md in github.com/JinJieBeWater/pulls.review.`); }
}

async function core([command, ...args]) {
  const r = await hc([command, "--json", ...args]);
  if (r.code !== 0) throw new Error(r.stderr.trim() || `hc ${command} failed`);
  return JSON.parse(r.stdout);
}

// The page the CLI opens for `args` (its pageFor), for a server that is already running.
async function pageFor(root, args) {
  if (args[0]) return argPage(args);
  const [head, base] = await Promise.all([git(root, ["symbolic-ref", "--short", "-q", "HEAD"]),
    git(root, ["symbolic-ref", "--short", "-q", "refs/remotes/origin/HEAD"])]);
  const branch = head.stdout.trim(), main = base.stdout.trim().replace(/^origin\//, "");
  // shortcut: without origin/HEAD, main and master count as the default branch even if absent; read the CLI's resolveDefaultBranch if that matters.
  return branch && branch !== main && (main || !["main", "master"].includes(branch)) ? argPage([], branch) : "/";
}

async function openUrl(url) {
  const platform = window()?.platform;
  const [command, args] = platform === "macos" ? ["open", [url]]
    : platform === "windows" ? ["rundll32", ["url.dll,FileProtocolHandler", url]] : ["xdg-open", [url]];
  const r = await exec(command, args);
  if (r.code !== 0) throw new Error(`Could not open ${url}`);
}

// The official CLI is a foreground server: herdr-core keeps one per worktree, found again by its label.
async function official(root, args, page) {
  const label = `${LABEL}=${root}`;
  const [live] = (await core(["ls", "--label", label])).terminals;
  if (!live) {
    await cli("pulls.review", ["--help"]);
    await core(["run", "--bg", "--no-parent", "--rm", "--cwd", root, "--label", label, "--", "pulls.review", ...args]);
    return; // The CLI opens its first page itself, signed in; the browser keeps the sign-in.
  }
  const { text } = await core(["read", live.address, "--lines", "5000"]);
  const origin = /pulls\.review is serving (http:\/\/[^/\s]+)/.exec(text)?.[1];
  if (!origin) throw new Error(`pulls.review is still starting. Its output: hc read ${live.address}`);
  await openUrl(origin + (page ?? await pageFor(root, args)));
}

// A space's review is the `review` page of the window's one panel (docs/adr/0011): the request names the space, and the
// panel shows that page. `analyze` reaches the review with the request.
function herdr(root, page, analyze, space) {
  // The space changed while this read: its review would land in the new space's.
  if (activeSpace() !== space) return;
  if (page === "/") throw new Error("Nothing to review on the default branch: pick a diff in the Review bar.");
  // The review takes only a number past the last it handled: past the last sent, as its own switch's, though the clock go back.
  setShared(PANE, { space, root, page, n: Math.max(Date.now(), (shared(PANE)?.n ?? 0) + 1), analyze: Boolean(analyze) });
  if (!showPage(PANE)) throw new Error("This layout's panel has no review page: add the review block to its panel-body stack.");
}

// Opens a review: `{ root, args, page, analyze }` from the Review bar for one diff (analyzed by AI in the fork), its menu's
// `overlay` closed when done; else the focused pane's worktree: its uncommitted changes when there are any, else what
// pulls.review opens by default.
const activeSpace = () => spaces().find(s => s.active)?.id;

export async function launch(input) {
  const fail = (body) => notify({ title: "pulls.review", body, level: "error" }), space = activeSpace();
  try {
    let { root } = input;
    if (!root) {
      const { cwd, on } = reviewLocation();
      // The servers listen on this machine's loopback only.
      if (on) return fail(`Only local folders, not ${on}.`);
      if (!cwd) return fail("No folder for the focused pane.");
      const top = await git(cwd, ["rev-parse", "--show-toplevel"]);
      if (top.code !== 0) return fail("Not a git repository.");
      root = top.stdout.trim();
    }
    const status = input.args ? "" : (await git(root, ["status", "--porcelain"])).stdout;
    const args = input.args ?? (await changedFiles(root, status.split("\n").filter(Boolean).length) ? ["--worktree"] : []);
    const mode = await readMode();
    if (mode === "official") return await official(root, args, input.page);
    // The pane starts the analysis itself, and only with its Analyze automatically setting on, as the app never does unasked.
    if (mode === "herdr") return herdr(root, input.page ?? await pageFor(root, args), input.analyze, space);
    // `--analyze` starts the AI analysis, or follows the one running; the official CLI has no such flag.
    const r = await cli("jin.review", ["-d", ...(mode === "pwa" ? ["--pwa"] : []), ...(input.analyze ? ["--analyze"] : []), ...args], { cwd: root });
    if (r.code !== 0) fail((r.stderr || r.stdout).trim() || `exit ${r.code}`);
  } catch (error) { fail(error?.message ?? String(error)); }
  finally { if (input.overlay) closeOverlay(input.overlay); }
}
