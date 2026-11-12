# Pi 清屏后图片消失：上游已报告并修复

核对日期：2026-11-12。配套实验及协议研究见 [图片缓存研究](pi-image-cache-on-clear.md)。

## 结论

已有完全相同的工单，不再起草重复工单：

- [#12010 — Kitty images disappear on full redraw](https://github.com/earendil-works/pi/issues/12010)：报告 Pi 1.5.2 在完整重绘后只留下图片空白占位，已关闭，标签为 `bug`、`fix-available`。
- [#12047 — fix(tui): keep Kitty images across fullscreen full redraws](https://github.com/earendil-works/pi/pull/12047)：2026-11-11 13:29:20 UTC 已合并，明确修复 #12010。
- 修复提交：[be2744d956dd52ee79fc4c7a9444491a3090194f](https://github.com/earendil-works/pi/commit/be2744d956dd52ee79fc4c7a9444491a3090194f)。

截至核对时，修复已在 `main`，尚未进入正式版；最新正式版及 npm `latest` 仍为 `1.5.2`。

## 为什么确认是同一个问题

#12010 的复现是显示图片后改变窗口高度，触发完整重绘；图片消失，但预留空间仍在。报告指出先删除图片显示位置，再清屏，然后重画。

#12047 则明确写出我们实测的全部指令链：

```text
a=d,d=a 删除显示位置
→ CSI 2J 回收失去显示位置的图片数据
→ a=p 按旧 ID 显示
→ 图片已不存在，留下空白
```

这与 Herdr 0.1.15 原图输出帧回放、独立 Ghostty 1.4.0 原生 PTY 实测一致。不是仅凭标题相似判定重复。

## 上游采用的修复

当协议为 Kitty 且存在已上传图片缓存时，完整重绘不再发送 `CSI 2J`，只删除显示位置，再按原 ID 放图。清除文字仍由原有逐行 `CSI 2K` 完成，因此无需重新上传图片。其他清屏路径保留原行为。

同一提交包含：

- `packages/tui/src/tui-alt-screen.ts`：上述条件分支。
- `packages/tui/test/tui-alt-screen.test.ts`：新增 `keeps uploaded Kitty images across a full redraw`，窗口 resize 后断言有 `a=p`、无 `a=T`、无 `CSI 2J`。
- `packages/tui/CHANGELOG.md`：在 `Unreleased / Fixed` 记录该修复。

PR 明确说明其回归测试检查输出指令，虚拟终端不模拟 Kitty 回收图片数据，且没有在真实 Kitty 上复测。已有本机实验支持这条清屏因果链，但没有安装或验收上游修复版。

## 发布状态

| 位置 | 核对结果 | 来源 |
| --- | --- | --- |
| PR #12047 | 已合并到 `main` | [PR](https://github.com/earendil-works/pi/pull/12047) |
| `v1.5.2` | 仍包含无条件 `CSI 2J` 的旧路径 | [版本源码](https://github.com/earendil-works/pi/blob/v1.5.2/packages/tui/src/tui-alt-screen.ts#L1743-L1753) |
| GitHub 最新正式版 | `v1.5.2`，2026-11-10 发布 | [Release](https://github.com/earendil-works/pi/releases/tag/v1.5.2) |
| npm `@earendil-works/pi-tui/latest` | `1.5.2` | [注册表](https://registry.npmjs.org/@earendil-works%2fpi-tui/latest) |

`v1.5.2` 的 tag 指向 commit `b4afdddf44e059c67ccf5097e5317d913521b470`（[tag API](https://api.github.com/repos/earendil-works/pi/git/ref/tags/v1.5.2)），与源码文件的 blob SHA 是不同对象。修复提交晚于该版本发布。

## 查重范围

检索当前上游 `earendil-works/pi` 的开放和关闭 issue、PR、discussions，使用 `kitty`、`ghostty`、`image`、`fullscreen redraw`、`ENOENT` 等关键词。旧地址 `badlogic/pi-mono` 已重定向至同一仓库，历史工单不需要分两处报告（[旧地址 API](https://api.github.com/repos/badlogic/pi-mono)）。

紧邻但不同的案例包括 [#11890](https://github.com/earendil-works/pi/pull/11890) / [#11835](https://github.com/earendil-works/pi/issues/11835)（Orca 图片只显示首行）、[#11411](https://github.com/earendil-works/pi/pull/11411)（iTerm2 重绘）、[#9586](https://github.com/earendil-works/pi/issues/9586)（Herdr 滚动重影）。本次精确匹配项是 #12010 / #12047；未找到单独的同案 discussion。

本次仅查询公开记录和源码，没有发布工单、评论或反应，没有修改或升级已安装的 Pi。待包含修复的正式版发布后，再验证实际会话中的图片重绘。
