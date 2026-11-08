# herdr-t3 代码质量审查（角度 D）

按 ponytail-review 的标准审整个代码库，严格只读。验证手段：跑了 `scripts/check.sh`（`all checks passed`，3 秒）；对 14 个 mod 跑了 `tsc`；在仓库的临时副本上做了约 20 次有效变异（用 perl 改坏一行，看测试红不红；副本已删），没碰仓库。

**假设的负载**：一个人、本机 1~几个窗口、可能连几台远程机器、同时几十个 agent、几十个 space。

**这套代码做了什么**：一组 Herdr App 的 mod，把侧栏、标签栏、窗格头、跳转面板、新建菜单、Home 页做成 T3 Code 的样子；`shared/` 是被 `sync.sh` 复制进各 mod 的共享源；`extras/` 是 Review 扩展。

## 做得好、不该动的

- `shared/` 加 `check.sh` 的 `cmp` 比对：我核对过，`sync.sh` 的复制清单和各 mod 实际 `import "./x.js"` 一一对应，没有漏复制或多复制。
- 测试很扎实：约 20 次有效变异里约 14 次被抓。关闭标签的 Home 保护、Settle 的忙碌保护、`atPrompt`、Inbox 的 Working 宽限、自定义 Snooze 解析、拖动 `slot`/`dest` 的算术、`--no-optional-locks` 都能让测试变红。没被抓的 6 次里，4 次是真缺口（见 #2），另 2 次（`fairCap` 的比较、`kidStatus` 把 done 当 idle）我没能确认是测试盲区还是等价改动，所以没报。
- t3-spaces 的 git 探测做得稳：每台机器串行探测（一台挂住只堵自己）、`watch` 用 token 防旧循环、只有 git 自己说"不是仓库"才记成非仓库（见下 #2）。
- `update.sh` 的"先验证再改动"和 `check-update.sh` 用临时目录回放，这个套路很好。
- Settle 在 `t3-tabs/main.js:187-247`（侧栏隐藏时）和 `t3-inbox/actions.js:44-72` 各有一份实现，看上去是重复，但 ADR 0002/0003 要求两种模式规则一致，且 `check-sidebar.cjs` 有"两种模式都测"的用例。**不要为了去重去合并它们**，除非先改 ADR。

## 必须修

没有。没找到在预期负载下会出错或丢数据的 bug。下面最重的是 #4（开发脚本里的 `rm -rf` 护栏有洞），但它要先设错 `DEMO` 才会触发，所以放在"应该修"。

## 应该修

1. **类型检查没有接进 `check.sh`**（`scripts/check.sh`）
   - **是什么：** 每个 mod 都带 `jsconfig.json`（`checkJs: true`），编辑器里能看到类型错误。
   - **问题：** `check.sh` 只跑 `herdr-app check` 和 fake-herdr 测试，不跑 `tsc`。我实测 `bunx -p typescript tsc -p mods/<mod>/jsconfig.json --noEmit`：14 个 mod 全部干净，只有 `mods/t3-tabs/main.js:34` 一处 TS2810（`resolve()` 没传参）。我在副本里加了 `nonexistentFn(this.foo.bar)`，`tsc` 立刻报两个错，`herdr-app check` 报不出来。没被测试走到的分支里的拼错变量名、拼错属性，现在只能靠运行时才发现。14 个 mod 总共约 1 秒。
   - **最小修法：** 在 `check.sh` 的 `herdr-app check` 循环里加一行 `[ ! -f "$d/jsconfig.json" ] || bunx -p typescript tsc -p "$d/jsconfig.json" --noEmit | grep -v gpui-kit.d.ts`。`jsconfig.json` 和 `gpui-kit.d.ts` 是 gitignored、由 gpui-shell 生成的，全新克隆里没有，所以要"有才跑"。同时把 `t3-tabs/main.js:34` 改成 `resolve(undefined)`。
   - **不修的后果：** 重构（比如下面 #6、#10）时手滑改坏一个只在少见分支用到的名字，要到用户碰到那条路径才炸。

