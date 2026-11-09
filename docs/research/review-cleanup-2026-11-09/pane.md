> **归档（2026-11-09）**：历史审查记录，不是待办。文中行号、数据与结论均对应下方基线，与当前代码不一定一致；样本仓库已匿名化。7 项发现均已在 herdr-t3 修复：
>
> | 发现 | 修复 commit |
> | --- | --- |
> | 1 `asked` 按 sha 占位 | `9e1c66f` |
> | 2 暖缓存重建整组 | `e227489` |
> | 3 400 token 截断 | `2898bf1` |
> | 4 宽字符/tab 横向滚动不足 | `8e97906` |
> | 5 主题变更漏全文缓存 | `39e4278` |
> | 6 折叠文件仍被请求 | `e412beb` |
> | 7 `trailing()` 双遍扫描 | `e227489` |

What this change does: 本次只读审查当前 Review pane 的全部 JavaScript，以及它使用的 `shared/list.js`、`shared/tip.js`；对象是整体实现，不限于最近的 diff。负载按本机单人使用、上千文件的 Review 判断，重点是内容正确、50ms render 预算和可以删掉的补丁状态。

基线：`herdr-t3 ea924dcf6583bacb0ac5308c1e9f3b91e4f7aa0b`。已对照 `review-audit-2026-11-09/` 的旧报告和后续修复；下面没有重复列入已修好的问题，`asked` 两个反例是该修法仍遗漏的路径。旧审计第 18 项的 scroll spy 按既定决定保留。

**Must fix**

1. **`asked` 按内容 sha 占位，能让另一个文件永久停在 Loading；超时后 Retry 也会跳过缺失行**（`extras/mods/review/rows.js:26–36`；`extras/mods/review/review-load.js:42–54,76–78,109–113,128–129,161–163`）
   - **What this is:** `asked` 是“这个文件版本已请求”的集合；请求成功之后，只要同 sha 的任意文件有 hunks，就继续保留这个 sha。
   - **Problem:** 两个路径可以有同一个 Git blob sha：模拟 `a.ts`、`c.ts` 各 2000 行、同 sha，第一批只取到 `a.ts` 后，`c.ts` 无 hunks，但后续 `rowsWanted()` 永远为 `[]`；正常 Git 补丁直接取 `newIndexSha`，因此这是合法输入。另一个已断言的反例是 30 秒超时提示先出现、旧请求尚未结束，此时 Retry 发出 `rows: []`，随后错误消失、缺失行和 `asked` 占位仍在。
   - **Fix:** 删除 `asked`、`mine` 和两条读取路径的占位/释放逻辑，保留 `loading` 控制当前读取、`file.hunks` 判断已取得的行；两者已覆盖这里需要的去重。给现有检查补上“同 sha 不同路径分两批”和“超时先于旧回复”的反例；不要再加第三套请求状态。
   - **If we skip it:** 复制出的源码、相同模板文件等可一直读不到正文；慢连接的 Retry 也可能只清掉错误提示。15 秒整页刷新同样经过 `rowsWanted()`，不能解决同 sha 的永久跳过。

2. **暖缓存仍重建整组全部行，真实 Code 组的纯 QuickJS 构建已超过 50ms**（`extras/mods/review/main.js:171–180`；`extras/mods/review/rows.js:158–217`；`extras/mods/review/review-load.js:157`）
   - **What this is:** 每批 rows 到达、折叠一个文件、改变 reviewed 或切换布局，都会增加全局 `version`；下次 `items()` 重走当前组所有已加载行，再扫描这些行汇总宽度。
   - **Problem:** 真实 branch 的 Code 组有 1164 文件、159,877 个已取得的行、7896 个列表项，暖缓存重建为 **39.0ms `node --jitless`**；用同一源码和真实文件/hunk 数量在纯 QuickJS 结构回放中为 **87–90ms，中位数 88ms**，尚无 GPUI 调用。原先缓存每行列数解决了 token 量宽，却没有消除每批、每次局部操作重走全部旧行的成本，分批浏览的累计工作仍随已读内容增长。
   - **Fix:** 将现有 `fileItems` 按文件产出的片段和最大宽度留住，只重建内容、notes、折叠或模式发生变化的文件；组列表拼接片段并汇总文件宽度。复用当前模块即可，不另建数据层；同时缓存列表尺寸数组，避免每帧再构造一次。
   - **If we skip it:** 组的前段可以打开，读到后段后，任意新批次或局部操作仍可能让 render 被打断；被打断后，等测量或再次重绘也不能降低同一轮构建的工作量。

