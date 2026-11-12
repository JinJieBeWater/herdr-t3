# asciicn wallpaper 安全与边界审查

审查对象为 `36c359ea`，改动基线为父提交 `c72734e0`。这次功能增加图片草稿、三种样式、Apply/Cancel、Studio 导入引导和删除确认，并修复大于 1 MiB 的 `.ans` 保存。按单个用户、可能有多个 Home 副本、会导入自己的图片和外部 `.ans` 的负载审查。

**原始审查结论：Broken，确认四类可复现问题，建议先修复。** 本轮尝试未复现命令注入、SVG 脚本注入或覆盖已有目标文件；这不等于穷尽了所有安全风险。只有第 3 项属于新增 Apply 流程的失败处理缺口，其余也在父版本复现。原始审查没有修改生产代码和安装配置。

## 当前修复说明 / Current resolution

四项已修复，修复基线为 `52c9db96`。[修复验收](fix-acceptance.md) 记录通过的回归、全套门禁、原生回放及边界；[独立审查](fix-review.md) 结论为 Ship。下面保留原始问题、反例及审查边界，不把历史 `broken` 输出当作修复后的结果。

All four findings are repaired from `52c9db96`. The [acceptance report](fix-acceptance.md) records passing regressions, the full gate, native replay and its limits; the [independent review](fix-review.md) returned Ship. The original findings and reproductions below remain historical evidence.

| 项目 / Finding | 当前处理 / Resolution |
|---|---|
| 阴影图块 / Shade tiles | `TILE=40`、转换器 `VERSION=2`，阴影展开后的单块 SVG 低于 1 MiB；旧缓存按版本键重建。 / Size-40 tiles keep shade-expanded SVGs below 1 MiB; converter version 2 rebuilds old caches. |
| 文件名 / Filenames | 保留合法 Unicode、前导短横和普通隐藏名；NUL 分隔枚举与校验元数据，路径不作为选项。拒绝空、`.`、`..` 主干的外部 `.ans`（`.ans`、`..ans`、`...ans`），支持 `.hidden.ans`。 / Preserve valid Unicode, leading dashes and ordinary hidden names, with NUL-delimited metadata and option-safe paths; reject the three unsafe stems, not ordinary hidden files. |
| Apply 失败 / Apply failure | 缓存失败保留草稿、预览和已发布源文件。仅同一草稿内存里的 `savedName` 可在内容核对一致后复用；变化或缺失时按不覆盖规则另存。 / Keep the draft, preview and published source after cache failure; reuse only that draft's saved file after a content match, otherwise save without overwriting. |
| 删除竞态 / Delete race | 确认删除使在途转换失效，取消任务留内存到结束；晚结果不能重建缓存或重新发布列表。 / Confirmed deletion invalidates the active conversion; retain its canceled job in memory until completion and prevent late cache or list publication. |

