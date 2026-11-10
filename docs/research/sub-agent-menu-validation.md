# 子 agent 菜单验收

2026-11-10。实现基线：`01f84f5`；设计依据：[整套布局中的定位与对照稿](agent-popover-design.html)。

菜单保留 280px 宽、28px 单行和层级缩进，删除重复统计标题；左侧仍是官方程序图标，最右侧使用 Agents 同样的转圈、`!` 徽章和 idle 圆环。父级聚合状态与子 agent 自身状态分开表达。时间、状态文字、peek、键盘选择和共用悬停详情卡沿用原规则。

验证结果：

- `scripts/sync.sh` 已同步本机安装；三个独立 mod 仓库没有产生差异。
- `scripts/check.sh` 通过，输出 [all checks passed](sub-agent-menu-validation/check.log)。随后补强了无标题断言、首次状态上报前的测试，单独重跑 `node -r ./scripts/render-guard.cjs mods/t3-pane/check-pane.cjs` 通过。
- `ponytail-review` 无阻塞项；两项建议均已处理：精确断言列表不带标题，以及明确首次状态上报前不显示状态。
- 独立 demo 窗口，默认 256px 侧栏、zoom 1.1、Catppuccin Mocha。亲自检查了完整窗口及局部：单行不再重复统计，混合状态下缩进和状态列完整，长名称截断后仍保留时间与状态。
- demo 与本机 `herdr-app status` 的 `errors` 均为空。

截图：[单个子 agent](sub-agent-menu-validation/single.png)、[混合状态与长名称的完整窗口](sub-agent-menu-validation/mixed.png)、[同一截图的菜单局部](sub-agent-menu-validation/detail.png)。

demo 使用 `scripts/demo/stage.sh` 的临时副本，按项目说明以本地空仓库替代联网克隆，并将窗口放入空工作区。测试进程沿用仓库的 `fake-agent`；菜单通过临时 stagehand 调用与按钮相同的 `openOverlay` 参数打开。截图前短暂激活 demo，再恢复原焦点。没有运行真实模型或使用 API key。

真实鼠标点击、悬停及实体键盘操作未验证；对应的 peek、键盘选择、详情时序和自动关闭由原有行为测试覆盖。截图不证明真实点击或悬停通过。

删除项：旧菜单统计标题、计数计算和程序图标角落的状态彩点；没有删除文件或用户数据。临时 demo、测试进程和源码副本在验收后清理。
