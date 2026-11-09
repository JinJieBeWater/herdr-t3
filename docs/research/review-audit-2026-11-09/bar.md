> 历史审查归档（2026-11-09 整理，截至 herdr-t3 `684eb4f` / pulls.review `d1f982f`）。正文、行号、实验与结论均对应下文原始基线；以下是按后续提交核对的处理状态，本轮未重跑实验。样本仓库路径、分支、提交和内部文件名已匿名化，复现代码中的占位值需替换为实际样本。

- 第 1、4 项：已修，见本仓库 `5a413bc`。
- 第 2 项：已修，见 `4cd1ff5`；第 3 项见 `526ab29`；第 5、6 项见 `10c94f2`。

---

What this change does: Review 栏读取焦点所在 worktree 的 Git 状态，显示未提交文件、分支提交及推拉计数，并打开该 space 的 Review 窗格；logo 菜单另读提交和分支。本次只读审查 `extras/mods/pulls-review/` 当前实现，按单人本机使用、仓库较大且可能切换多个 worktree 的负载判断。

基线：herdr-t3 `19296eb24cefb0b69aac14a480add7d8a62d83b0`；关联契约及实现来自 pulls.review `20a7c28dffd7584c30179557a71737e8a99d4074`。环境为 macOS、Git `2.54.0 (Apple Git-157)`、Node `v24.22.1`；已读两仓库的 `AGENTS.md`、T3 的 `RECIPE.md`、ADR-0007 及 fork 计划 04/05。

审查期间有其他工作将 T3 的 HEAD 推进到 `075068db4b223574458346104016ab6047e30a8d`；已核对，本审查目录相对起始基线没有变化。

**Must fix**

1. **开启签名展示后，菜单把签名信息当成 commit，直接报错**（`extras/mods/pulls-review/bar.js:L164–167、L293–296`）
   - **What this is:** `readPicks()` 用逐行解析的 `git log --format=...` 构建菜单，每一行都必须有 SHA、subject、时间和作者。
   - **Problem:** 仓库有签名提交且设置了 `log.showSignature=true` 时，Git 还会输出签名验证行；真实临时仓库中两个 commit 被解析成三个条目，其中一个没有 `subject`，调用实际 `reviewMenu()` 报 `Cannot read properties of undefined (reading 'slice')`。
   - **Fix:** 给这条供机器解析的 `git log` 加 `--no-show-signature`，并用带签名提交、开启该配置的 fixture 检查菜单可渲染。
   - **If we skip it:** 使用签名展示配置的人点击 logo 后，整个提交/分支菜单无法正常显示。

2. **异步打开期间切换 space，会覆盖另一个 space 的 Review**（`extras/mods/pulls-review/open.js:L71–82、L101–105`；`extras/mods/pulls-review/bar.js:L381–387`）
   - **What this is:** 点计数后，`launch()` 等待读取 `config.json`，再按当时的活动 space 复用或新建 pane；点 logo 后，也要等 Git 读完才弹菜单。
   - **Problem:** 在 A 发起打开、配置读取尚未完成时切到 B，复现得到 `shared.review={tab:"B",root:"/A",page:"/worktree"}`，并发出 `pane.focus(review-B)`；另一个复现中，A 的菜单读取期间切到 `/B`，读完仍弹出 `root:"/A"` 的菜单。
   - **Fix:** 在首个 `await` 前记住发起请求的 space 和位置，等待结束后核对；上下文已变就取消这次打开或弹菜单，避免按新的活动 space 执行旧请求。
   - **If we skip it:** A 的内容会替换 B 正在看的 Review；旧仓库的菜单也会出现在新仓库上方，后续选择会把旧内容送到新 space。

3. **未提交计数与点击后真正评审的文件不是同一种统计**（`extras/mods/pulls-review/bar.js:L127–135`；关联 `pulls.review/packages/core/src/local/source.ts:L44–48、L70–78`）
   - **What this is:** 栏直接累计 `git status --porcelain=v2` 的文件记录，而 `/worktree` 展示 HEAD 到当前工作区的净 diff，并把未跟踪文件放入临时 index 后识别 rename。
   - **Problem:** 将 `a.txt` 改动暂存、再把工作区恢复成 HEAD 的内容，真实结果是 `status=MM a.txt`、栏计数 1、按 daemon 算法得到的 diff 为 0 字节；不暂存地把 `a.txt` 移为 `renamed.txt`，栏计数 2，而同一算法得到一条 `R100 a.txt renamed.txt`。
   - **Fix:** 让这个数字采用 pane 的 HEAD→工作区净变化口径，未跟踪文件和 rename 也保持一致；只取文件状态元数据即可，避免为计数读取整份 patch，并保留这两个 fixture。
   - **If we skip it:** 点“1 个未提交文件”可能打开空 Review；一次普通文件移动会显示为两个待评审文件。