3. **400 个 token 的保护静默删掉代码，而且可见 run 的元素数仍无足够约束**（`extras/mods/review/diff.js:196–206,260–274`；`extras/mods/review/rows.js:8–11,194–195`）
   - **What this is:** daemon 和 `clipRows()` 已把一行截到最多 1000 字符；绘制时又只取前 400 个 token，每个有颜色的片段生成一个 `div`，一个虚拟项最多包含 32 行。
   - **Problem:** 合法的 450 个单字符 token 仍保留完整 450 字符、按 450 字符量宽，画面却只收到 400 字符，既没有省略标记，也无法通过横向滚动看见末尾。650px 视野碰到两个这种 run 时，当前假环境计到 **26,112 个元素、79,742 次链式方法调用**，所以 400 的截断既损失内容，也不能证明宿主调用能在 50ms 内完成。
   - **Fix:** 限制颜色片段的数量，超过预算的剩余 token 合成一个普通前景色片段，完整保留已接受的文本；先合并相邻同色片段。预算用真实 Herdr 校准，增加一个“400 个 token 后的哨兵文字仍传给元素”的小检查。
   - **If we skip it:** 用户可能在没有提示的情况下漏审一行末尾的条件或调用；语法片段密集的可见行仍可能触发中断，即使组内文件很少。

4. **含宽字符或 tab 的长行，横向滚动范围比实际绘制内容短**（`extras/mods/review/rows.js:16–19,42–55,63–69`；`extras/mods/review/main.js:185–187`）
   - **What this is:** `clipRows()` 按字符数保留前 1000 字符，绘制时 tab 展成四个空格；`columns()` 虽然计算宽字符和 tab，却最后强制不超过 1000 列。
   - **Problem:** 一行 1000 个 `测` 全部留在 tokens 中，实际占约 2000 列，而统一视图的 `contentWidth()` 仅给出 **7358px**，按现有列宽应是 **14608px**。同样的问题会出现在包含很多 tab 的行，滚到 `sideMax()` 后仍有已保留文本在右侧不可达。
   - **Fix:** 保留现有 1000 字符的输入裁剪，删除 `columns()` 外层的 `Math.min(MAX_COLUMNS, …)`，让量宽反映实际绘制的列数；补一条宽字符和 tab 的宽度断言即可。
   - **If we skip it:** 中文长行、缩进密集的文本会出现“横向滚到底仍看不全”；进一步调大容器宽度或重读数据都不能修正错误的滚动上限。

5. **主题变更漏掉整文件缓存和整文件在途回复**（`extras/mods/review/main.js:295–301`；`extras/mods/review/diff.js:82–97`；`extras/mods/review/rows.js:171`）
   - **What this is:** 普通 hunks 在主题颜色变化时清除并重读；整文件正文来自独立的 `full` Map，内容里的颜色已经是旧主题的十六进制值。
   - **Problem:** 模拟从 `foreground: #eeeeee` 切成 `#111111` 后，已展开全文仍是 `#eeeeee`；在切主题之前发出、之后才返回的全文请求也能重新写入这个旧颜色。两种顺序均已断言，`toggleFull()` 的 root/page/sha 检查不包含主题身份。
   - **Fix:** 主题失效时让 `full` 一并失效，并让整文件回复核对发起时的颜色 key；保留展开状态时，以新主题重新请求正文。复用普通 rows 已有的颜色校验，不新增独立主题状态。
   - **If we skip it:** 正文可能继续使用暗色主题下的亮字或相反，普通刷新因为 sha 未变也会保留它；用户须手动关掉全文再打开才恢复。