2. **四条行为没有测试，改坏了测试也不红**
   - **是什么：** 我逐个改坏后跑 `check-sidebar.cjs`，全部仍然通过：
     - `t3-tabs/main.js:79`：把 `(i + by + list.length) % list.length` 改成 `(i + by) % list.length`。测试注释写着"and wrap"，但只从 Home 和中间的 space 走，从没从第一个往前、从最后一个往后。真出这个 bug，在第一个 space 按 `cmd-alt-[` 会让 `showSpace(undefined)` 抛 TypeError，而这个异常发生在 `for(;;)` 命令循环里（`t3-tabs/main.js:156`），循环一死所有快捷键都失效，要重载 mod 才恢复。
     - `t3-spaces/main.js:223`：删掉 `unsure.add(key)`。意思是 git 因为"别的原因"失败（机器暂时不通、`dubious ownership`）时，要记成"待重问"而不是"不是仓库"。改坏后，一次短暂失败会让一个仓库的分支、↑↓ 标记消失，直到下次 `cd`。
     - `t3-spaces/main.js:97`：删掉 `.filter(([on]) => !on)`，远程仓库不该被当作本机 watch 的"在用"集合。
     - `t3-spaces/main.js:120`：把 `FALLBACK` 乘 100，60 秒兜底轮询（编辑器外的改动）整个不工作，没人发现。
   - **问题：** 这四处都是靠"一次性写对"的分支，正是这个仓库最爱出细 bug 的类型（git 状态、模式切换）。
   - **最小修法：** 各加一两条断言。walkSpaces：把 `active` 放在第一个 space 发 `space-prev`，放在最后一个发 `space-next`，期望回绕。unsure：让 `exec` 返回 `code:128, stderr:"fatal: unsafe repository"`，期望下一轮 `due()` 还会问。FALLBACK：把 `Date.now` 快进 61 秒。远程 watch：放一个 `on:"m"` 的仓库，期望 `watching` 里没有它。
   - **不修的后果：** 以后有人动这几行，`check.sh` 还是绿的。

3. **每次有 agent 回合结束，会对同仓库所有 worktree 各跑一遍全树 `git status`**（`mods/t3-spaces/main.js:219`，触发在 `:109` 的 `sameRepo`）
   - **是什么：** Spaces 想要每个 space 的分支和 ↑↓，用 `git status --porcelain=v2 --branch` 取。一个窗格从忙变闲（agent 回合结束、`vite`/`lazygit` 退出、shell 命令跑完）就会重查它所在的 space，以及同一仓库的全部兄弟 space（`sameRepo`，理由是"提交会改变兄弟的 ahead/behind"）。
   - **问题：** 代码只读 `# branch.head` 和 `# branch.ab` 两行，却让 git 把整个工作树的未跟踪文件也扫一遍（注释 `:63` 自己说了 "walks the whole tree"，还显式关了 `fsmonitor`）。场景：一个大仓库开 8 个 worktree、十几个 agent，每个 agent 一分钟左右结束一个回合，就是每分钟几十次全树扫描，每次几百毫秒到几秒。**我没在大仓库上实测**，数量级是推算。
   - **最小修法：** 命令加 `--untracked-files=no`（一个参数；分支行不受影响）。
   - **不修的后果：** 大仓库上会有持续的磁盘和 CPU 底噪，笔记本风扇会转；小仓库没感觉。

4. **`stage.sh` 的删除护栏有洞，还可能向过期的 pid 发 kill**（`scripts/demo/stage.sh:13, 124, 132, 142`）
   - **是什么：** `down` 会 `rm -rf "$D"`；护栏是 `case $D in /private/tmp/*)`。
   - **问题：** 这个模式也匹配 `/private/tmp/`（带尾斜杠）和 `/private/tmp/../../Users/x`。`DEMO=/private/tmp/ stage.sh down` 会把整个 `/private/tmp/` 删掉，包括其他 agent 正在用的临时文件。另外 `down`（`:124`）和 `reopen`（`:142`）直接 `kill "$(cat app.pid)"`，重启或窗口早已退出后这个 pid 可能被别的进程占用；同一个脚本的 `app()`（`:74`）已经知道要用 `ps eww | grep HERDR_APP_HOME=$A` 确认，但 `down`/`reopen` 没有。
   - **最小修法：** `up` 最后 `touch "$D/.herdr-t3-demo"`；`down` 在 `rm -rf` 前要求这个标记文件存在，且 `case $D in *..*) exit 1`。kill 前用 `app()` 里那条 `ps eww | grep -q "HERDR_APP_HOME=$A "` 确认。
   - **不修的后果：** 平时没事；`DEMO` 设错或者长时间后 `down`，要么清空 `/private/tmp`，要么给无关进程发 SIGTERM。

