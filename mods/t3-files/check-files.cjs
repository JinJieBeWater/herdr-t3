// The Files page's logic outside Herdr: git's answers, ignored marks, the tree's rows, the search, sorting, file kinds, the
// icons' order and files, and the shell scripts it runs, for real, in a throwaway repo.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

const load = (file) => fs.readFileSync(path.join(__dirname, file), "utf8")
  .replace(/^import [^;]*;\r?\n/gm, "").replace(/^export (async function|function|const) /gm, "$1 ").replace(/^export \{[\s\S]*?\};?\s*$/m, "");
const context = vm.createContext({});
vm.runInContext([load("vendor/ufuzzy.js"), load("file-icons-data.js"), load("file-icons.js"), load("file-tree.js"), load("model.js"),
  "globalThis.m = { join, uFuzzy, fileIcon, folderIcon, FILE_NAMES, FILE_EXTENSIONS, FOLDER_NAMES, LIST, IGNORED, PROBE, REMOTE_SEARCH, RANKED, ancestors, naturalCompare, sortEntries, parseListing, parseStatus, parseIgnored, markIgnored, folderEntries, treeRows, terms, narrows, filterPaths, rank, kindOf, languageOf, readProblem, failedRead, ticket };"].join("\n"), context);
const m = context.m;
const plain = (v) => JSON.parse(JSON.stringify(v));