4. **未推送列表截到 200 条后，会把仍在菜单中的提交误标为已推送**（`extras/mods/pulls-review/bar.js:L165、L293–300、L317`）
   - **What this is:** 菜单从 `baseRef..HEAD` 取最多 200 个提交，另从 `upstream..HEAD` 取最多 200 个 SHA；不在后一列表中的提交被显示为 `On <upstream>`。
   - **Problem:** 一个旧 feature 提交尚未推送，分支随后合并了 main 的 205 个新提交，此时相对 upstream 有 207 个提交、相对 main 的菜单只有 2 条；真实 Git 复现中，旧 feature 仍在菜单却落在未推送列表的截断处之外，实际卡片显示 `On origin/feat`，而 `git merge-base --is-ancestor <feature> origin/feat` 返回 1。
   - **Fix:** 最小修复是移除未推送 SHA 集合上的 `--max-count=200`，保留菜单自身的 200 条展示上限；这个用于判定成员资格的集合必须完整。
   - **If we skip it:** 用户会看到尚未推送的提交没有 ↑，并被明确告知它已经在 upstream 上。

**Should fix**

5. **窗口失焦后，watch 仍持续启动 Git 检查每批文件事件**（`extras/mods/pulls-review/bar.js:L95、L108–110`）
   - **What this is:** 250 ms 的轮询在 `window.active=false` 时停止统计，但另一个 watch 任务仍直接调用 `touchesDiff()`，其中普通文件路径会启动 `git check-ignore`。
   - **Problem:** 后台构建或 agent 持续写文件时，即使窗口已失焦，watch 的 Git 检查仍会继续；用实际源代码、假时钟和事件 Promise 输入 150 ms 一批的 20 批事件，3 秒内仍记录到 20 次 `touchesDiff()`，真实仓库单次 `check-ignore` 测得约 7.0–7.8 ms。
   - **Fix:** 在 watch 的异步等待结束后也检查窗口状态，失焦时只记有变化，恢复活动后合并重读一次；同时合并事件批次，避免在两次统计之间反复启动忽略规则检查。
   - **If we skip it:** 构建持续写入 ignored 目录时也会产生这些短命 Git 进程；在模拟的事件速率下相当于约 400 次/分钟，窗口失焦的省工作逻辑只省掉了完整统计。

**Nice to have**

6. **旧仓库迟到的事件会让当前仓库白读一轮**（`extras/mods/pulls-review/bar.js:L108–110`）
   - **What this is:** 一个 root 的事件被判定需要刷新后，代码遍历整个 `reviewAt`，把所有已缓存位置的读取时间都提前。
   - **Problem:** 先读取 A，再切到 B 并刚完成统计，此时 A 的挂起 watch 返回一个事件，B 的缓存也被置旧；受控复现记录到 B 在 1 秒后再次执行 `readReview()`，尽管 B 没有变化。
   - **Fix:** 收到事件后重新核对 root，只调整这个 root 对应缓存的位置；不用让别的仓库一起失效。
   - **If we skip it:** 在多个有 agent 活动的 worktree 间切换时，会额外扫描刚看过的仓库；本例每次多启动 4 个 Git 进程。

**验证与开销**

`node extras/mods/pulls-review/check.cjs` 通过，输出：

```text
ok: the Review bar's counts outlined and ruled, its block sized to fit, the branch menu and its search, opening a review
```

独立实验直接复用该检查文件中 `(async () => {` 之前的 VM 加载器，因此执行的是仓库中的实际 `bar.js`、`open.js`、`main.js` 等源码。真实 Git 场景只在自己的 `/tmp` 临时仓库写文件、index、配置和提交；watch 与焦点切换使用隔离 VM 中的宿主接口替身，未操作用户窗口。

真实负载为 `/path/to/benchmark-repo`，Git 参数与栏一致，均带 `--no-optional-locks -c core.fsmonitor=false`：

| 操作 | Git 进程数 | 实测耗时 | 输出与结果 |
| --- | ---: | --- | --- |
| `readReview()`，两批共 6 次 | 每次 4 | 38.84–66.66 ms/轮 | `changed=65`、`ahead=56`、`behind=0`、`unmerged=203`，基线为 `origin/dev` |
| 其中 `status --porcelain=v2 --branch --untracked-files=all` | 每轮 1 | 17.19–37.07 ms | 4,384 字节 |
| `readPicks()`，2 次 | 本例每次 3 | 35.37、44.20 ms | 200 个 commit、20 个 branch；log 25,641 字节、refs 2,909 字节 |
| 对 ignored `node_modules/.cache/` 路径做 `touchesDiff()`，5 次 | 每次 1 | 7.01–7.76 ms | `check-ignore` 返回 0，路径被忽略 |

`readReview()` 的四条命令依次是 `rev-parse --show-toplevel`、`status`、`symbolic-ref ... origin/HEAD` 和 `rev-list --left-right --count origin/dev...HEAD`。菜单读 log、未推送 SHA 和 `for-each-ref`，本例不需要旧 Git 的回退调用。

