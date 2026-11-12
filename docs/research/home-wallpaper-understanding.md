# Home 壁纸模组：行为与实现理解

核对日期：2026-11-12。源码基线：`ee935ef182ba67fa6ab8bc9fb06972eb65098d0d`。
研究对象为 `extras/mods/asciicn-wallpaper`；本轮只读实现与本机配置，新增此报告。

## 核心理解

它是一个可替换的 Home 页面：占据 Home 的主区域，用主题色展示静态字符画。图片与 Studio 文件最终都变为 `.ans`，再以 SVG 图块显示。原图的形状、明暗和色相被保留为近似表达，实际颜色在显示时取自 Herdr 主题。

~~~mermaid
flowchart LR
    A[自己的图片] --> B[Braille / Blocks / Dots 预览]
    B -->|Apply| C[保存 .ans]
    D[Studio 的 .ans] --> C
    C --> E[转换并缓存 SVG 图块]
    F[内置四张画] --> G[Home 显示]
    E --> G
    H[当前主题的 ANSI 色与前景色] --> G
~~~

## 1. 它怎样进入 Home

- `mod.json:1` 声明 `"home": true`；布局设置扫描有该声明的 mod，加入 **Home shows** 选项。选择后写入 `t3.settings.homeMod` 并立即重配 Home。（`mods/t3-chrome/settings.js:30-47`）
- Home 是本机的真实隐形 space，不占侧栏项目序号；里面放一个 mod 或一个 shell。壁纸被选为 Home 内容后，导航负责打开对应 mod 标签。Home 使用不带窗格标题栏的区域，合适条件下标签栏收至 8px。（`mods/t3-tabs/navigation.js:26-76,159-179`；`mods/t3-tabs/main.js:309-319`；`docs/adr/0005-home-is-a-hidden-space.md`）
- 默认收起正在查看的 agent 后回到 Home，取决于 **After putting away** 偏好；这让壁纸成为工作间隙的落脚画面。（`docs/adr/0004-putting-away-lands-on-home.md`；`mods/t3-chrome/settings.js:11-13`）

## 2. 人看到的操作

自带 **Lighthouse、Mountain dusk、Nebula、Ember** 四张画。右下角附近出现 `‹ 画名 › +`：上一张、画名、下一张、添加；导入的画多一个删除按钮。通常在指针进入右下角 340×104 区域时显示，添加卡片打开或进入键盘操作时也保持显示。（`extras/mods/asciicn-wallpaper/main.js:393-427`；`extras/mods/asciicn-wallpaper/main.js:35-37`）

| 入口 | 行为 |
| --- | --- |
| **Choose image…** | 选择图片，默认 Braille；同一张图可切换 Blocks、Dots，直接在整个 Home 预览。 |
| **Apply** | 保存生成的字符画，等最终图块可用并选中后，才退出预览。 |
| **Cancel** | 回到原来的壁纸，不改变共享选择；若此前失败的 Apply 已发布文件，该文件仍保留。 |
| **Import Studio file (.ans)…** | 导入完成的字符画，保留其字符风格，转换后选中；不进入图片样式选择。 |
| **Create in asciicn Studio…** | 打开 Studio 制作并导出 .ans，再回到这里导入。 |
| 删除 `×` | 显示画名并再次确认；成功删除后改选前一张，并阻止旧转换任务重新发布这张画。 |

依据：`main.js:199-234`、`main.js:263-320`、`main.js:332-355`、`main.js:364-390`、`main.js:457-480`。

## 3. 图片、字符和主题怎样连接

