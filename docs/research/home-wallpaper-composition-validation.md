# Home 壁纸导入构图验收

实施基线：`dcc3514`。对应[实施计划](home-wallpaper-composition-plan.md)。

## 实现与自动检查

普通图片固定生成 Dots；图片和 Studio `.ans` 都先预览 Fill/Fit、位置及 1–4 倍缩放，Apply 后固定。构图独立保存在 `asciicn-wallpaper.placements`，旧壁纸继续使用原来的填满与主体对齐。

| 检查 | 结果 |
| --- | --- |
| `check-ascii-art.cjs` | 通过；Dots 色调、颜色、横竖比例、空白边缘、BMP 与通用 ANSI 字形解析 |
| `check.cjs` | 通过；预览、拖动边界、键盘定位与缩放、重置、调整时无文件写入、Apply/Cancel、迟到任务与删除 |
| `check-filesystem.cjs` | 13 个真实文件系统场景全部 survived；含大文件原子保存、不覆盖、失败重试、缓存重建及多 Home 并发 |
| `herdr-app check`、TypeScript | 通过 |
| `scripts/sync.sh`、`scripts/check.sh` | 已执行；最终输出 `all checks passed` |
| 独立 `ponytail-review` | 修复后回放原复现，结论 Ship |

首次默认 Dots 断言在旧实现上失败，修改后通过。独立审查发现的两个并发问题也先复现失败，再验证修复：另一 Home 删除后，等待缓存的 Apply 不能恢复已删选择或构图；旧文件扫描不能清掉刚保存的同名构图，即使新旧构图值相同。原生 Slider 的键盘焦点和按键处理放在外层 `div`。

## 界面验收

使用现有 `word-acceptance` VM 中的 Herdr 0.1.15、独立 HOME/app 配置与 core。VM 无 viewer、VNC、共享目录或剪贴板桥；输入均发生在客体。默认侧栏宽 256px，桌面 1280×800。验收人亲自查看以下完整窗口截图；PNG 按仓库约定保留本机、不提交。

| 场景 | 结果与截图 |
| --- | --- |
| 图片固定 Dots、两种铺放 | [Fill](home-wallpaper-composition-evidence/15-preview-dots.png)、[Fit](home-wallpaper-composition-evidence/16-fit.png)，无旧风格选项，控件完整可见 |
| 真实指针拖动、缩放与重置 | [拖动](home-wallpaper-composition-evidence/17-fill-dragged.png)、[滑条到 2.64×](home-wallpaper-composition-evidence/18-slider-zoom.png)、[Reset 回到 Fill/1×/居中](home-wallpaper-composition-evidence/19-reset.png) |
| Apply 与重开 | [预览定稿](home-wallpaper-composition-evidence/20-composed-fit-drag-zoom.png)、[Apply 后](home-wallpaper-composition-evidence/21-applied.png)、[重开后](home-wallpaper-composition-evidence/22-reopened.png)构图一致；保存为 contain、约 1.68×、x≈0.651、y=0.5 |
| 键盘缩放 | [Shift-Tab 到缩放条，方向键从 1× 调到 1.10×](home-wallpaper-composition-evidence/30-keyboard-zoom.png) |
| Cancel | [横图预览](home-wallpaper-composition-evidence/29-wide-preview-ready.png)后取消，[恢复原画](home-wallpaper-composition-evidence/31-cancel-preserved.png)；共享选择和构图不变，未发布 `wide.ans` |
| Studio `.ans` | [保留 Braille 的预览](home-wallpaper-composition-evidence/33-studio-preview.png)、[Apply 后](home-wallpaper-composition-evidence/35-studio-applied.png)；保存文件与原文件 `cmp` 完全一致，构图与图片分别保存 |
| 保存后固定 | [再次真实拖动](home-wallpaper-composition-evidence/36-saved-drag-fixed.png)不能修改已保存的画面、构图或选择 |
| 适配与主题 | [窗口尺寸变化](home-wallpaper-composition-evidence/24-resized.png)、[切换为 Catppuccin Mocha](home-wallpaper-composition-evidence/39-dark-theme-changed.png)、[侧栏关闭](home-wallpaper-composition-evidence/40-sidebar-closed.png)及恢复后，构图记录不变；主题染色和重新布局正常 |

最终 `herdr-app status` 的 `errors=[]`。缓存失败与恢复由真实文件系统用例覆盖，未在 GUI 中重复模拟。Linux/Windows 未做实机验收。驱动的纯悬停没有触发原有右下切换器，因此该入口的鼠标悬停未验证；本轮以已有键盘 focus 命令显示入口，再用客体真实指针完成选图、拖动、滑条和保存。没有把派发成功当作交互通过，也没有据此归因或修改原有悬停逻辑。

## 安装与范围

已同步本机安装。核对两份现有 `.ans` 的 SHA-256 均未改变，当前选择仍为 `nebula`，未创建用户构图数据。三个独立仓库同步后均无差异，因此无需额外提交。

已退出自建演示窗口、停止独立 core、清理任务临时目录和脚本；通过客体系统菜单正常关机，`lume get` 确认 VM 为 `stopped`。保留本机验收截图，未操作宿主焦点、键鼠或剪贴板。

删除三张旧风格图标及 Braille/Blocks 的图片编码分支；通用 `.ans` 的 Braille、方块等字形绘制保留。未加入平铺、拉伸、旋转、保存后编辑；未处理历史 Home 闪空白问题。
