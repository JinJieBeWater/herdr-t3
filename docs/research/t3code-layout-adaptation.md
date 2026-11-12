# 把 T3 的详情与面板控件放进 Herdr

日期：2026-11-12。当前处于研究与设计讨论，未修改实际布局。底部终端不在范围。

结合仓库规范后的实施范围、模块职责、迁移与验收步骤集中在[改造方案](layout-controls-refactor-plan.md)；本文保留截图对照和工具调研。

用户随后限定了详情卡的范围：所有宽度下只按需弹出，不固定占位；仅保留机器／目录、Open in、现有 Actions 三行。依据是同日 `17-24-50_373.png`、`17-25-29_218.png`、`17-25-47_162.png`、`17-26-00_155.png` 四张 Snapzy 截图。以下接入建议与示意已按此更新。

用户现状截图：`/Users/jinjiebewater/Pictures/Snapzy/Snapzy_2026-11-12_17-07-26_314.png`。图中是 `旁路审计 | ⌄` Actions 按钮与右侧面板开关。另只读查看了当前 Herdr 全窗帧，没有切换用户的 space、标签、面板或焦点。

## 直接对应：T3 已把脚本放进详情卡

T3 的 `ThreadDetailsPanel` 在 Workspace 部分渲染 `ProjectScriptsControl displayMode="panel"`，保留运行、选择、添加、更新、删除脚本的回调。[ThreadDetailsPanel.tsx](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsPanel.tsx:198)

同一个运行／下拉控件在 `panel` 模式下使用 `ghost`，显示完整脚本名，卡片内仍有分隔线与下拉；不是取消 Actions，而是改变它的容器与层次。[ProjectScriptsControl.tsx](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ProjectScriptsControl.tsx:278)。菜单点行执行，行尾另有编辑入口，编辑的指针事件不会连带执行该脚本。[脚本菜单](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ProjectScriptsControl.tsx:178)

Herdr 当前 Actions 由 `mods/t3-actions` 独立渲染在顶栏：主按钮运行上次使用的动作，箭头打开列表，列表可执行、编辑和新增。它是全局动作列表；运行目录依次取动作配置、当前窗格、同标签的终端、当前 space。单纯移动入口不意味着把数据改成按 space 保存。[主按钮与菜单](/Users/jinjiebewater/my/personal/projects/herdr-t3/mods/t3-actions/main.js:51) · [数据与执行目录](/Users/jinjiebewater/my/personal/projects/herdr-t3/mods/t3-actions/main.js:21)

## 当前显得奇怪的原因（设计判断）

1. 一个带边框、带文字的执行按钮和一个轻量布局开关占据右上角。前者随最后使用的动作换名字，后者负责面板显示；该区域的视觉重心与布局职责不一致。
2. 现有控件属于 `work` 内的 `tabs-row`，右侧 `panel` 是另一个根级列。面板打开后，原右上角跟着工作列左移；面板头再提供自己的放大和关闭。面板放大时整个 `work` 隐藏，原控件也随之隐藏。[layout](/Users/jinjiebewater/my/personal/projects/herdr-t3/layouts/herdr-t3.json:84) · [面板头](/Users/jinjiebewater/my/personal/projects/herdr-t3/mods/t3-chrome/main.js:133) · [放大](/Users/jinjiebewater/my/personal/projects/herdr-t3/shared/panel.js:36)
3. T3 将工具面板开关保持在窗口右上角；只把详情入口移到其所属的聊天区右端。按钮的位置表达了它控制哪块内容。[既有研究](t3code-layout-controls.md)

## 接入建议（尚未确认实施）

```text
面板收起： 主工作区标题                         [详情] [工具面板]
面板展开： 主工作区标题       [详情] │ Files / Review [放大] [工具面板]
面板放大：                         Files / Review [恢复] [工具面板]
```

