> **归档（2026-11-09）**：历史审查记录，不是待办。文中行号、数据与结论均对应下方基线，与当前代码不一定一致；样本仓库已匿名化。5 项发现均已在 herdr-t3 修复：
>
> | 发现 | 修复 commit |
> | --- | --- |
> | 1 快捷键打开净零 worktree | `36beeab` |
> | 2 请求编号不单调 | `8350ae7` |
> | 3 菜单先构造全部行 | `2cd5652` |
> | 4 未推送集合线性查找 | `98ae1ed` |
> | 5 无 press 点击复用旧锚点 | `0300ba1` |

What this change does: Review bar 定时读取当前 worktree 的文件与提交计数，点击计数、logo 菜单或快捷键后打开 Review pane。此次审查覆盖 `extras/mods/pulls-review/` 全部 `.js`、它们在 `shared/` 的源文件，以及 bar 与 pane 的 shared 状态约定，按当前整份代码判断。

基线：herdr-t3 `ea924dcf6583bacb0ac5308c1e9f3b91e4f7aa0b`；关联读取的 pulls.review 为 `36e8599eb5a294fa6536c35e8ff262a1a30aa314`。负载按单人本机、多 space、大型样本仓库 `/path/to/benchmark-repo` 的真实 worktree 判断；额外使用隔离的 Git fixture 与大提交集合。已核对上一轮 bar 审计及其修复，不重报已经解决的原始问题。

**Must fix**

1. **快捷键入口仍会打开净变化为零的空 worktree**（`extras/mods/pulls-review/open.js:105`；`extras/mods/pulls-review/bar.js:144–148`）
   - **What this is:** bar 的未提交计数已经改为 HEAD 到工作区的净 diff；没有显式 `args` 的快捷键入口仍用 `git status --porcelain` 决定是否打开 `/worktree`。
   - **Problem:** 临时仓库的 feature 分支比 main 多一个提交，将 `a.txt` 改动暂存后再恢复成 HEAD 内容，实际源码得到 `changed=0、unmerged=1`，但 `launch({})` 仍发出 `pane.split`，页面是 `/worktree`。用户有一个分支提交可评审，快捷键却送到空页面；这是净 diff 修复尚未覆盖的另一个入口。
   - **Fix:** 从当前净 diff 读取中提取一个共用的“有无工作区变化”读取，bar 计数和快捷键选择都使用它；保留 raw status 的现有平台回退，不复制第二份 shell 算法。给快捷键补同一 staged-then-restored fixture。
   - **If we skip it:** 同一个仓库里，bar 显示没有未提交文件，快捷键却打开空的未提交 Review，跳过真正待评审的分支提交。

2. **bar 的请求编号不是单调的，pane 会静默丢掉新打开请求**（`extras/mods/pulls-review/open.js:75–77`；`extras/mods/review/commits.js:29`；`extras/mods/review/main.js:280–281`）
   - **What this is:** pane 只消费 `request.n > handled` 的请求；pane 内部切 commit 使用 `Math.max(Date.now(), handled + 1)`，bar 却直接发送 `Date.now()`。
   - **Problem:** 系统时间回拨后，新点击的编号会小于已经消费的编号；同一毫秒内跟在 pane 内部递增编号后的请求也会遇到此问题。将时钟固定为 `100000`、pane 的 `handled` 设为 `101000`，执行真实 `launch()` 和真实 pane `render()` 后，页面仍为 `/commit/previous`；把同一请求的编号改为 `101001`，控制组立即进入 `/branch/feat`。
   - **Fix:** 两个发送入口共用严格递增的请求序列，创建新 pane 的 props 也使用并保留该序列；可沿用现有 `review` 记录保存最后已发序号。补时钟回拨和同毫秒连续请求的契约检查。
   - **If we skip it:** 回拨时间内的点击可能只聚焦旧 pane，页面和分析请求都没有变化，也没有错误提示；正常时钟下的普通人工点击一般不触发。

**Should fix**