这些时间来自 Node 子进程适配器；菜单里原本并行的 log 和 rev-list 在此适配器中顺序执行，不能把表中时间当作 Herdr 内的点击延迟或 QuickJS 渲染耗时。这个真实仓库的常规 10 秒统计没有测出明显性能瓶颈；需修的是事件路径中的重复 Git 工作。

**可重建的复现输入与观测**

1. 签名菜单：在临时仓库用临时 SSH key 创建一个 SSH 签名提交，设置 `gpg.format=ssh`、`gpg.ssh.allowedSignersFile` 和 `log.showSignature=true`；调用实际 `readPicks({root,upstream:null,unmerged:0,baseRef:null})`，将返回值作为 `menu:"review"` 的 props 后调用 `render()`。两个合法提交外，多解析出以下一项，随后触发上面的 `slice` 错误：

   ```text
   sha = Good "git" signature for audit@example.invalid with ED25519 key SHA256:...
   subject = undefined
   author = undefined
   ```

2. 打开上下文：让 `readTextFile()` 返回一个未完成的 Promise，在活动 space A 调用 `launch({root:"/A",args:["--worktree"],page:"/worktree"})`；随后将活动 space 改为 B，提供 B 已存在的 Review pane，才完成配置读取。菜单场景同理，只需延迟 `readPicks()`，在完成前把 `reviewLocation()` 从 A 改为 B：

   ```text
   FOCUS_RACE commands = [["pane.focus", {"pane":"review-B"}]]
   FOCUS_RACE sharedReview = {"tab":"B","root":"/A","page":"/worktree",...}
   STALE_MENU current = /B; menuRoot = /A; menuSubject = A commit
   ```

3. 未提交计数：先提交内容 `base\n`，改成 `staged\n` 后 `git add a.txt`，再把工作区写回 `base\n`；另一个临时仓库只执行 `rename(a.txt, renamed.txt)`。净 diff 的核对步骤与 daemon 一致：复制 index 到临时文件，通过 `GIT_INDEX_FILE` 执行 `git add --intent-to-add -- .` 后读取 `git diff -M HEAD --`：

   ```text
   NET_ZERO status = MM a.txt; barChanged = 1; daemonDiffBytes = 0
   UNSTAGED_RENAME status = " D a.txt\n?? renamed.txt"
   UNSTAGED_RENAME barChanged = 2; daemonNameStatus = "R100\ta.txt\trenamed.txt"
   ```

4. 未推送判定：初始提交设为 2019 年，`origin/feat` 指向它；feature 提交 F 为 2020 年，main 上追加 205 个 2024 年的提交并更新 `origin/main`，feature 再合并 main。配置 feature 跟踪 `origin/feat`，调用实际 `readReview()`、`readPicks()`，渲染 F 的卡片并读取文本：

   ```text
   ahead = 207; unmerged = 2; menuCommits = 2; cappedUnpushed = 200
   featureInMenu = true; featureInUpstream = false; featureInUnpushed = false
   card 最后一行 = On origin/feat
   ```

   这个复现的菜单只有两项，不涉及突破代码已明确接受的“菜单最多 200 条提交、20 条分支”限制。

5. watch：让 `timer.every` 暴露回调，以假时钟驱动；`watchFolder(root)` 每次返回可手动完成的 Promise，`readReview` 和 `touchesDiff` 记录调用。先在 100000 ms 读取 A，再在 100250 ms 读取 B，100500 ms 完成 A 的事件，101500 ms 再执行 timer；另令 `window.active=false`，每推进 150 ms 完成一次 B 的事件，共 20 次：

   ```text
   reads = [{cwd:"/A",now:100000},{cwd:"/B",now:100250},{cwd:"/B",now:101500}]
   INACTIVE_WATCH milliseconds = 3000; touchesDiffCalls = 20; newFullReads = 0
   ```

   最后一项计数记录的是 VM 对 `touchesDiff()` 的调用；对应真实实现每个普通路径批次会执行一条 `git check-ignore`，其单次开销另在真实 worktree 测量。没有把模拟事件回放当成真实 FSEvents 实测。

另外核对了 `feature#topic` 的页面编码，以及 `status.aheadBehind=false`：本机 porcelain v2 仍返回正确的 `+207 -0`，这两项没有发现问题。没有重复报告今天已修复的分组、原子构建、长行截断、Map 查找和分批 rows 问题。

实验目录、临时仓库、index 和签名 key 已清理；未修改产品代码，未删除仓库文件，未提交，未启动或重启服务，也未请求分析或写 reviewed 标记。

原审查结论（基线时）：fix 1, 2, 3 and 4 first.

Not checked: 真实点击、截图布局、Herdr QuickJS 耗时与原生 watch 事件回放，Linux/Windows，以及 PWA/browser/official 模式的实际启动；未运行全库门禁或 pane/daemon 全量测试。