(async () => {
  // Natural order, folders first.
  assert.deepEqual(plain(["file10", "File2", "b", "file1", "A", "file02"].sort(m.naturalCompare)), ["A", "b", "file1", "File2", "file02", "file10"]);
  assert.deepEqual(plain(m.sortEntries([{ name: "z", dir: false }, { name: "a10", dir: false }, { name: "a9", dir: false }, { name: "y", dir: true }])).map((e) => e.name), ["y", "a9", "a10", "z"]);
  const many = Array.from({ length: 20000 }, (_, i) => ({ name: `file-${(i * 7919) % 20000}.js`, dir: false }));
  const began = Date.now();
  const sorted = m.sortEntries(many);
  assert.ok(Date.now() - began < 300, "20k entries sort fast (Herdr interrupts a long run)");
  assert.equal(sorted[2].name, "file-2.js");
  assert.deepEqual(plain(m.parseListing("f\0b.txt\0d\0src\0f\0a b.md\0")), [{ name: "src", dir: true }, { name: "a b.md", dir: false }, { name: "b.txt", dir: false }]);
  assert.deepEqual(plain(m.ancestors("a/b/c.js")), ["a", "a/b"]);
  assert.deepEqual([m.join("", "a"), m.join("a", ""), m.join("/r/", "a"), m.join("/", "a")], ["a", "a", "/r/a", "/a"]);

  // Porcelain v2: ordinary, renamed (its origin follows), conflicted, untracked; a path with spaces; outside the folder left out.
  const status = [
    "# branch.oid abc", "1 .M N... 100644 100644 100644 h1 h2 sub/src/a b.js", "1 A. N... 000000 100644 100644 h0 h1 sub/new.js",
    "1 .D N... 100644 100644 000000 h1 h1 sub/gone/x.js", "1 MD N... 100644 100644 000000 h1 h2 sub/md.js",
    "2 R. N... 100644 100644 100644 h1 h1 R100 sub/to.js", "sub/from.js", "u UU N... 100644 100644 100644 100644 h1 h2 h3 sub/conf.txt",
    "? sub/untracked dir/f.txt", "1 .M N... 100644 100644 100644 h1 h2 other/z.js", "",
  ].join("\0");
  const s = m.parseStatus(status, "sub/");
  assert.deepEqual(Object.fromEntries(s.marks), { "src/a b.js": "M", "new.js": "A", "gone/x.js": "D", "md.js": "D", "to.js": "R", "conf.txt": "M", "untracked dir/f.txt": "A" });
  assert.deepEqual(plain([...s.dirs].sort()), ["gone", "src", "untracked dir"]);
  assert.equal(m.parseStatus(status, "").marks.get("other/z.js"), "M", "no prefix: the whole repo");
  assert.equal(m.parseStatus(status, "").marks.has("sub/from.js"), false, "a rename's origin isn't a change of its own");

  // Ignored: what Git names now, the rest cleared; the tree dims all under an ignored folder, and shows a deleted file.
  const ignored = new Set(["dist", "old.log"]);
  m.markIgnored(ignored, "", [{ name: "dist", dir: true }, { name: "old.log", dir: false }, { name: "src", dir: true }], m.parseIgnored("dist/\0"));
  assert.deepEqual(plain([...ignored]), ["dist"]);
  const tree = { entries: new Map([["", [{ name: "dist", dir: true }, { name: "src", dir: true }, { name: "a.md", dir: false }]], ["dist", [{ name: "x.js", dir: false }]], ["src", [{ name: "b.js", dir: false }]]]),
    expanded: new Set(["dist", "src"]), ignored, marks: new Map([["src/c.js", "D"], ["src/b.js", "M"]]) };
  const rows = (st) => m.treeRows(m.folderEntries(st), (p) => st.expanded.has(p));
  assert.deepEqual(plain(rows(tree)).map((r) => [r.path, r.depth, r.ignored, r.gone]),
    [["dist", 0, true, false], ["dist/x.js", 1, true, false], ["src", 0, false, false], ["src/b.js", 1, false, false], ["src/c.js", 1, false, true], ["a.md", 0, false, false]]);
  tree.expanded.delete("src");
  assert.equal(rows(tree).some((r) => r.path.startsWith("src/")), false, "a closed folder's rows go");
  // A folder holding just a folder is one row with it once open, ignored as its last folder is.
  const chain = { entries: new Map([["", [{ name: "a", dir: true }]], ["a", [{ name: "b", dir: true }]], ["a/b", [{ name: "c.js", dir: false }]]]),
    expanded: new Set(["a", "a/b"]), ignored: new Set(["a/b"]), marks: new Map() };
  assert.deepEqual(plain(rows(chain)).map((r) => [r.path, r.name, r.ignored]), [["a/b", "a / b", true], ["a/b/c.js", "c.js", true]]);

  // Search: every term, case aside; a longer query starts from the last one's matches; it pauses every 5000, and stops
  // when a newer query comes.
  assert.deepEqual(plain(m.terms("  Review  DIFF ")), ["review", "diff"]);
  assert.equal(m.narrows("review d", "review"), true);
  assert.equal(m.narrows("revie", "review"), false);
  const paths = Array.from({ length: 12000 }, (_, i) => `packages/pkg-${i % 7}/src/Component-${i}.tsx`), lower = paths.map((p) => p.toLowerCase());
  let pauses = 0;
  const pause = async () => { pauses++; };
  const all = await m.filterPaths(lower, m.terms("PKG-3 component-1"), null, pause);
  assert.equal(pauses, 2, "12000 paths: two pauses");
  assert.ok(all.length > 0 && all.every((i) => paths[i].includes("pkg-3") && paths[i].includes("Component-1")));
  const narrower = await m.filterPaths(lower, m.terms("pkg-3 component-11"), all, pause);
  assert.deepEqual(plain(narrower), plain(await m.filterPaths(lower, m.terms("pkg-3 component-11"), null, pause)), "from the last matches, the same as from all");
  let calls = 0;
  assert.equal(await m.filterPaths(lower, ["src"], null, pause, () => ++calls < 1), null, "a newer query stops it");

  // Ranking: uFuzzy's best first with the letters it matched; what it can't match (terms out of order) after; at most `limit`.
  const uf = new m.uFuzzy();
  const ranked = plain(m.rank(uf, ["docs/review/notes.md", "extras/mods/review/diff.js", "diff/review.js"], "review diff", 10));
  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].path, "extras/mods/review/diff.js");
  assert.deepEqual(ranked[0].ranges.map(([a, b]) => "extras/mods/review/diff.js".slice(a, b)).join("|"), "review|diff");
  assert.deepEqual(ranked.find((r) => r.path === "diff/review.js").ranges, [], "out of order: kept, unmarked");
  assert.equal(m.rank(uf, paths.slice(0, 50), "src", 20).length, 20);

  // Kinds and the Editor's languages.
  assert.equal(m.kindOf("a/Logo.PNG"), "image");
  assert.equal(m.kindOf("README.md"), "markdown");
  assert.equal(m.kindOf("Makefile"), "text");
  for (const [name, lang] of [["a.tsx", "js"], ["a.jsonc", "json"], ["a.yml", "yaml"], ["a.rs", "rust"], ["Makefile", "makefile"], ["GNUmakefile", "makefile"], ["a.hpp", "cpp"], ["a.toml", undefined], ["a.md", undefined], ["Dockerfile", undefined]])
    assert.equal(m.languageOf(name), lang, name);
  assert.match(m.readProblem(new Error("Text file exceeds 1 MiB")), /larger than 1 MB/);
  assert.deepEqual([m.failedRead("This file can't be read."), m.failedRead("This image can't be read."), m.failedRead("This is a binary file, so there's no text to show."), m.failedRead("This file was deleted.")], [true, true, false, false], "a failed read is retried from the error bar; what a file is, said on the page");
  assert.match(m.readProblem("stream did not contain valid UTF-8"), /binary/);
  assert.match(m.readProblem("Is a directory (os error 21)"), /can't be read/);

  // A newer request of the same kind makes the older one's answer stale; another kind's doesn't.
  const st = {};
  const first = m.ticket(st, "file"), list = m.ticket(st, "list:"), second = m.ticket(st, "file");
  assert.equal(first(), false);
  assert.equal(second(), true);
  assert.equal(list(), true);

  // Icons, in VS Code's order: the name with its folder, the name, the longest extension, the plain file; case aside.
  assert.equal(m.fileIcon("index.D.ts"), "icons/cat/typescript-def.svg");
  assert.equal(m.fileIcon("src/app.ts"), "icons/cat/typescript.svg", "a path: its name");
  assert.equal(m.fileIcon("PACKAGE.json"), `icons/cat/${m.FILE_NAMES["package.json"]}.svg`);
  assert.equal(m.fileIcon("ci.yml", ".github/workflows/ci.yml"), `icons/cat/${m.FILE_EXTENSIONS["workflows/yml"]}.svg`);
  assert.notEqual(m.FILE_EXTENSIONS["workflows/yml"], m.FILE_EXTENSIONS.yml);
  assert.equal(m.fileIcon("no-such.thing"), "icons/cat/_file.svg");
  assert.equal(m.fileIcon("constructor"), "icons/cat/_file.svg", "not Object's");
  assert.equal(m.folderIcon("packages/cli/SRC", true), "icons/cat/folder_src_open.svg");
  assert.equal(m.folderIcon("whatever"), "icons/cat/_folder.svg");
  // Every icon the data names is in this mod's icons/cat: a missing one draws nothing.
  const names = new Set(["_file", "_folder", "_folder_open", ...Object.values(m.FILE_NAMES), ...Object.values(m.FILE_EXTENSIONS), ...Object.values(m.FOLDER_NAMES).flatMap((f) => [f, `${f}_open`])]);
  for (const n of names) assert.ok(fs.existsSync(path.join(__dirname, "icons/cat", `${n}.svg`)), `icons/cat/${n}.svg`);

  // The shell scripts, run: listing, ignored, the remote probe and search, in a repo with awkward names.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t3-files-check-"));
  try {
    const sh = (script, args, cwd = dir) => execFileSync("sh", ["-c", script, "t3-files", ...args], { cwd, encoding: "latin1", stdio: ["ignore", "pipe", "ignore"] });
    const git = (...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir });
    git("init", "-q");
    fs.mkdirSync(path.join(dir, "src/deep"), { recursive: true });
    fs.mkdirSync(path.join(dir, "node_modules/pkg"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules/\n*.log\n");
    fs.writeFileSync(path.join(dir, "src/Read Me.md"), "# hi\n");
    fs.writeFileSync(path.join(dir, "src/deep/Main.TS"), "x\n");
    fs.writeFileSync(path.join(dir, ".env"), "A=1\n");
    fs.writeFileSync(path.join(dir, "app.log"), "log\n");
    fs.writeFileSync(path.join(dir, "node_modules/pkg/i.js"), "\n");
    fs.writeFileSync(path.join(dir, "bin.dat"), Buffer.from([1, 0, 2, 3]));
    git("add", "-A");
    git("commit", "-qm", "x");
    assert.deepEqual(plain(m.parseListing(sh(m.LIST, [dir]))).map((e) => `${e.dir ? "d" : "f"}:${e.name}`),
      ["d:node_modules", "d:src", "f:.env", "f:.gitignore", "f:app.log", "f:bin.dat"], ".git left out, dotfiles in");
    assert.throws(() => sh(m.LIST, [path.join(dir, "nope")]), "a folder that's gone fails");
    assert.deepEqual(plain([...m.parseIgnored(sh(m.IGNORED, [dir, ""]))].sort()), ["app.log", "node_modules"]);
    assert.deepEqual(plain([...m.parseIgnored(sh(m.IGNORED, [path.join(dir, "src"), "src/"]))]), [], "nothing ignored: no failure");
    assert.equal(sh(m.PROBE, [path.join(dir, "bin.dat")]).trim(), "4 1");
    assert.equal(sh(m.PROBE, [path.join(dir, "src/Read Me.md")]).trim(), "5 0");
    assert.throws(() => sh(m.PROBE, [path.join(dir, "nope")]));
    const search = (q) => sh(m.REMOTE_SEARCH, [q]).split("\n").filter(Boolean).sort();
    assert.deepEqual(search("main src"), ["src/deep/Main.TS"]);
    assert.deepEqual(search("read me"), ["src/Read Me.md"]);
    assert.deepEqual(search("'\\\"$(x)"), [], "the query is data");
    assert.deepEqual(search("pkg"), [], "ignored files aren't searched");
    fs.rmSync(path.join(dir, ".git"), { recursive: true });
    assert.deepEqual(search("pkg"), ["node_modules/pkg/i.js"], "outside Git: find");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  console.log("t3-files checks passed");
})().catch((e) => { console.error(e); process.exit(1); });