**Should fix**

6. **折叠文件仍被自动请求和高亮**（`extras/mods/review/main.js:245–247,303–306`；`extras/mods/review/rows.js:26–36`）
   - **What this is:** 列表构建会跳过折叠文件的正文，但 rows 调度只检查是否已有 hunks，未检查 `collapsed`。
   - **Problem:** 模拟折叠且没有 hunks 的 `a.ts`，`rowsWanted()` 仍返回 `['a.ts']`；Collapse all 后滚过 626 个文件标题，会继续为碰到的文件读正文、做高亮、增加 `version` 并触发第 2 项的重建。关闭正文节省了绘制，读取及缓存成本仍继续发生。
   - **Fix:** 调度批次时过滤掉折叠路径；重新展开后，现有 render 调度自然会补取它的行。首读的 `firstRows` 可保留，避免为这点优化改变接口。
   - **If we skip it:** 用户为了避开大正文而折叠文件，后台仍支付获取和保存这些正文的成本；此前没有读过的 generated/reviewed 文件也会参加。

**Nice to have**

7. **`trailing()` 每次为同一结果扫描列表两遍**（`extras/mods/review/main.js:200–205`；`extras/mods/review/diff.js:148,152`）
   - **What this is:** 末尾空白让最后一个文件头能滚到顶部；函数先累计总高度，再扫描一次找最后一个头的起点，只需要两者之差。
   - **Problem:** Code 组 7896 项时，每次调用约 **0.30ms `node --jitless` / 0.90ms 纯 QuickJS**；普通 render 会重新调用，末尾虚拟项绘制时还会再调用。它只需“最后一个头及其之后的高度”，前面的累计值会被相减抵消。
   - **Fix:** 一次循环累计尾部高度，遇到文件头或组头时归零，再加当前项高度；删除 `total`、`top`、`last` 的双遍计算。第 2 项若缓存列表尺寸，直接把这个尾部高度作为同一结果保存即可。
   - **If we skip it:** 不会改变结果；只是每次稳定重绘继续做一段与可见内容无关的扫描，属于预算中的小额固定开销。

**证据与验证边界**

本次使用原 `check-pane.cjs` 的源码加载器和假环境执行状态反例。所有 reviewed/settings 写入均为内存替身；真实 daemon 只请求 `/api/review`、`/api/review/rows`，没有执行 analyze、写 reviewed、写设置、启动或重启 daemon，也没有操作 Herdr 窗口。

真实仓库：大型样本仓库 `/path/to/benchmark-repo`，分支 `sample-feature`。下面的“已取得行”包括折叠文件，绘制项数量以当前默认折叠状态计算；探针按响应字节预算取得整个目标组，以模拟已经浏览过该组的稳态，而不是初次打开的成本。

| 路径 | Push 的 Docs | Branch 的 Code |
| --- | ---: | ---: |
| 页面 | `/compare/origin/sample-feature...sample-feature` | `/branch/sample-feature` |
| 整页文件 / 目标组文件 | 1264 / 626 | 1554 / 1164 |
| 已取得行 / 实际列表项 | 86,161 / 4321 | 159,877 / 7896 |
| 暖缓存 `items()`，`node --jitless` | 20.315ms | 39.038ms |
| 其中仅 `buildItems()` | 9.259ms | 18.372ms |
| 稳定 render，假 GPUI | 0.979ms | 1.456ms |
| aside 未测量时的稳定 render，假 GPUI | 1.372ms | 1.862ms |
| 普通可见区域元素 / 链式方法次数 | 676 / 3993 | 812 / 4730 |
| 真实片段密集区域元素 / 链式方法次数 | 2729 / 10,562 | 2210 / 8750 |
| 底部 `spied()`，`node --jitless` | 0.460ms | 0.831ms |
| 底部一次 `spied()` 的数字下标读取 | 8647 | 15,795 |