5. **Inbox 创建的 Undo 点了以后最多晚 1 秒才生效**（`mods/t3-inbox/main.js:73-77`）
   - **是什么：** Settle/Snooze 之后，侧栏底部（t3-chrome）或标签栏（t3-tabs）显示 `Settled, Undo`。点 Undo 走 `t3-tabs.undo`（`t3-tabs/main.js:282`），它只是写 `shared("t3-inbox.undo")` 请求；Inbox 在 `consumeUndo` 里接。
   - **问题：** `consumeUndo` 只在那个 1 秒定时器里调用（`main.js:75`），`render()` 里的 `compute()` 不调。所以点了 Undo 以后，行要等 0~1 秒才回来，这期间通知还是可点的；想着没点上的人会再点一次（不会重复撤销，但手感像卡了）。Settle 之后那 5 秒窗口里，这是最常走的路径。
   - **最小修法：** 在 `compute()` 开头（或 `render()` 里）也调一次 `this.consumeUndo(cx)`；它自带"值没变就返回"的判断，重复调用没有代价。
   - **不修的后果：** Undo 手感发钝；侧栏隐藏时（只有定时器驱动）仍然最多 1 秒，那个可以接受。

6. **"找布局节点、判断 Inbox/Lists"复制了六份**（`mods/t3-agents/main.js:204`、`t3-spaces/main.js:25-27`、`t3-inbox/main.js:262`、`t3-tabs/main.js:122,82`、`t3-home/main.js:9`、`t3-chrome/main.js:7,17`）
   - **是什么：** 每处都是同一个递归 `find(node, id)`，加上 `find(layout(), "sidebar-lists")?.active === "inbox"`。
   - **问题：** 这是"必须一起改"的一类复制：`"sidebar-lists"` 这个 id 或 `active` 的含义变了，漏改一处，那个 mod 就会按错误的模式画（比如 Home 的 `hasNext` 读了错的 rows）。写法也不统一（`map().find(Boolean)` 和循环两种）。
   - **最小修法：** 新增 `shared/layout.js`，导出 `find` 和 `inboxShown`，在 `sync.sh` 加一行 `share layout …`（加到上面六个 mod）。净减约 40 行。
   - **不修的后果：** 下次改侧栏栈的 id 时，容易漏一处；`check.sh` 的 `cmp` 帮不上，因为这几份本来就不相同。

7. **Inbox 里"按新近排序"的规则定义了两次**（`mods/t3-inbox/row-model.js:97` 与 `:111`）
   - **是什么：** `inboxFields` 里有 `newest = (x, y) => since(y) - since(x) || byAddress(x, y)`，`inboxSections` 里又有 `newest = (x, y) => y.since - x.since || byAddress(x, y)`。前者给拖动算落点（`drag.js:47`），后者给列表真正排序（`:115`）。
   - **问题：** 现在两者等价；一旦有人改了其中一个的平局规则或排序键，拖动时画出来的空位就和松手后落下的位置对不上。
   - **最小修法：** 导出一个 `byRecent(a, b)`（接受带 `since` 的对象），两处都用它；`drag.js` 把 agent 映射成 `{since: since(a), address}` 再比。
   - **不修的后果：** 改排序时必须记得改两处，漏了就是拖动手感出错且没有测试能说明为什么。

## 可以更好

8. **两个文件各把几类职责混在一起**（`mods/t3-spaces/main.js` 699 行、`mods/t3-tabs/main.js` 654 行）
   - **是什么：** t3-spaces 同时有：git 探测与监视（`due/check/watch/refreshGit/sameRepo`，约 `:66-262`）、机器重连（`reconnect`，`:131-185`）、同步 Herdr 里的顺序（`ordered`，`:276-352`）、拖动算术（`dragTo/lift/slot/dest/letGo`，`:545-633`）、画行。t3-tabs 同时有：Home 的识别与创建（`:14-61`）、关闭对话（`closeTab/closePane*`）、Settle 与 Undo（`:187-290`）、"回到哪"的跟踪（`track/zoomFollows/payBack`）、标签条宽度和滚动、画。
   - **问题：** 现在没有出 bug，测试也覆盖得好；代价是新人要读七百行才能改一个点，而且各职责共用 `this` 上的几十个字段，改一个容易碰到另一个。按"按职责拆、不按行数拆"的标准，git 探测（有自己的 `git/checked/unsure/pending/refreshing/watching` 一组字段）和 Settle/Undo 是最干净的两块。
   - **最小修法：** 只拆这两块，各抽成同目录一个文件的普通对象/函数；其余不动。因为 `check-sidebar.cjs` 是通过打包整个 mod 来测的，拆分时要同步它加载文件的列表。
   - **不修的后果：** 不会坏；只是越往后越难读。当前不是优先。