- 普通图片先由 macOS 的 `sips` 或 Linux ImageMagick 缩成 BMP。网格为 96 行，列数依纵横比限制为 16–480；解码后做亮度拉伸，再生成 Braille、象限方块或半调圆点的真彩色 .ans。（`main.js:263-320`；`ascii-art.js:202-318`）
- 公用转换器解析 ANSI 颜色和字符，将字形画成单色 SVG。Braille、方块、象限、阴影、半调圆点和部分线条有专门形状；其他字符近似为竖立圆头短条。每块记录位置、主题色槽和透明度。（`ascii-art.js:22-67`；`ascii-art.js:156-197`）
- 已是 ANSI 16 色的输入沿用其色槽；真彩色按色相桶、亮度档映射到 `ansi0..15`；灰色映射到 `foreground`。实际主题颜色由 `theme()` 在显示时提供，SVG 本身保留单色遮罩。（`ascii-art.js:95-106,181-182`；`main.js:394-407`）
- 图块按 **40 格高**分割，转换期间分步让出执行机会。内置图由 `scripts/wallpaper.mjs` 提前生成，也使用相同转换器；来源为 asciicn，MIT 许可。（`ascii-art.js:14-20`；`scripts/wallpaper.mjs:1-36`）
- 显示按比例铺满 Home，围绕预设横向主体位置裁切。高度缩小时等稳定 250ms 再采纳，以免进入 Home 的短暂布局变化导致画面跳动。宽度足够大、需要填满时也会放大；通常侧栏宽度变化主要改变两侧露出的区域。（`main.js:397-407`）

**与主题选择的关系：**壁纸使用 ANSI 色槽和前景色，而非 UI 的 accent 字段。若两个主题的 ANSI 表相同，彩色部分也会相同。本机刚加入的五套 T3 配色，在相同明暗模式下都与默认 T3 Code 共用 ANSI16；这点已逐文件核对。

## 4. 数据与失败恢复

~~~text
~/.config/herdr-app/asciicn-wallpaper/
├── *.ans        保存的字符画；更新 mod 不覆盖它们
├── .tiles/      按文件名缓存 SVG，scene.json 最后写入
└── .preview/    本次草稿和原子保存的临时产物
~~~

所选壁纸保存在共享键 `asciicn-wallpaper.scene`，导入项值为 `file:<名字>`。草稿的原图引用、像素、样式和版本只留在本次运行；保存后没有恢复成图片草稿继续编辑的入口。（`main.js:60-96`；`main.js:263-320`；`extras/mods/asciicn-wallpaper/main.js:393-427`）

缓存依据源文件 `cksum` 与转换器 `VERSION=2` 判断是否有效；源变化、缓存未完成或版本变化会重建。多个 Home 副本共用同名转换任务，文件监听只响应 .ans 变化。保存采用分块写入、拼接完整文件、原子发布且不覆盖已有目标；Apply 的缓存失败保留草稿，重试前核对该草稿已保存文件的内容。（`main.js:116-190`；`main.js:240-260`；`main.js:332-355`）

## 5. 本机实际情况

本轮只读核对：

- `t3.settings.homeMod = "asciicn-wallpaper"`，已启用壁纸 Home；所选画为 `nebula`（星云）。
- 已保存两张导入画：`138149243_p0.ans`（1,146,951 字节，缓存 574 图块）、`146943457_p0.ans`（762,914 字节，缓存 237 图块）；两份 scene.json 均未标记失败。
- 已安装的 mod.json、main.js、ascii-art.js、scenes.js 与仓库源文件逐字节一致。
- `scripts/update.sh:31` 只更新 mod 目录；用户 .ans 在其外，保持独立。

## 6. 已验证与边界

本轮相关检查均退出 0：

- `node extras/mods/asciicn-wallpaper/check-ascii-art.cjs`：颜色、字形、纵横比、图片网格和图块边界。
- `node extras/mods/asciicn-wallpaper/check.cjs`：预览、Apply、Cancel、迟到结果、导入、确认删除。
- `node extras/mods/asciicn-wallpaper/check-filesystem.cjs`：11 个真实文件系统场景，含 Unicode/隐藏名、原子保存、失败重试、转换中源变更与删除。

亲自查看了既有原生验收的 Braille、Blocks、Dots 整窗截图；它们是历史证据，本轮没有重放 GUI。未更改实现、当前选择、原图或导入文件。

当前边界：图片颜色会近似，普通字母轮廓不保留；EXIF 旋转不处理；保存后无法恢复原图草稿；Windows 没有原生文件选择入口，以文件夹导入作为后备。已有“离开 Home 较久后短暂空白”的历史调研尚未复现原始触发，本轮没有验证或修复它，不能将其认定为已解决。（`main.js:19-22,458-480`；`docs/research/wallpaper-home-loading/README.md`）