以上是 Node **v24.22.1 `--jitless`** 的重复运行中位数，不换算为 Herdr 耗时。假 `v_virtual_list` 按项高累加出 650px 视野，完整画中选 run，未使用“固定画 40 项”的放大模型；元素/方法计数不含 GPUI 的实际成本。

纯 QuickJS 对照在 codemode 沙箱中直接执行当前 `rows.js`、`main.js`，复用真实文件路径、组、hunk 数和每个 hunk 的行数；每行简化为单个 token、`columns: 80`，统一视图，因此它只回答**暖缓存列表构建**的成本，不测 token 量宽、split 配对或宿主元素构造。Code 的 7896 项与真实列表相同，五轮有效样本为 **87、87、88、88、90ms**；Docs 这组对照展开了全部文件，为 4580 项，中位 48ms，不能与表中的默认折叠 4321 项直接等同。

这里没有把纯 QuickJS 沙箱当成 Herdr 本身：第 2 项的风险由真实数据规模、同一热循环及超过 50ms 的结构回放共同支持；实际 Herdr 中哪一个可见区域在何时触发中断，仍须作者在允许操作窗口后回放。第 3 项的 26,112 元素是合成容量反例；真实片段密集区域使用样本仓库中一个生成的 Markdown 模板 `docs/templates/generated/sample-template.md` 和一个 C# 源文件 `tools/helper-src/SampleFields.cs`，未声称它们已经触发中断。

核对过的定时器：150ms scroll spy、100ms hover 指针检查、1s 恢复可见性读取、1.5s 分析状态轮询、15s 整页刷新。scroll spy 的底部线性扫描仍在，纯 QuickJS Code 组约 1ms/tick；它按既定第 18 项决定保留，不作为新发现，当前主要超预算路径是失效后整组重建。

第 1 项关于 sha 的输入契约另外核对了 fork 的 `pulls.review:packages/core/src/patch-parser.ts:230–235`（基线 `36e8599`）：常规 Git 补丁直接使用新文件 blob sha，未把路径纳入身份。第 4 项是行宽模型与当前绘制输入之间的确定性不一致；像素数使用代码现有的 `CHAR = 7.25`，没有冒充截图测量。

未作为发现：直接给 `apply()` 塞同 sha、不同 hunks 的人工输入会被 `said()` 短路，但尚无当前真实调用流程的独立触发证据；设置保存失败保留乐观值，但面板会显示错误，未把它升级为静默保存成功。也没有建议删除仍有职责的 `pathsOf`/`paths` 查找缓存、分页的 `stale` 回退或滚动的 `settling` token。

已运行并亲自检查输出：

- `node extras/mods/review/check-pane.cjs`：通过，包括大组批次与 170,000 行分页的已有检查。
- `node shared/check-list.cjs`：通过，包括未测量列表的首屏上限。
- 临时状态探针：同 sha 饥饿、超时后 Retry、全文旧主题的缓存/在途顺序、折叠文件仍被调度，断言通过；450-token 与宽字符案例已核对输出。
- 真实 daemon 的只读读取与 `node --jitless`、纯 QuickJS 结构回放：数据和主要结果如上。

被评代码与配置没有修改；未运行会写安装目录/其他工作树的 `scripts/sync.sh`，也未为报告运行全库门禁。删除项：无被评代码删除；本任务 `/tmp` 探针和数据已在交付前清理。没有提交。

Verdict（历史结论，基线 `ea924dc`）：当时建议先修 1–5；1–7 均已修复，见文首映射。

Lean: -12 lines possible. 约 10 行来自删除 `asked` 的占位/释放 bookkeeping，另约 2 行来自合并 `trailing()` 的双遍计算；不包含检查代码和为第 2 项加入的必要文件片段缓存。

Not checked: 真实 Herdr/QuickJS 宿主调用耗时、截图、鼠标点击、运行中的分析和真实写入；因此 render 中断的精确场景及图形表现仍待窗口回放，确定性状态/文本反例已在假环境验证。
