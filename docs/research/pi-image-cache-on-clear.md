# Pi 图片在清屏后复用旧 ID：规范与上游实现归责研究

研究日期：2026-11-12。研究对象：Kitty graphics protocol 官方规范、kitty 与 Ghostty 的上游源码/测试，以及独立 Ghostty 1.4.0 上的原生 PTY 实测。不含修复实施。

上游状态补充（2026-11-12）：同案 [#12010](https://github.com/earendil-works/pi/issues/12010) 已由 [PR #12047](https://github.com/earendil-works/pi/pull/12047) 修复并合入 `main`；有图片缓存时跳过 `CSI 2J`，采用本文 §4.2 的方向 1。最新正式版仍为受影响的 `1.5.2`，详见 [查重与发布状态](pi-image-clear-upstream-search.md)。

## 0. 结论

1. **规范明确说清屏应清图（should），但不保证清屏后数据还在。** `CSI 2J`（ED2）之后 image data 是否保留没有规定；小写删除命令与清屏是不同操作，不能把前者的数据保留行为套到后者。
2. **实现事实：两家参考实现都在 ED2 时连带释放失去 placement 的数据。** Ghostty 的 `clearScreen` 在 ED2 路径上显式回收所有未 placed 的图片，并有上游测试锁住；kitty 的 ED2 走 `grman_clear(all=false)` → `filter_refs(free_images=true)`，同样把无 ref 的图片整条删除。
3. **独立 Ghostty 复现**：Ghostty 1.4.0（原生 PTY，非 Herdr）中，`仅 ED2 → a=p` 与 `a=d,d=a + ED2 → a=p` 都是 `ENOENT: image not found`；`no-clear`、`仅 a=d,d=a`、`仅 EL2` 全部 `OK`。因此问题并非 Herdr 独有。
4. **归责**：应明确称为 **Pi 清屏后复用失效图片 ID 的 bug**。称为“不兼容”能描述现象，却没有说明 Pi 对缓存存活作出了错误假设。

## 1. 规范原文（一手）

来源：kitty graphics protocol，<https://sw.kovidgoyal.net/kitty/graphics-protocol/>。以下引文为规范正文原样。

### 1.1 清屏应清图，其它擦除不得影响图形

> §Interaction with other terminal actions（<https://sw.kovidgoyal.net/kitty/graphics-protocol/#interaction-with-other-terminal-actions>）

- "The clear screen escape code (usually `<ESC>[2J`) **should** also clear all images. This is so that the clear command works."
- "The other commands to erase text **must have no effect on graphics**. The dedicated delete graphics commands must be used for those."

要点：ED2 使用 should，不能改写为 MUST；`EL`、`ED0/1` 之类的其它擦除使用 must have no effect。此段没有保证 ED2 后的 image data 存留。

### 1.2 删除命令：小写留数据是"不必然释放"

> §Deleting images（<https://sw.kovidgoyal.net/kitty/graphics-protocol/#deleting-images>）

- 小写删除变体允许删除显示位置而不必释放数据，原文是 "without necessarily freeing up the stored image data"，以便之后重新显示。
- 大写变体还会删除不再被其它位置引用的数据。
- 配额不足时，终端会优先回收没有显示位置的图片。

要点：这些描述针对专用删除命令，并没有约束随后执行的 ED2 必须保留数据。

### 1.3 存储配额

> §Image persistence and storage quotas（<https://sw.kovidgoyal.net/kitty/graphics-protocol/#image-persistence-and-storage-quotas>）

终端应设置图片存储配额；加入新图片导致超额时，可以删除旧图片。图片 ID 并不意味着数据永远存活。

### 1.4 重传语义

> §Display images on screen（<https://sw.kovidgoyal.net/kitty/graphics-protocol/#display-images-on-screen>）

为同一 ID 重传时，新数据会替换旧图片及其显示位置；之后需要创建显示位置。这个条款描述重传语义，并没有保证旧数据能跨清屏存活。

### 1.5 规范层面的判定

- **明确建议**：ED2 应清掉屏幕上的图片（should）。
- **无规定内容**：ED2 之后 image data 是否保留。规范既没要求保留，也没要求释放；"unplaced 数据可被删"在别处被明确允许。
- 因此"清屏后用旧 ID `a=p`、不重传"在规范上**没有存活保证**，只能由具体终端的实际行为验证；本次验证结果是两家实现都不支持该假设。

## 2. 实现事实

### 2.1 kitty（master `1eaecbcead73f57f80d29dbc19a1671b042fa736`，2026-11-12）

- ED2 的入口：`erase_in_display` 对 mode 2/3 调 `grman_clear(self->grman, how == 3, self->cell_size)`（[screen.c:3093](https://github.com/kovidgoyal/kitty/blob/1eaecbcead73f57f80d29dbc19a1671b042fa736/kitty/screen.c#L3093)）。
- `grman_clear` 把 **`free_images` 恒为 true** 传给 `filter_refs`，`all` 只影响"清哪些 ref"（[graphics.c:2644-2645](https://github.com/kovidgoyal/kitty/blob/1eaecbcead73f57f80d29dbc19a1671b042fa736/kitty/graphics.c#L2644-L2645)）。
- `filter_refs` 收尾：某图片已无任何 ref 且 `free_images` 为真 → `remove_image_itr` → `free_image`，整条数据释放（[graphics.c:2472](https://github.com/kovidgoyal/kitty/blob/1eaecbcead73f57f80d29dbc19a1671b042fa736/kitty/graphics.c#L2472)、[graphics.c:252-253](https://github.com/kovidgoyal/kitty/blob/1eaecbcead73f57f80d29dbc19a1671b042fa736/kitty/graphics.c#L252-L253)）。
- 与 `d=a` 小写对照：`handle_delete_command` 传 `free_images = (g->delete_action == 'A')`（[graphics.c:2725](https://github.com/kovidgoyal/kitty/blob/1eaecbcead73f57f80d29dbc19a1671b042fa736/kitty/graphics.c#L2725)）。**只删 placement、保数据是删除命令的语义，不是 ED2 的语义**——这正是"仅去掉 `CSI 2J` 就保图"的机制。
- 细节：ED2 的过滤条件是 ref 底边仍在屏幕内（[graphics.c:2626-2629](https://github.com/kovidgoyal/kitty/blob/1eaecbcead73f57f80d29dbc19a1671b042fa736/kitty/graphics.c#L2626-L2629)），完全滚入回滚区的图片不被 ED2 清理；`ED3`（`how == 3`）连它们一起清。
- 配额逻辑与规范一致：`apply_storage_quota` 第一步就 "remove unreferenced images, even if they have an id"（[graphics.c:321-336](https://github.com/kovidgoyal/kitty/blob/1eaecbcead73f57f80d29dbc19a1671b042fa736/kitty/graphics.c#L321-L336)），未 placed 的数据在压力下先走。
- `a=p` 找不到 id：`ENOENT: Put command refers to non-existent image with id: …`（[graphics.c:1442-1450](https://github.com/kovidgoyal/kitty/blob/1eaecbcead73f57f80d29dbc19a1671b042fa736/kitty/graphics.c#L1442-L1450)）。

**结论（代码推断，未在 kitty 实机跑）**：`grman_clear` 以 `free_images=true`、`free_only_matched=false` 遍历图片，所以连此前已没有 ref 的图片也会回收。Pi 先删除 placement、再 ED2、最后复用旧 ID 的流程会失败。

### 2.2 Ghostty（Herdr 0.1.15 内置版本 `291fd050b…`；发布 tag v1.4.0）

- Herdr 0.1.15 的 [THIRD-PARTY-NOTICES](/Applications/Herdr.app/Contents/Resources/THIRD-PARTY-NOTICES) 明确写 `Ghostty (libghostty-vt)` 取自 <https://github.com/ghostty-org/ghostty/tree/291fd050b9e9c293c8adb6a140742649b7e42d3a>（第 18556-18557 行）。
- ED2 → 清图：`Terminal.eraseDisplay` 的 `.complete` 分支调 `screens.active.kitty_images.clearScreen(...)`（[Terminal.zig:3705-3712](https://github.com/ghostty-org/ghostty/blob/291fd050b9e9c293c8adb6a140742649b7e42d3a/src/terminal/Terminal.zig#L3705-L3712)），注释即 "ED2 clears visible placements but preserves graphics that are wholly in scrollback."；`.scroll_complete`（ED3 等）走同一函数（同文件 3640-3647）。
- `clearScreen` 做三件事：删可见 placement（并释放对应图片）→ 清理孤儿 relative placement → **遍历全部图片 `deleteIfUnused`**，即把从未 placed 的图片也回收（[graphics_storage.zig:1168-1192](https://github.com/ghostty-org/ghostty/blob/291fd050b9e9c293c8adb6a140742649b7e42d3a/src/terminal/kitty/graphics_storage.zig#L1168-L1192)；v1.4.0 同函数在 [graphics_storage.zig:1369-1392](https://github.com/ghostty-org/ghostty/blob/v1.4.0/src/terminal/kitty/graphics_storage.zig#L1369-L1392)）。函数注释直说："Unlike protocol `d=A`, a terminal clear also reclaims images that were already unplaced."
- 与删除命令的对照：`removeOrphans` 注释写明"every other removal path retains image data"（[graphics_storage.zig:663-666](https://github.com/ghostty-org/ghostty/blob/291fd050b9e9c293c8adb6a140742649b7e42d3a/src/terminal/kitty/graphics_storage.zig#L663-L666)）——即小写 `a=d` 只删 placement，`2J` 才回收数据。
- 上游测试锁住该行为："storage: erase display preserves scrollback and reclaims unplaced images"（[graphics_storage.zig:3031](https://github.com/ghostty-org/ghostty/blob/291fd050b9e9c293c8adb6a140742649b7e42d3a/src/terminal/kitty/graphics_storage.zig#L3031)；v1.4.0 第 3243 行）：ED2 后于回滚区的 placement/图片保留，屏幕上的与被 placed 之外的图片全部消失。

### 2.3 两家实现对比

| 行为 | kitty | Ghostty |
| --- | --- | --- |
| `a=d,d=a`（小写） | 删可见 placement，保数据（`free_images=false`） | 同（`deleteVisiblePlacements(…, false)`） |
| `CSI 2J` | 删可见 placement，并回收没有 ref 的图片数据，包括已 unplaced 的图片 | 同样回收没有 placement 的图片 |
| 完全滚入回滚区的图片 | ED2 不清（底边条件） | ED2 保留 |
| 无 placement 的数据 | ED2 回收；配额压力下也优先回收 | ED2 回收 |
| 复用已消失的 id | `ENOENT` | `ENOENT: image not found` |

## 3. 独立 Ghostty 1.4.0 实跑

环境：原生 Ghostty 1.4.0（`TERM_PROGRAM=ghostty`、`TERM_PROGRAM_VERSION=1.4.0`，独立 PTY，不经 Herdr）。每例先 `a=d,d=A,q=2` 清场，再 `a=T,f=100,i=7,q=0,C=1,c=20,r=8;<1×1 PNG>` 上传（回 `OK`），再按下列擦除序列后发 `a=p,i=7,q=0,C=1,c=20,r=8`，读回 `_Gi=7;…` 应答。

| 用例 | 擦除序列 | `a=p` 结果 |
| --- | --- | --- |
| no-clear | （无） | `OK` |
| delete-placements-only | `a=d,d=a,q=2` | `OK` |
| ED2-only | `CSI 2J` | `ENOENT: image not found` |
| Pi-full-redraw | `a=d,d=a,q=2` + `CSI 2J` | `ENOENT: image not found` |
| EL2-only | 光标移到图片首行 + `CSI 2K` | `OK` |

五组结果均通过独立 JSON 断言。临时原生 PTY 驱动、结果文件和测试窗口在检查完成后清理；没有改动 Ghostty 的配置。

- 该实测只覆盖与 Pi 对应的**协议序列**，不是"在 Ghostty 里跑完整 Pi 会话"，也不覆盖 Pi 的其它绘制细节。
- 实测区分了规范与实现：规范说 ED2 应清图；Ghostty 实现同时回收数据。`EL2` 不影响图形，与规范一致。

## 4. 归责与建议

### 4.1 对用户质疑的回答

- **"应该叫 Pi 的 bug"**：成立，且指认点明确——Pi 在发出 `CSI 2J` 之后，仍用旧 ID `a=p` 且不重传数据，把"清屏后数据仍在"当作协议保证。规范没有这条保证，Ghostty 不提供，kitty 源码同样不提供（配额条款更直接说明 unplaced 数据可被删）。
- **"独立 Ghostty 是否也有"**：有。Ghostty 1.4.0 原生 PTY 上 `ED2-only` 与 Pi 全量重绘序列均返回 `ENOENT`。
- **更准确的表述**：这是 Pi 图片缓存失效处理的 bug；Herdr 暴露了该问题，独立 Ghostty 也能触发。无需把问题限定为这两个应用的特定版本组合。
- 补充事实：Pi 的 `a=d,d=a` 已经完成规范指定的清图动作，紧随其后的 `CSI 2J` 对清图多余，却把自己的图片数据一起清掉；这正是"仅去掉 `CSI 2J` 就保图、重传即恢复"的原因。

### 4.2 最小修复方向（未实施，仅列出）

1. 重绘时不再发 `CSI 2J`（清文本用 `EL`/`ED0` 等不影响图形的擦除），保留 `a=d,d=a` + `a=p`。
2. 保留 `CSI 2J` 时，使 Pi 的已上传图片缓存失效，并在清屏后重传数据再创建 placement。当前绘制指令使用 `q=2` 抑制错误，不能假定客户端会收到 `ENOENT` 后自动恢复。

## 5. 未决与限制

- **未在 kitty 实机验证**：kitty 侧结论来自上游源码（master `1eaecbc`），属代码推断；Ghostty 侧有源码、上游测试与 1.4.0 实跑三重证据。
- **Herdr 侧**：此前在真实 Herdr 0.1.15 中回放了原会话图片对应的 Pi 1.5.2 输出帧，确认完整重绘后变空白；仅删除该帧唯一的 `CSI 2J`，图片即保留，重新上传也恢复。Herdr 的 THIRD-PARTY-NOTICES 及 v0.1.15 子模块指向上述 Ghostty commit。
- **未穷举其它终端**（WezTerm、iTerm2、Konsole 等）对该序列的行为；按规范"ED2 应清图"的要求，它们至少都不被要求保留数据。
