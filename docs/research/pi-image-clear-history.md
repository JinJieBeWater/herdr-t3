# Pi 全屏 Kitty 图片清屏丢失：引入提交与版本史

研究日期：2026-11-12。范围：上游 `earendil-works/pi` 的代码与 tag 历史，以及公开工单时间线。下文时间均为北京时间（UTC+8），提交日期另注明作者时间。协议归责与终端实现见 [pi-image-cache-on-clear.md](pi-image-cache-on-clear.md)，查重与发布状态见 [pi-image-clear-upstream-search.md](pi-image-clear-upstream-search.md)。

方法：`gh` 只读 API（commit 列表、文件 patch、compare、releases）+ `git ls-remote --tags` + 按 commit/tag 取单文件原文。**没有安装、运行或回放任何旧版 Pi**：版本判断全部是源码包含关系，不是旧版实测。

整屏清除与逐行清理各自的旧架构用途、为何在新全屏实现中重叠，见 [两层清理的来源](pi-double-clear-origin.md)。

## 0. 结论

1. **直接引入提交**：[`73414d08b94d7db46d3fa66582c8fe3b02dabf72`](https://github.com/earendil-works/pi/commit/73414d08b94d7db46d3fa66582c8fe3b02dabf72)，`fix(tui): optimize alternate-screen image and layout redraws`，Armin Ronacher，作者时间 2026-08-02 20:10:44，提交时间 20:13:32。本次未查到关联 PR（`commits/{sha}/pulls` 返回空），不能据此还原额外的 PR 讨论或审查过程。
2. 该提交一次引入三件互相咬合的东西：`uploadedKittyImages` 缓存 map（`terminal-image.ts` 的 `transmissionGeneration`）、`prepareKittyScreen()` 把已上传的图片行替换成 **placement-only `a=p`**、以及 `fullRedraw` 分支里的 `deleteAllKittyPlacements()`（`a=d,d=a`）。
3. **`fullRedraw` 的 `CSI 2J` 早于该提交**，并由该提交原样保留。旧路径是「`a=d,d=A` 删数据 + `2J` + 每行重新全量传输 `a=T`」，因此 ED2 回收数据无害；新路径改成「`a=d,d=a` 只删 placement + `2J` + 只发 `a=p`」，ED2 就把 Pi 仍认为存在的图片数据删掉。**同一行 `CSI 2J` 本身没变，变的是它前面删的是数据还是 placement、后面还传不传数据。**
4. **源码可追到的最早受影响发布**：`v0.84.0`（2026-08-06 19:07:05 发布）。它是首个同时包含 alternate-screen 渲染器与图片缓存优化的版本；[发布说明](https://github.com/earendil-works/pi/releases/tag/v0.84.0)将 fullscreen 标为实验性模式，可通过 `--tui-mode fullscreen` 或 `/settings` 选择。
5. **本次有直接运行证据的版本**：`v1.5.2`（`b4afdddf`）。证据来自 #12010 的真实 Kitty 前后截图与 resize 复现，以及本机 Herdr 回放 Pi 1.5.2 输出帧、独立 Ghostty 1.4.0 原生 PTY 的协议序列实测。`v0.84.0`–`v1.5.1` 只有源码等价证据，未实测。
6. 同版内还有一次**扩大影响**的改动：`a8ee03b815`（2026-08-03 20:02:27 +08）把「离屏图片立刻 `a=d,d=I` 删缓存」改成「离屏保留到 16 张 / 32 MB 传输 / 64 MB 解码」，于是 Pi 认为数据仍在的窗口从「当前可见」扩到「最近可见」。它和引入提交同属 `v0.84.0`，不是另一个版本的分界。
7. 之后的 `#11890`（2026-11-07 03:42:57）把「图片最后画」从 WezTerm 放开到所有 Kitty 终端，但没有改变此处完整重绘的清屏顺序，不是该回归的引入点。
8. 受影响路径是 fullscreen（alternate-screen）的完整重绘，窗口尺寸变化是稳定触发方式。渲染状态重置导致 `previousScreen` 为空时也会完整重绘；regular 模式走 `TuiMainScreen`，不经过这段代码。

## 1. 旧逻辑：为什么此前没有这个 bug

alternate-screen 渲染器由 [`c13ffe1877`](https://github.com/earendil-works/pi/commit/c13ffe1877) `feat(tui): add alternate-screen renderer`（2026-07-30 18:58:58 +08，Closes #7304）引入。当时 `doRender()` 的重绘段是（[c13ffe1877 的 TuiAltScreen.ts:405-411](https://github.com/earendil-works/pi/blob/c13ffe1877/packages/tui/src/TuiAltScreen.ts#L405-L411)）：

```ts
if (fullRedraw) {
    this.fullRedrawCount += 1;
    buffer += `${this.deleteKittyImages()}\x1b[2J`;      // a=d,d=A：连数据一起删
} else if (imagesNeedRedraw) {
    buffer += this.imageProtocol === "iterm2" ? "\x1b[2J" : this.deleteKittyImages();
}
for (let row = 0; row < height; row++) {
    ...
    buffer += `\x1b[${row + 1};1H\x1b[2K${screen[row] ?? ""}`;   // 图片行 = 完整 a=T 传输
}
```

`deleteKittyImages()` 返回 `\x1b_Ga=d,d=A,q=2\x1b\\`，`screen[row]` 里是 `renderImage()` 产出的完整 `a=T,…` 传输。所以旧行为是「**先删数据、清屏、再重新上传**」：ED2 是否回收数据无关紧要，因为紧接着就是重传。此前没有记录终端已上传图片的缓存表，因而不会跳过数据传输、只按旧 ID 放图。

## 2. 直接引入：73414d08b9（2026-08-02）

提交标题为 `fix(tui): optimize alternate-screen image and layout redraws`，改动 8 个文件（`terminal-image.ts` +86、`tui-alt-screen.ts` +43、`layout.ts` +6，含 3 个测试文件）。`packages/tui/CHANGELOG.md` 的记载就是意图：

> Fixed alternate-screen redraws retransmitting Kitty image data, dropping adjacent row content when reusing placements, and rendering fixed-basis scroll content twice per frame.

即：**为了不再重复传输图片数据**（大图 base64 重传很贵），新增「已上传就不再传」的缓存。

同一提交的三块关键代码：

**(a) 缓存与传输代次**（`terminal-image.ts`）

```ts
interface RegisteredKittyImageMetadata extends KittyImageMetadata { transmissionGeneration: number }
let kittyTransmissionGeneration = 0;
export function registerKittyImageMetadata(metadata: KittyImageMetadata): void {
    kittyTransmissionGeneration += 1;
    ...
    kittyImageMetadata.set(metadata.imageId, { ...metadata, transmissionGeneration: kittyTransmissionGeneration });
}
```

**(b) 生成只按 ID 显示的指令**（`terminal-image.ts`）

```ts
export function deleteAllKittyPlacements(): string {   // 只删显示位置，保留数据
    return "\x1b_Ga=d,d=a,q=2\x1b\\";
}
export function getKittyImagePlacement(line: string): KittyImagePlacement | undefined {
    ...
    const sequence = `\x1b_Ga=p,q=2,${controls.join(",")}\x1b\\`;   // 不重传，只放置
    return { imageId, transmissionGeneration, sequence,
             replacementLine: `${line.slice(0, match.index)}${sequence}${line.slice(transmissionEnd)}` };
}
```

**(c) 重绘分支：ED2 前只删 placement，行内改成 `a=p`**（`tui-alt-screen.ts`，73414d08b9 版 802-830 行）

```ts
const hadUploadedKittyImages = this.uploadedKittyImages.size > 0;
const preparedKittyScreen = redrawImages && this.imageProtocol === "kitty"
    ? this.prepareKittyScreen(screen)              // 已上传 → replacementLine(a=p)；否则原行(a=T)
    : { lines: screen, staleImageDeletion: "" };
if (fullRedraw) {
    this.fullRedrawCount += 1;
    const clearImages = this.imageProtocol === "kitty" && hadUploadedKittyImages
        ? deleteAllKittyPlacements()               // 新增：只删 placement
        : this.deleteKittyImages();                // 旧路径：a=d,d=A
    buffer += `${clearImages}\x1b[2J`;             // CSI 2J 未变
}
```

`prepareKittyScreen()` 的判定核心：

```ts
if (this.uploadedKittyImages.get(placement.imageId) === placement.transmissionGeneration) {
    return placement.replacementLine;              // 跳过 a=T，只发 a=p
}
```

**因果**：`hadUploadedKittyImages` 为真 → 只发 `a=d,d=a` + `CSI 2J`；Ghostty/kitty 的 ED2 回收所有失去 placement 的数据（见协议报告 §2）；随后每行只剩 `a=p`，终端回 `ENOENT`，Pi 又用 `q=2` 抑制了错误，于是静默留白。旧代码在同一位置发的是 `a=T`，所以同一个 ED2 没有可破坏的对象。

`CSI 2J` 的存在与位置在这次提交里没有任何改动 —— 它从渲染器诞生（c13ffe1877）起就在 `fullRedraw` 分支，直接沿用。

## 3. 同一版本内扩大：a8ee03b815（2026-08-03）

[`a8ee03b815`](https://github.com/earendil-works/pi/commit/a8ee03b815) `fix(tui): cache recently offscreen Kitty images`（2026-08-03 20:02:27 +08）改 `prepareKittyScreen()`：

- 引入前：不在当前帧里的已上传图片立刻 `deleteKittyImage(imageId)` 并从 map 删除。缓存只覆盖「本帧可见」。
- 引入后：离屏图片保留在 map 里，直到超过 `MAX_CACHED_OFFSCREEN_KITTY_IMAGES = 16` / `32 MB` 传输 / `64 MB` 解码，才逐个驱逐（`evictedImageDeletion`，参数 `transmissionBytes`、`estimatedDecodedBytes`）。

对本案的影响：Pi 相信「终端里还有这份数据」的范围从「可见图片」扩大到「最近可见图片」。清屏回收数据后，最近离屏的缓存 ID 也会失效。这扩大了同一个回归的影响面，不是新的引入点；它与 73414d08b9 同属 `v0.84.0` 发布内容。

## 4. 之后的改动：都不改引入点

| 提交 | 日期（+08） | 与本案关系 |
| --- | --- | --- |
| [`803f0e906d`](https://github.com/earendil-works/pi/commit/803f0e906d) `preserve fullscreen images in WezTerm` | 2026-09-20 06:25 | 新增 `drawKittyImagesLast`，但 `&& isWezTerm` 门控；不碰 `fullRedraw` 分支 |
| [`672000c80c`](https://github.com/earendil-works/pi/commit/672000c80c) `preserve WezTerm images while scrolling` | 2026-10-03 00:44 | 引入 `changedRows`、`imageAnchorsNeedRedraw`、`imageCellsNeedRedraw`，仍限 WezTerm；`fullRedraw` 里的 `a=d,d=a` + `CSI 2J` 原样 |
| [`4622edb792`](https://github.com/earendil-works/pi/commit/4622edb792) `draw fullscreen Kitty images after the rows they cover on every terminal (#11890)` | 2026-11-07 03:42 | 删掉 `isWezTerm` 门控，所有 Kitty 终端都「最后画图片、被覆盖行变化即重放」。重放走的是缓存复用（`a=p`），故 `a=p` 路径出现频率上升；`fullRedraw` 分支与 ED2 顺序未变 |

结论：这些后续改动没有修正本案相关分支：`hadUploadedKittyImages ? deleteAllKittyPlacements() : deleteKittyImages()` 后紧跟 `\x1b[2J`，完整重绘仍可能引用失效的图片 ID。

## 5. 版本证据（源码包含关系，逐 tag 核对）

方法：`compare/{tag}...{commit}` 判祖先（`behind` = tag 包含该提交），并对每个 tag 取 `packages/tui/src/tui-alt-screen.ts` 原文，确认 `hadUploadedKittyImages` + `deleteAllKittyPlacements()` + `\x1b[2J` 的组合仍在。

| 版本 | 发布日期（+08） | 含 alt-screen | 含缓存复用 + ED2 组合 |
| --- | --- | --- | --- |
| `v0.83.0` | 2026-07-29 22:30 | 否（`src` 里无 `TuiAltScreen.ts`） | 否 |
| `v0.84.0` | 2026-08-06 19:07 | 是 | **是（最早）** |
| `v0.84.1` … `v0.84.4` | 08-07 … 08-28 | 是 | 是 |
| `v0.85.0` / `v0.85.1` | 09-04 / 09-05 | 是 | 是 |
| `v0.86.0` / `v0.86.1` | 09-19 / 09-20 | 是 | 是 |
| `v0.87.0` / `v0.87.1` | 09-21 / 09-22 | 是 | 是 |
| `v0.99.0` … `v0.99.2` | 09-29 / 09-30 | 是 | 是 |
| `v1.0.0` … `v1.0.4` | 10-01 … 10-05 | 是 | 是 |
| `v1.1.0` … `v1.4.0` | 10-07 … 10-21 | 是 | 是 |
| `v1.5.0` / `v1.5.1` / `v1.5.2` | 11-02 / 11-09 / 11-10 20:25 | 是 | 是 |

`compare/v0.84.0...73414d8` = `behind`（v0.84.0 包含它），`compare/v0.83.0...73414d8` = `ahead`（不包含）。`v1.5.2` 的 tag 指向 `b4afdddf44e059c67ccf5097e5317d913521b470`；该版本源码里的问题代码在 [`tui-alt-screen.ts:1737-1752`](https://github.com/earendil-works/pi/blob/v1.5.2/packages/tui/src/tui-alt-screen.ts#L1737-L1752)。

**源码证据与运行证据**

- 最早可能：`v0.84.0`，依据是源码包含关系与上述代码结构在 `v0.84.0`–`v1.5.2` 全部一致。**未运行旧版**，不作行为保证。
- 本次已直接验证：`v1.5.2`。证据是 #12010 的实机截图/复现，加上本机 Herdr 回放 Pi 1.5.2 输出帧与独立 Ghostty 1.4.0 PTY 的序列实测（见协议报告 §3、§5）。
- 两者之间的版本：源码等价、行为未实测。要说「0.84 一定坏」只能引用源码推断。

## 6. 报告与修复（公开时间线，UTC+8）

| 时间 | 事件 |
| --- | --- |
| 11-10 20:25:43 | `v1.5.2` 发布，含无条件 `CSI 2J` + 缓存复用 |
| 11-10 22:53:10 | 报告者 Artraxon 在自己的 fork 提交 [`0f43dc61`](https://github.com/Artraxon/pi/commit/0f43dc615807aefb14e9ea4ddf0f78c9a0bed63a) `fix(kitty): Clear cached kitty images before redraw`：`tui-alt-screen.ts` **+1/−0**，一行 `if (fullRedraw) this.uploadedKittyImages.clear();`（在 `hadUploadedKittyImages` 之后、`prepareKittyScreen` 之前）→ 清空 map 迫使重传 |
| 11-10 23:04:19 | 报告者创建 [#12010](https://github.com/earendil-works/pi/issues/12010)：Kitty 前后截图、改窗口高度复现、根因顺序（删 placement → 清屏 → 复用旧 ID）与上述一行方案，分支 `fix-kitty-image-redraw` |
| 11-10 23:04:33 | `github-actions` 按新贡献者规则自动关闭 #12010（非维护者判定非 bug；唯一评论也是 bot） |
| 11-11 20:16:21 | `robopipi`（bot）创建 [#12047](https://github.com/earendil-works/pi/pull/12047)，body 记 `Requested by @badlogic`，head `triagent/issue-12010` |
| 11-11 20:16:23 / :24 | 加 `fix-available` 并关联 PR；badlogic 重开 #12010 |
| 11-11 21:29:20 | badlogic 合并 PR，提交为 [`be2744d956`](https://github.com/earendil-works/pi/commit/be2744d956dd52ee79fc4c7a9444491a3090194f) |
| 11-11 21:29:23 | #12010 再次关闭为 completed |

两个方案对同一根因，取的是不同方向，**没有公开讨论显示前者被否决**：

- **报告者：清缓存重传。** `if (fullRedraw) this.uploadedKittyImages.clear();` —— 保留清屏，使 `prepareKittyScreen()` 不再命中缓存，让图片行退回完整 `a=T`。代价是 resize 时重新传输图片。由于 `hadUploadedKittyImages` 在这一行之前已计算，不能说此方案必然改为 `a=d,d=A`。
- **上游最终：跳过冗余 ED2，保留缓存。** `be2744d9` 把 `fullRedraw` 分支改成

```ts
if (this.imageProtocol === "kitty" && hadUploadedKittyImages) {
    // Kitty frees image data without placements on ED 2, which would break placement-only reuse.
    // Every row is cleared with EL 2 below, so keep the uploads and skip the screen clear.
    buffer += deleteAllKittyPlacements();
} else {
    buffer += `${this.deleteKittyImages()}\x1b[2J`;
}
```

即：有缓存时只删 placement、**不发 ED2**（文字行由既有的逐行 `CSI 2K` 清），无缓存时保持旧行为。同提交附回归测试 `keeps uploaded Kitty images across a full redraw`（断言 resize 后有 `a=p`、无 `a=T`、无 `CSI 2J`）、`packages/tui/CHANGELOG.md` 的 `Unreleased / Fixed` 条目。截至核对无含该修复的正式版（latest 仍 `1.5.2`）。

PR 特别说明虚拟终端不模拟 Kitty 回收图片数据，新增测试因此检查输出指令。这解释了测试的覆盖边界；不能把普通字符画面正确等同于终端中的图片缓存仍然存在。

## 7. 可展示的一行因果链

`2026-07-30` alt-screen 渲染器：`a=d,d=A` + `CSI 2J` + 每行全量 `a=T`（ED2 无害）
→ `2026-08-02` `73414d08`「别重复传图片」：`a=d,d=a` + `CSI 2J` + 每行 `a=p`（ED2 从此吃掉数据）
→ `2026-08-03` `a8ee03b8`「离屏也留着」：错误假设的覆盖范围从可见扩到最近可见
→ `2026-08-06` `v0.84.0` 首次发布，之后每个版本都带着这段结构到 `v1.5.2`
→ `2026-11-10 23:04` #12010 报告（真实 Kitty 截图 + resize）
→ `2026-11-11 21:29` #12047 / `be2744d9`：有缓存时跳过冗余 ED2，保留 `a=p` 复用

## 8. 未决与限制

- **没有运行任何旧版 Pi**：`v0.84.0`–`v1.5.1` 的结论只有源码包含关系与结构一致性，属推断；不能表述为「实测 0.84 起就坏」。
- 未追查 `73414d08` 之外更早的 `terminal-image.ts` 图片元数据注册史（`registerKittyImageMetadata` 早于该提交存在），与本案的复用假设无关。
- Herdr 与 Ghostty 侧的时间线不在本文件；`f8b40a02`（Ghostty 8 月）只是把 ED2 收进独立 `clearScreen` 路径并保留 scrollback，**其前后 ED2 都会回收 unplaced 数据**，不能当作「新引入」。
- 自动关闭 #12010 的是 `github-actions`（新贡献者规则），不是维护者表态；报告者的重传方案未被公开否决，最终实现另走一条路。