3. **菜单在交给 `scrollList` 之前已经构造了全部行**（`extras/mods/pulls-review/bar.js:270–274、295–317`；`shared/list.js:44–46`）
   - **What this is:** `scrollList` 只把可见行挂进布局，但 bar 先用 `commits.map()` / `branches.map()` 创建每一行的 gpui 元素，再让 `draw(i)` 返回创建好的元素。
   - **Problem:** 真实 worktree 的 200 条 commit 菜单，已测量只显示 10 行时，替身仍记录约 1,426 次元素构造和 9,579 次链式方法调用；未测量时也先构造全部 200 行。`ea924dc` 减少了挂入布局的行数，这个调用方的构造成本仍在每次 render、键盘移动和全局数据变化时重复发生；QuickJS 的实际毫秒数尚未测量。
   - **Fix:** 把现有行构造函数直接放进 `scrollList.draw(i)`，传普通 commit/branch 数据，删掉中间的 `{ id, el }` 数组；`review/commits.js:92–93` 已是同样的按需画行方式。bar 已知道 popup 高度，也可把扣除 chrome 的高度传入已有 `height` 参数，让首帧同样只画约一屏。
   - **If we skip it:** 当前 200 条菜单仍把上千个元素构造放在同一次约 50 ms 的脚本预算内；只修改共享 list 的首屏上限无法消除这部分中断风险。

4. **完整未推送集合在每行 render 中线性查找，旧提交越靠后越慢**（`extras/mods/pulls-review/bar.js:180–183、243、308`）
   - **What this is:** 上一轮修复正确保留了完整的未推送 SHA 集合，但菜单对每个 commit 都调用 `unpushed.includes(c.sha)`，每次 render 都从头查找。
   - **Problem:** feature 分支先积累约 200 个旧提交，再合并默认分支的大量新提交而尚未推送时，菜单仍可只有 200 项，旧 feature SHA 却落在完整未推送集合末尾。保留 200 条菜单、把 199 个匹配放到集合末尾，`node --jitless` 的无窗口宿主替身在 1 万 SHA 时约 21.7 ms、10 万时约 201.4 ms；这里只是 JS 相对比较，真实 worktree 当前只有 57 个未推送 SHA。
   - **Fix:** `initReviewMenu()` 中只构造一次 `Set(props().unpushed ?? [])`，render 使用 `.has()`；完整集合的正确性保持不变。仅在临时探针内做这一替换后，10 万 SHA 场景的中位数降至约 2.5 ms。
   - **If we skip it:** 每次 hover、方向键和全局刷新仍执行至多“200 × 未推送提交数”的比较；当前仓库不大，但先前正确性补丁把一个无界集合带进了 render 热路径。

5. **无 mouse-down 的点击会复用上一次鼠标位置，现有测试手动删状态掩盖了它**（`extras/mods/pulls-review/bar.js:387–404`；`extras/mods/pulls-review/check.cjs:494–497`；`shared/focus.js:78–83`）
   - **What this is:** logo 保存 `reviewPress` 作为菜单锚点，`openMenu()` 消费后只清空 `pressAt`，没有区分该位置是否属于这一次点击；注释约定无 press 时使用宿主默认位置。
   - **Problem:** 先用鼠标在 `(900,20)` 打开，再直接触发一次没有 mouse-down 的辅助技术点击，实际源码两次都发送 `at={x:892,y:39.6}`，第二次没有回到默认位置。窗口变宽、logo 已移动时就会使用旧锚点；现有测试先执行 `delete bar.reviewPress`，产品路径中没有这一步。
   - **Fix:** 在消费 `pressAt` 前，仅为本次有 press 的点击捕获局部锚点，再把该局部值交给异步打开；顺便直接使用已有 `justClosed(view, MENU_CLOSED)`，删除这里重复的“50 ms 判断 + 清空时间戳”实现。测试先完成一次真实的鼠标打开，再验证无 press 点击，不手动删状态。
   - **If we skip it:** 辅助技术点击可能把菜单放在旧位置，菜单读取期间后来的 press 也可能覆盖先前点击的锚点；真实窗口中的视觉错位没有在本次操作验证。

**状态约定与精简边界**

| shared 字段 | 写入方 → 读取方 | 当前职责与结论 |
| --- | --- | --- |
| `review` | bar `herdr()`、pane `showPage()` → pane `render()` | 一个带 `tab/root/page/base?/n/analyze?` 的打开请求；第 2 项需要统一发号规则。 |
| `review.shown` | pane `publish()` → bar `reviewLocation()` / 高亮 | 按 tab 发布 `{ root, page, base }`；`page` 可以是单个 commit，`base` 仍指向整份 Review，两者都有调用方。 |
| `review.status` | pane `report()`，bar 初始化清理旧 `working` → `shared/name.js`、Inbox、tabs | 按 tab 发布分析状态，供未显示的 pane 之外展示；不能用 `review.shown` 的页面信息代替。 |