- 详情卡只放三行：机器／目录、Open in、现有 Actions。Actions 复用现有运行／下拉／编辑能力与按钮组，不重新设计其功能。卡片不显示 space 概览、agent 状态、Todo、Review 或 Initialize Git 等区块。
- 右面板继续承载现有 Files / Review；面板开关固定在窗口右上角，放大／恢复跟在它旁边，详情入口随主工作区定位。隐藏面板恢复上次页面、退出放大等能力已有实现，可沿用。[shared/panel.js](/Users/jinjiebewater/my/personal/projects/herdr-t3/shared/panel.js:8)
- 详情始终默认收起，只由点击入口弹出；不按宽度切成常驻卡片，不预留宽度，也不因弹出或收起而改变终端尺寸。浮层关闭应归还焦点，内部菜单先关闭，避免 Escape 连带关闭下层或送到终端程序。内联工具面板不会因普通外部点击关闭。T3 的具体事实与框架默认行为边界见[交互补充](t3code-layout-interactions.md)。
- Herdr 当前固定的 Files / Review 页和 T3 可新增、关闭的 surface tabs 属于不同内容模型。当前示意保留现有页面；T3 中关闭标签、隐藏面板的语义分别记录在研究里，没有把一个页面切换按钮伪装成销毁标签的关闭按钮。[ADR 0015](../adr/0015-panel-pages-stay-independent.md)
- 移入详情后，所有宽度下均需要先打开详情再运行动作，比当前顶栏的一键入口多一次点击。

## 可点击示意与验证

[show-me-layout-controls.html](show-me-layout-controls.html) 展示三行弹出卡片、两入口开关、详情位置变化、工具页恢复、放大／恢复、嵌套 Escape、点击外部和窄宽度布局。配色取用户现状图的深色层次；顶栏保留 Herdr 的 40px，按钮用 T3 的 28px / 16px 图标。已移除常驻宽度、自动展开和宽度门槛。

这是独立 HTML 交互示意，状态只留在本次打开的内存里，不写 Herdr 配置、不执行 Actions、不实现真实文件树或 diff；也没有实现 T3 的右键配置、surface 增删或拖宽。它没有声称已完成原生宿主接入或 T3 的真实点击验收。

检查脚本：[check-layout-controls-preview.cjs](check-layout-controls-preview.cjs)。运行：`NODE_PATH=/Users/jinjiebewater/.bun/install/global/node_modules node docs/research/check-layout-controls-preview.cjs`。它使用已安装的 Playwright 与 Chrome，无新依赖。用户反馈已复现为「详情应默认收起，不常驻」失败断言；更新后回放默认收起、仅三行、弹出前后终端宽度不变、详情开关、嵌套 Escape、点击外部、切页恢复、放大后关闭、390px 窄宽度与页面错误检查。

通过 `open -g -a 'Google Chrome'` 在后台打开示意；OmniWM 查询确认用户焦点仍为原 Herdr 窗口。没有变更生产 mod、layout、用户配置或安装目录，也没有删除产品文件。

## Ryūgi 作为设计协作载体

用户提出 [Innei/ryugi](https://github.com/Innei/ryugi) 是否更适合做设计。查阅版本 `eec52b7` 的 [README](https://github.com/Innei/ryugi/blob/eec52b7/README.md) 与[安装说明](https://github.com/Innei/ryugi/blob/eec52b7/docs/install.md)：Artboard 支持画出方案、点选与像素批注，HTML 支持可操作页面，Verify 支持批准方案与实际结果对照；评论和选择可回到发起的 agent 会话，适合减少本轮截图来回描述。

官方 Pi 包支持评论回传，但会在启动与压缩后注入 `using-ryugi`、加载整套 skills；仅 Artifacts 安装当前只支持 Claude Code。当前只评估适用性，没有安装或改变 Pi 配置。后续若采用，设计内容仍按已确认的三行弹出卡片收敛，现有开发与审查约定不因载体变化而被替换。
