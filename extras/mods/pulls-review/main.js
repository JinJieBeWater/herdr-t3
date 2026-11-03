// Opens the focused pane's worktree in pulls.review: its uncommitted changes when there are
// any, else what pulls.review opens by default. Bound in keys.json as `mod.open:pulls-review`;
// t3-tabs' Review bar opens it with `{ cwd, args, analyze }` for one diff, analyzed by AI in the fork.

import { View, div } from "gpui-kit";
import { spaces, panes, focused, exec, hc, window, notify, props, closeOverlay } from "herdr";

// Which pulls.review you installed (see the README):
// "official": the `pulls.review` CLI. Each worktree gets its own server, kept running by herdr-core.
// "daemon":   the fork's `jin.review -d`, one background server for every repo, in the browser.
// "pwa":      the fork's `jin.review -d --pwa`, in the installed jin.review app.
const MODE = "official";
const COMMAND = MODE === "official" ? "pulls.review" : "jin.review";
const LABEL = "pulls-review.root";

// Same lookup as the shipped `changes` mod.
function location() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}

// Reads that write nothing under .git, as the shipped changes mod reads.
const git = (cwd, args) => exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", ...args], { cwd });
const browserPath = page => encodeURI(page).replaceAll("#", "%23");

async function cli(args, options) {
  try { return await exec(COMMAND, args, options); }
  catch { throw new Error(`${COMMAND} isn't installed. See the pulls.review section of the herdr-t3 README.`); }
}

async function core([command, ...args]) {
  const r = await hc([command, "--json", ...args]);
  if (r.code !== 0) throw new Error(r.stderr.trim() || `hc ${command} failed`);
  return JSON.parse(r.stdout);
}

// The page the CLI opens for `args` (its pageFor), for a server that is already running.
async function pageFor(root, args) {
  if (args[0] === "--worktree") return "/worktree";
  if (args[0]) return browserPath(`/compare/${args[0]}`);
  const [head, base] = await Promise.all([git(root, ["symbolic-ref", "--short", "-q", "HEAD"]),
    git(root, ["symbolic-ref", "--short", "-q", "refs/remotes/origin/HEAD"])]);
  const branch = head.stdout.trim(), main = base.stdout.trim().replace(/^origin\//, "");
  // shortcut: without origin/HEAD, main and master count as the default branch even if absent; read the CLI's resolveDefaultBranch if that matters.
  return branch && branch !== main && (main || !["main", "master"].includes(branch)) ? browserPath(`/branch/${branch}`) : "/";
}

async function openUrl(url) {
  const platform = window()?.platform;
  const [command, args] = platform === "macos" ? ["open", [url]]
    : platform === "windows" ? ["rundll32", ["url.dll,FileProtocolHandler", url]] : ["xdg-open", [url]];
  const r = await exec(command, args);
  if (r.code !== 0) throw new Error(`Could not open ${url}`);
}

// The official CLI is a foreground server: herdr-core keeps one per worktree, found again by its label.
async function official(root, args) {
  const label = `${LABEL}=${root}`;
  const [live] = (await core(["ls", "--label", label])).terminals;
  if (!live) {
    await cli(["--help"]);
    await core(["run", "--bg", "--no-parent", "--rm", "--cwd", root, "--label", label, "--", COMMAND, ...args]);
    return; // The CLI opens its first page itself, signed in; the browser keeps the sign-in.
  }
  const { text } = await core(["read", live.address, "--lines", "5000"]);
  const origin = /pulls\.review is serving (http:\/\/[^/\s]+)/.exec(text)?.[1];
  if (!origin) throw new Error(`pulls.review is still starting. Its output: hc read ${live.address}`);
  await openUrl(origin + await pageFor(root, args));
}

export default class PullsReview extends View {
  init(_props, cx) {
    const input = props() ?? {};
    const { cwd, on } = input.cwd ? input : location();
    const fail = (body) => notify({ title: "pulls.review", body, level: "error" });
    cx.spawn(async () => {
      try {
        // The servers listen on this machine's loopback only.
        if (on) return fail(`Only local folders, not ${on}.`);
        if (!cwd) return fail("No folder for the focused pane.");
        const top = await git(cwd, ["rev-parse", "--show-toplevel"]);
        if (top.code !== 0) return fail("Not a git repository.");
        const root = top.stdout.trim();
        const args = input.args ?? ((await git(root, ["status", "--porcelain"])).stdout.trim() ? ["--worktree"] : []);
        if (MODE === "official") return await official(root, args);
        // `--analyze` starts the AI analysis, or follows the one running; the official CLI has no such flag.
        const r = await cli(["-d", ...(MODE === "pwa" ? ["--pwa"] : []), ...(input.analyze ? ["--analyze"] : []), ...args], { cwd: root });
        if (r.code !== 0) fail((r.stderr || r.stdout).trim() || `exit ${r.code}`);
      } catch (error) { fail(error?.message ?? String(error)); }
      finally { closeOverlay(input.overlay); }
    });
  }

  // Nothing to see: the overlay only carries the work, and closes itself when it's done.
  render() {
    return div();
  }
}
