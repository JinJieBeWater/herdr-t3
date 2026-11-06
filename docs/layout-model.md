# 布局的行为模型

状态：已实施。行为说明以 [RECIPE.zh-CN.md](../RECIPE.zh-CN.md) 为准；本文保留决策和取舍。

## 理念

系统只在需要人时才出声，下一步看什么由人决定。

遇到冲突时按这个顺序裁决：

1. **行为**看哪个更省注意力。"T3 这样做"不再是理由。
2. **视觉**照 T3：间距、动效、控件样式不用逐个论证。
3. **实现**只用 mod API。为贴合理想行为要新增模拟层、成本又过高时，放弃这个行为并写进已知限制；确实值得的能力单独列成给 Herdr 的需求。已有的模拟不主动拆。

## Lists 和 Inbox

两个模式对等，只是组织方式不同：Inbox 按注意力组织，Lists 按项目组织。**行为规则相同。**

| 项目 | 决定 | 决定前 |
| --- | --- | --- |
| 标签栏内容 | Inbox 收窄到当前工作周边，Lists 显示全部。这是唯一保留的差异，上/下一个标签和 `cmd-1…9` 跟着它走 | 不变 |
| 标签状态标记 | Inbox 不显示，Lists 显示，已 Settle 或 Snooze 的不亮 done | Lists 全亮 |
| 关闭正在看的 agent | 回 Home | Lists 落到右邻 |
| 关闭其他标签 | 回上一个显示过的标签 | Lists 落到右邻 |
| 按键切回 space | 回到上次在那里显示的标签 | Lists 落到 Herdr 记的标签 |
| `cmd-]` / `cmd-[` | 按当前侧栏画出来的行走，到头就停 | Lists 用 `agent.next`，会绕回去，还含折叠行 |
| Settle 和 Snooze | 两边都生效。`cmd-shift-s` 两边都能用，底栏 Undo 两边都有 | 只在 Inbox |
| Lists 里已 Settle 或 Snooze 的行 | 留在原位，按 idle 显示，不分组，不加按钮；Snooze 中工作的 agent 不计入开关的工作数 | 普通行 |
| 隐藏侧栏 | 当前模式继续生效，只是看不见 | 标签栏按 Inbox，按键按 Herdr，Settle 无效 |
| 隐藏时的 Undo | 显示在标签栏，5 秒 | 没有 |

### 隐藏时怎么继续生效

Herdr 的隐藏副本仍然存活，定时器继续跑，只是不绘制、收不到 `<mod>.<command>`。所以把 Inbox 的计算从 `render()` 里抽出来，隐藏时由定时器驱动；命令走 `shared`。

这也从根上解决了"隐藏后状态过时"这一类问题，之前靠在各个读取方补 `stillSettled` 这类规则绕开。

## Review

Review 是 space 的事，不是 agent 的。agent 和 space 是多对一：决定时的快照里，9 个有 agent 的 space 没有一个跨仓库，4 个有多个 agent，最多 7 个共用一个 worktree，diff 没法归到某个 agent 头上。

**每个 space 一个 Review，一张卡。**位置可以是独立标签或分屏，由 `openIn` 决定，默认仍是分屏。

- **入口：** 分屏的 Review 在别的标签时，点计数跳到它所在的标签，不再新开。
- **卡片：** 标签和分屏都有。焦点在分屏 Review 上时，点亮 Review 的卡，不再点亮旁边 agent 的卡。
- **退出：** ×、Settle 都回到打开 Review 前的地方：标签回上一个标签，分屏留在旁边的 agent 上。这是"Settle 回 Home"的唯一例外，因为看完 diff 通常要回去跟 agent 说话。
- **Bar 和切换分开：** bar 是当前 space 的状态和入口，切换是 Review 窗格自己的事。

```text
标签栏：      [标签…]      3 uncommitted │ 5 ahead │ ↑2 │ ↓1 │ [logo]  [▶ Actions]
Review 窗格顶栏：          ‹ Commit 2 of 5 ›  ▾
```

### Bar

- 留在标签栏右侧，和 Actions 同一组。这一侧的含义是"当前 space 的操作"。
- 计数常驻，每段可点，直接打开对应的 diff。用户的使用场景是 agent 停下后看改动、提交或推送前看一遍、扫一眼计数。
- 不用彩色：颜色在这个布局里表示 agent 状态。窄窗口原本靠颜色区分数字，改用图标。
- logo 固定在最右，计数增减只影响左侧。
- agent 工作时计数照常更新，不淡显也不冻结：数字必须真实。
- logo 菜单只有一个含义，选 review 什么。Commits 和 Branches 都留着：收在菜单里不占注意力，干净的默认分支上它也是唯一入口。

### 窗格

`‹ Commit 2 of 5 ›` 和这个 review 内的 commit 列表（含 All changes）搬进 Review 窗格自己的顶栏。

### 分析

自动分析只在点计数打开时才触发，也就是 `analyze: true` 且 Analyze automatically 打开。菜单选择和窗格内切换都不触发。

## 对现有用户

有真实用户（决定时 herdr-t3 有 139 star、8 fork，近两周 1236 个独立 clone）。直接改行为，不做开关；需要手动操作的写清迁移步骤，放在 CHANGELOG 和 README 的 Update。单独发布的 `herdr-t3-inbox` 不传 `home`，行为不变。

## 已知限制

- Inbox 副本第一次显示后才启动，这次运行里还没显示过 Inbox 时，隐藏状态下算不了它的顺序和 Settle。
- Home 切到其他布局时仍然可见。
- 远程 space 没有 bar，jin.review 的 daemon 只监听本机。

## 取舍

- **否决"Inbox 是唯一模型"：** Lists 是按项目工作的另一种方式，不是 Inbox 的附属。
- **否决"Review 是 agent 的一步"：** 见上面的多对一。这也是 Review 卡片保留的原因，它是 Inbox 里唯一的 space 级对象。
- **否决 `[Review ▾]` 单按钮：** 用户会扫计数，收进菜单就看不到了。
- **Lists 不分 Settled 组：** 否则 Lists 会变成第二个 Inbox。