这三份数据表达的时间和含义不同，保留它们有具体用途。`details.js`、`focus.js`、`list.js`、`tip.js`、`zoom.js` 是共享源的副本，某个导出未被 bar 使用不代表共享函数是死代码；此次没有找到可以连同全部调用方安全删除的整段功能。最小整理是第 3 项删中间元素数组、第 4 项把成员查询移出 render、第 5 项复用已有关闭判断，代码职责仍留在现有文件中。

**验证与成本**

以下数据使用当前实际源码和 `check.cjs` 的无窗口 gpui 替身。`node --jitless` 关闭 JIT 仅用于相对比较，不把它的时间换算成 Herdr QuickJS；元素与链式调用计数也不是原生边界调用的精确计数。

| 路径与输入 | 重复工作 | 探针观测 |
| --- | --- | --- |
| 250 ms timer，位置不变且尚未到读取时间 | 位置快照、JSON key、Map/Set 查询；没有新的 Git | 1,000 次回调中位数约 0.001 ms；初始化读取一次，后续没有新增读取。 |
| 常驻计数栏 render | 当前位置、space 内 Review pane、最多四段计数和 logo | 不遍历 1,264 / 1,554 个 diff 文件，也不读取 daemon diff；未测真实宿主耗时。 |
| 真实 worktree 的 logo `readPicks()` | log 200 条、完整未推送集合、refs 至多 21 条 | 3 次 Git 调用，34.7–58.2 ms 总等待；最后快照 200 commits、20 branches、57 unpushed，菜单数据约 41.6 KB。 |
| 真实菜单，测量后显示 10 行 | 所有 200 条行构造后才筛出显示行 | 约 1,426 次构造、9,579 次链式调用；替身中位数约 2.43 ms。 |
| 合成菜单 200 条、60 unpushed，测量前 / 后 | 构造全部行；布局挂入 72 / 10 行 | 两者同为约 1,466 次构造；替身中位数约 2.46 / 2.33 ms。 |
| 合成菜单 200 条、10 万 unpushed，多数匹配在末尾 | 每次 render 做近 2,000 万次成员比较 | 约 201.35 ms；仅将成员判断替换为初始化后的 `Set.has()`，约 2.54 ms。 |

`readReview()` 的 Git 与净 diff shell 调用处于异步读取任务中；Git 的墙钟耗时不等于一轮 render 的脚本执行时间。常驻栏本身没有发现随 626 文件分组或 1,554 文件 Review 线性增长的 render 路径，优先处理的是 logo 菜单的构造成本。

已运行并检查输出，节选如下：

```text
node extras/mods/pulls-review/check.cjs
ok: the Review bar's counts outlined and ruled, its block sized to fit, the branch menu and its search, opening a review

node extras/mods/review/check-pane.cjs
ok: pairs, items, notes and heights; the pane renders every analysis state, unified and split; ...

node shared/check-list.cjs
ok: list: ↑/↓ round the ends, Home, End and typing, the highlight kept in view by key and wheel.
```

独立回放直接加载上述检查文件在测试入口之前的 VM 加载器和真实源码：净零工作区使用 `/tmp` 下临时 Git 仓库；请求编号用假时钟连接真实 bar `launch()` 与 pane `render()`；锚点用先 mouse-down/click、后单独 click 的序列。另核对 split-index fixture，净 diff 计数仍正确，因此没有列为问题。

未修改产品代码，未请求分析、写 reviewed 标记、重启 daemon 或操作 Herdr 窗口；未删除仓库文件、未提交。临时探针及其 Git fixture 已清理，本次只新增此报告。

Verdict（历史结论，基线 `ea924dc`）：当时建议先修 1 和 2；1–5 均已修复，见文首映射。

Lean: -3 lines possible. 只计第 5 项复用 `justClosed` 能直接删除的重复行，不把移动代码算成删除量。

Not checked: 真实 Herdr QuickJS 的 render 耗时、辅助技术实际点击及窗口截图、原生 watch 事件；未运行全库 `scripts/check.sh` 或 `scripts/sync.sh`，未实启 PWA/browser/official 模式，未请求真实 daemon API。