存储与生命周期的当前约定见 [storage.md](../../internals/storage.md#壁纸草稿)。用户操作说明在双语 [extras](../../user/extras.md#asciicn-wallpaper) / [可选扩展](../../user/extras.zh-CN.md#asciicn-壁纸)。

## 原始必须修复项

### 1. 小型阴影字符画也会触发 1 MiB 写入错误

位置：`ascii-art.js:40-43,183-192`；调用方 `main.js:101-106`。既有问题。

- **是什么：** `.ans` 的阴影字符被展开为多个 SVG 矩形，按固定几何范围分块，每块仍用一次 `writeTextFile` 写入。
- **问题：** `("▓".repeat(160) + "\n").repeat(42)` 只有 **20,202 字节**，却生成 **1,060,714 字节**的单个 SVG，超过原生上限 **1,048,576 字节**。刚修好的 `.ans` 分块保存没有覆盖这个图块写入点。
- **最小修复：** 把 `TILE` 从 80 缩为 40，提升 `VERSION` 以重建旧缓存，并加入最坏阴影图块的字节上限检查；隔离内存中的这个候选已通过相同输入。
- **不修的结果：** 部分正常的 Studio/外部字符画仍无法导入，报相同的文本大小错误。它不会修改源图，也不是远程代码执行问题。

详见 [输入转换审查](input-review.md)，其中也记录了真实 BMP 生产者和最大图片采样网格的检查。

### 2. 中文、短横开头和隐藏文件名会静默导入失败

位置：`main.js:115-116,185,199-203`。既有问题。

- **是什么：** 选择文件后先清理文件名，再通过 shell 枚举、`cksum` 校验源文件并加载缓存。
- **问题：** `图片.ans` 被改名为 `-.ans`，随后 `cksum "$f"` 把它当选项；`-option.ans` 同样失败。`.hidden.ans` 虽然写入成功，却被 `*.ans` 枚举遗漏。三种情况均无通知、未选中、列表为空。
- **最小修复：** 保留合法 Unicode 文件名，统一修正枚举和校验中的选项/隐藏文件处理，并验证成功保存的项目确实进入列表；已有外部 `.ans` 也要走安全的文件名处理。
- **不修的结果：** 普通常见的中文命名图片或 Studio 文件可能“保存了但找不到”，用户以为导入没有发生。

真实文件系统回放结果：

```json
{"filename":"图片.ans","saved":["-.ans"],"imported":[],"selected":null,"notices":0}
```

### 3. 最终缓存写入失败后，Apply 仍然丢弃工作预览

位置：`main.js:149-156,307-309`。新增 Apply 路径的问题。

- **是什么：** Apply 发布 `.ans` 后等待 `refresh` 生成最终图块，再关闭草稿。
- **问题：** 图块写入出错会被 `convertOwned` 捕获，只通知而不把失败传回调用方；`refresh` 正常返回，Apply 随后仍执行 `cancelPreview`。注入一次最终缓存的 ENOSPC 错误后，源 `.ans` 存在，但未选中、没有导入条目，原本可显示的草稿和 SVG 都被清掉。
- **最小修复：** 转换返回明确成功状态，Apply 确认新场景已就绪并选中后才清草稿；失败保留工作预览和已发布文件名，供重试，避免再生成同名副本。
- **不修的结果：** 缓存写入失败时用户失去当前工作预览，目录还留下界面里不可见的 `.ans`。原始图片和已保存的字符数据仍可恢复，不能把它误报为原图丢失。

```json
{"sourceSaved":true,"draftRetained":false,"previousPreviewFilesRetained":false,"imported":[],"selected":null,"notices":["Couldn't import the wallpaper"]}
```

### 4. 删除与转换交错时，旧任务会重新发布已删条目

位置：`main.js:146-153,333-345`。既有竞态。

- **是什么：** 多个 Home 共享源文件；转换读完源文件后，还要异步写入图块和缓存标记。
- **问题：** A 读到更新后的源内容并暂停；B 确认删除该壁纸并移除源和缓存；A 恢复后仍重建缓存、把 `file:Tracked` 加回自己的列表。此时源文件已经不存在，B 的列表为空。
- **最小修复：** 删除时使该文件正在进行的转换失效；发布场景前核对转换代次与源文件校验状态，拒绝过期结果。
- **不修的结果：** 另一个 Home 会出现已删除的幽灵条目，并留下重建的无源缓存；再刷新能清掉它。本轮没有声称它会重新创建源 `.ans`，也没有验证真实 watcher 会在多久后自动纠正。

```json
{"sourceExists":false,"aImported":["file:Tracked"],"bImported":[],"cacheRecreated":true,"selected":"lighthouse"}
```

## 可执行证据

从仓库根目录运行：

```sh
node docs/research/wallpaper-safety-review/repro-filesystem.cjs
node docs/research/wallpaper-safety-review/repro-filesystem.cjs --case=file-name --revision=c72734e0
node docs/research/wallpaper-safety-review/repro-filesystem.cjs --case=delete --revision=c72734e0
node --max-old-space-size=256 docs/research/wallpaper-safety-review/input-repro.cjs
node --max-old-space-size=256 docs/research/wallpaper-safety-review/input-repro.cjs --revision=c72734e0
```

原始审查时，文件系统脚本检查应满足的用户契约，故障输出 `broken` 并以 **1** 退出；**2** 表示复现脚本本身发生意外错误。转换脚本断言当时的超限观察成立，因此 **0** 表示反例被复现，不能把它算成生产功能通过。两个脚本都只加载生产代码，修改仅发生在各自创建的临时目录或内存副本，结束时清理。

## 存活的攻击与覆盖边界

| 契约 | 检查与结果 |
|---|---|
| 文件名/内容不能执行 shell 命令 | 原生命令处理分号、`$()`、反引号、单引号和双引号文件名；正文包含命令状文本，标记文件没有被创建。临时 app 路径本身也包含单引号。 |
| 发布文件不覆盖已有目标 | 真实文件系统中的已有普通文件、目录和符号链接均拒绝覆盖，原内容保持，保存临时目录为空。 |
| 大文件不能损坏 Unicode 或分块顺序 | 2,600,000 字节、含补充 Unicode 字符及 shell 元字符的文本完整保存，逐字符比较一致。 |
| 不可信字符不能注入 SVG/XML | 七组 ANSI/标记边界输入只生成受限文件名和数值图形，没有观察到脚本、事件属性或 URL 注入。 |
| 图片调用方保持有界 | 极端原图比例和最大 960×384 采样网格通过；新增三种图片画法的最大图块在所测最坏模式中均小于写入上限。 |
| 真实 BMP 生产者可被解码 | 审查分工中使用合成图验证 `sips` 和 ImageMagick 的八个输出，解码尺寸及所检颜色正确；没有把任意损坏 BMP 的直接调用误报为可达漏洞。 |

原始审查时的生产生命周期和转换器检查通过；复用了同一 `36c359ea` 上已有的完整 `scripts/check.sh` 及原图大文件原生回放，不重复全量门禁。

未重跑 GUI、真实操作系统磁盘满/权限故障和 watcher 的事件排队；缓存失败与并发采用受控注入/调度，文件读写及 shell 命令使用真实临时文件系统。未做接近 8 MiB 输入的内存耗尽压力测试，不能给出最坏内存或无 DoS 保证。没有检查上游原生图像库的安全性。EXIF 和普通 ASCII 字形的已接受限制不列为新问题。

原始审查仅新增报告及复现脚本，没有修复、同步或删除任何生产文件，也未操作用户图片或安装配置。该轮临时目录已清理。