9. **测试按名字找不到：tabs、agents、chrome、home 的测试都在 `mods/t3-spaces/check-sidebar.cjs`（2812 行）里**
   - **是什么：** `grep` 显示 t3-tabs、t3-agents、t3-chrome、t3-home 没有自己的 `check*.cjs`，它们的行为（关闭、Settle/Undo、Home、标签宽度）都在 t3-spaces 下的那一个文件里，靠 `f.load("t3-tabs")` 加载。
   - **问题：** 改 `t3-tabs` 的人不会想到要去 t3-spaces 找测试；单个文件 2800 行，找用例靠 `grep`。
   - **最小修法：** 不用拆内容，先把文件名改成能看出范围（比如 `check-sidebar-and-tabs.cjs`），或者在 `AGENTS.md` 的 "Finishing a change" 一句话说明。
   - **不修的后果：** 只是找不到；不影响正确性。

10. **递归没有环保护**（`shared/tree.js:18-20` 的 `descendants`、`mods/t3-agents/rows.js:36` 的 `agentTree`）
    - **是什么：** 按 `parent === addr` 一路往下找子 agent。
    - **问题：** 同样是沿 `parent` 走，往上走的地方都有 `seen` 集合防环（`t3-tabs/main.js` 的 `settle`、`visibleTabs`，`row-model.js` 的 `inboxInView`），往下走的这两处没有。万一数据里出现 A→B→A 两个 live 的互为父子，`descendants` 会无限递归，`render` 抛栈溢出，而 tabs、inbox、agents、pane 头都会调它，整个界面一起坏。我没找到能产生环的来源（`parent` 由 Herdr 写），所以只是防御。
    - **最小修法：** `descendants(all, addr, seen = new Set())`，进入前 `if (seen.has(addr)) return []`；`agentTree` 同理。
    - **不修的后果：** 只有数据出现环才会出事，概率很低，但出事时是整个界面白屏。

11. **八处 `JSON.parse(localStorage.getItem(...))` 没有 try/catch**（`t3-agents/main.js:38,40,44`、`t3-spaces/main.js:55,57,58`、`t3-inbox/main.js:40,60`）
    - **是什么：** 这些都在 `init()` 里。
    - **问题：** 其中任何一个键里存了坏 JSON（半写入、别的版本留下的格式），`init` 抛错，这个 mod 整个起不来，侧栏对应部分空白，用户没有提示。存储方面的整体风险归 A，这里只提崩溃面。
    - **最小修法：** `shared/` 里加一个 `stored(key, fallback)`（`try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback } catch { return fallback }`），八处改用。
    - **不修的后果：** 平时不会发生；发生一次，用户得手动清存储才能恢复。

12. **没有图标的 space 每分钟被重查一次**（`shared/project.js:113-124`）
    - **是什么：** 没找到图标的 space 每 60 秒重新找一次；找法是 `git rev-parse` 加一次 `sh` 加最多 7 个页面文件读取，远程 space 每一步都要走一次 core。
    - **问题：** 大多数项目没有 favicon，用的是首字母头像。几十个 space 就是每分钟几百次小调用，一直持续（Spaces 和 Inbox 各自这样做，但同一时刻只有显示着的那个在做）。这是照 T3 的缓存策略做的，所以不是错，只是对"很多空 space + 远程"不友好。
    - **最小修法：** 找不到的也 10 分钟再查（代价是新加 favicon 要最多 10 分钟才出现）。
    - **不修的后果：** 后台一直有低强度开销；不影响功能。

13. **隐藏的 Review 窗格也在每 150 ms 算一次滚动位置**（`extras/mods/review/main.js:67`）
    - **是什么：** 每个 space 一个 Review 窗格（ADR 0007），每个窗格有 150 ms 的 `spied()`（`JSON.stringify` 了可见文件和分组，`visibleGroups` 要扫到 `end`），1 s 的 `dirty` 检查，15 s 的刷新。
    - **问题：** 窗格不在屏幕上时 `visible` 不会变，`spied()` 的结果永远一样，白算。15 个 space 开着 Review 时，就是每秒 100 次这样的计算（每次的成本和 diff 的行数成正比）。
    - **最小修法：** `spied()` 开头 `if (!this.onScreen()) return this.lastSpied ?? "";`。
    - **不修的后果：** 大 diff 加多个 space 才有感觉；小的看不出来。

