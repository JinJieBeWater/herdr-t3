# Review 页重设计方案（照 T3 Code 的 diff 面板，待批，2026-11-11）

依据：[T3 Code Review / Diff 面板调研](t3code-review-panel.md)。用户已定（2026-11-11）：

- 范围选择器照 T3 放在 Review 页顶栏。
- 选行写批注交给 agent：先不做。
- 阅读选项只加自动换行。
- GitHub PR 评审和 git 写操作都不做，Review 保持只读。

保留不动：jin.review daemon 的 AI 分组与逐行说明、按文件的已审标记（文件再改会提示）、整文件展开、大 diff 分批、组的页签/侧栏、文件树/列表、`j k r f c s` 快捷键、分析状态标记、按 space 记状态、窄宽度两级退化（640 / 1024）。

## 1. 顶栏

T3 的 DiffPanel 顶栏：左边 `[Changes ⌄]` 范围按钮和 `head → base`，右边工具（`DiffPanel.tsx:817-985`）。照这个顺序改：

```diff
 review-header (40px)
-  [git-branch 按钮 → Review 栏的菜单]  [‹ Commit 3 of 54 ›]  +12 −3 ◔ 4/9      … [Analyze] [⇕] [⚙]
+  [Changes ⌄]  feat → main  +12 −3 ◔ 4/9                                    … [Analyze] [⇕] [⚙]
+  看某个 commit 时：[fix: tidy rows ⌄]  1a2b3c4  ‹ ›  +5 −1 ◔ 1/2           … [Analyze] [⇕] [⚙]
```

- **范围按钮**：T3 的 `xs` secondary 按钮（24px，12px 字，`⌄` 14px 70%），文字是当前范围：`Changes`、`Uncommitted`、`To push`、`To pull`、commit 的标题、或别的分支名。
- **比较对象**：范围是分支类时在按钮后面显示 `head → base`（12px `dim`，窄时先去掉 head，同 T3 `@max-[20rem]`）。
- **commit**：显示短 SHA（mono 12px `dim`），后面保留 `‹ ›` 在这份 diff 的 commit 间前后走（T3 没有，是我们已有的能力）。
- 右边不变：Analyze、展开/折叠、设置。

去掉：顶栏的 git-branch 按钮、`pulls-review.pick` 命令、`‹ Commit n of m ›` 的文字下拉（并进范围菜单）。

## 2. 范围菜单

T3 的菜单是一组单选（Changes / Uncommitted / Latest turn），再加 Turn、Commits 两个子菜单。Herdr 没有线程和轮次，换成 git 的范围；GPUI 的弹层不做悬停子菜单，子菜单改成同一弹层里的第二页（有返回；2026-11-11 已改为悬停子菜单，见 [submenu-plan.md](submenu-plan.md)）：

```text
┌ Diff scope ───────────────────────┐
│ ● Changes        4 ahead of main  │  分支相对默认分支
│ ○ Uncommitted          3 files    │
│ ○ To push                    ↑2   │  只在有上游时
│ ○ To pull                    ↓1   │
│ ───────────────────────────────── │
│   Commits                      ›  │  → 第二页：搜索 + 本分支 commit（标题、相对时间、短 SHA，未推送标 ↑）
│   Branches                     ›  │  → 第二页：搜索 + 其他本地分支对默认分支
└───────────────────────────────────┘
```

- 数量为 0 的项灰掉但留着（T3 的单选项也不随状态消失），点了不动。
- 尺寸照 T3 menu：行 28px，`popover` 圆角 8，宽 320–384；第二页同现在 Review 栏菜单的搜索列表（已有键盘 ↑↓ Enter Esc）。
- 选中项就是一次请求：写 `review`（`{space, root, page, n}`），和点 Review 栏计数完全一样。

**git 读取挪到哪**：范围菜单在 review mod 里，要读计数、commit、分支。现在这些在 pulls-review 的 `bar.js`（`readReview`、`readPicks`）。抽成 `shared/review-git.js`，sync 给 `pulls-review` 和 `review` 两个 mod，各自调用；只读、不写 `.git`，规则不变。

## 3. 标签栏的 Review 栏

- 在 Herdr T3 里（`toggle`）保持 `[计数 │ ▯▮]`，计数仍是快捷入口。
- 单独用 herdr-pulls-review（无 `toggle`）：logo 和它的菜单留着，因为那里没有面板头。

## 4. 自动换行

- 设置里 `Diff` 一行后面加一行 `Lines`：`Scroll` / `Wrap`（同 T3 的 line wrapping，记在 `review.prefs.wrap`，默认 Scroll）。
- 实现：代码行是 mod 自己画的定高行（`ROW = 20`，`CHAR = 7.25` 估宽）。换行时按可用宽度算每行折成几行，行高 = 折行数 × `ROW`，`v_virtual_list` 的尺寸跟着变；宽度变化（拖面板、⤢）时重算。split 时两侧各按半宽算，取大的。
- 风险：`CHAR` 是估计值，不同字体可能差一两个字符；用实测一次字符宽度校正（`on_size_change` 量一段已知长度的文字）。

## 5. 不做

选行批注和交给 agent；GitHub PR 评审；stage / commit / push / 开 PR；忽略空白；隐藏测试文件；T3 的文件树开关（我们的文件栏按宽度自动出现）。

## 6. 验证

- `check-pane.cjs`：范围按钮文字与菜单项（计数、灰掉、选中）、第二页搜索与选择发出的请求、commit 的 SHA 和 `‹ ›`、换行时的行高与宽度变化重算。
- `pulls-review/check.cjs`：去掉 `pick` 命令；`shared/review-git.js` 的读取沿用现有断言。
- `scripts/check.sh` 全绿；demo 窗口默认宽度整窗截图：Changes、Uncommitted、某个 commit、菜单两页、换行开关前后。

## 7. 文档

两种语言的 CHANGELOG、guide、extras、RECIPE，herdr-pulls-review 的 README / RECIPE：顶栏范围按钮代替分支按钮和 commit 切换，新增换行设置。