14. **几处近似副本，每次改要记得改全**
    - `ago()`：`t3-inbox/row-view.js:16`、`pulls-review/bar.js:49`、`review/commits.js:10`（"just now" 与 "now" 的差别是有意的）；`t3-agents/rows.js:27` 的 `duration` 同一套阈值。
    - `touchesDiff()`：`pulls-review/bar.js:71` 与 `review/review-load.js:17` 几乎逐字相同（只是 `git` 辅助函数不同），都在判断"这批文件变化值不值得重读"。
    - 快捷键格式化：`shared/tip.js:8-24` 的 `keyOf` 与 `t3-new-menu/main.js:8-24` 的 `shortcut` 是同一段代码（`new-menu` 额外限定 `section === "global"`）。
    - **最小修法：** `touchesDiff` 和 `keyOf` 值得放进 `shared/`（`new-menu` 加进 `tip` 的复制清单，`shortcut` 改成调 `keyOf(action, "global")`）；`ago` 变化大，不必动。净减约 30 行。
    - **不修的后果：** 修一处 bug 时容易漏另一处，比如以后给 `touchesDiff` 加限流。

15. **每个 mod 都把自己的测试文件一起装进了用户的 App 目录**（`scripts/update.sh:23` 的 rsync，`$gen` 只排除了 `gpui-kit.d.ts` 和 `jsconfig.json`）
    - **是什么：** `check-sidebar.cjs`（2812 行）、`check-inbox.cjs`（1862 行）等共约 5500 行 `.cjs` 会被复制到 `~/.config/herdr-app/mods/*/`。
    - **问题：** 它们在用户机器上没有用处；`sync.sh` 到独立仓库那边可能有意带上（我没确认），所以只建议改 `update.sh`。
    - **最小修法：** `update.sh` 的 `gen` 加 `--exclude 'check*.cjs'`。
    - **不修的后果：** 无功能影响，只是用户目录里多了一堆不会被用到的文件。

16. **标签条每帧做了不需要的活**（`mods/t3-tabs/main.js:133, 528`）
    - **是什么：** `nameOf` 对每个没起名的标签都调 `namer()`（`:133`），而 `namer()` 每次都为所有终端和标签重建一个 Map；`const live = awake(st, under)`（`:528`）每帧都算，其实只有侧栏隐藏时才用得上。
    - **问题：** 一个 space 里十来个标签、一百来个终端，每帧几千次分配；量不大，但每次重绘都做。
    - **最小修法：** 在 `render` 开头 `const name = namer()` 一次，传给 `nameOf`；`live` 放到 `sidebar?.hidden` 的分支里再算。
    - **不修的后果：** 只是浪费，现在的负载下看不出来。

**我看到但判断不用修的只增不减的小表：** `t3-tabs` 的 `nameW`、`t3-inbox` 的 `rowH`/`refused`、`t3-spaces` 的 `born/shown/lastGit`、`shared/project.js` 的 `looked/lastIcon`。每条都是几十字节，一个窗口开一周也到不了 MB；`project.js` 里已经有 `shortcut:` 注释说明。

**Lean:** 约可减 -80 行（#6 约 -40，#14 约 -30，#7 约 -5，其余零星）。

**Verdict:** 没有必须修的；建议先做 #1（把 `tsc` 接进 `check.sh`）和 #2（补四条断言），再做 #3、#5，这四项成本都很小。

**Not checked:** 没有在真实 Herdr 窗口里跑（所有结论来自读代码、`check.sh`、`tsc` 和副本上的变异）；#3 的开销没有在大仓库上实测；`t3-inbox` 的 `drag.js`、`list-view.js`、`row-view.js` 和 `extras/mods/review` 的 `diff.js`/`rows.js`/`settings.js` 只扫读、没逐行审；`t3-theme-export` 和 `scripts/demo/scene-*.sh` 没细看，也没运行；远程机器路径（`hc machine`、`exec(..., { on })`）只能从代码推断，没有实际连过；`space.colors` 写入（`t3-spaces/main.js:641`）是给"官方 picker"留的，我无法确认官方 mod 现在是否还读它，所以没报它是死代码。
