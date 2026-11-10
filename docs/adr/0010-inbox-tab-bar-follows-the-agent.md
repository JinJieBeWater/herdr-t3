# Inbox 的标签栏以 agent 为主角，折叠用 Herdr 原生 zoom

Inbox 的单位是 agent，Herdr 的标签却可以装几个 pane、几个同级 agent 和程序。原来 Inbox 的标签栏长得和 Lists 一样，让人以为规则也一样，还把一个标签当成了一个 agent。所以显示 Inbox 时，标签栏照 T3 的 thread 标题分成两半：左边是面包屑（space / 父 agent / 当前查看的 agent），说“在和谁说话”；右边是胶囊，说“有什么工具”（被 zoom 挡住的程序、子 agent 的标签、space 的程序标签）。“在看谁”和 Inbox 点亮卡片用同一条规则，标签栏、卡片和焦点永远指向同一个 agent。

折叠只用 Herdr 原生 zoom：它按标签记住、只改这一屏、不动分屏结构。布局不替人 zoom，也不把 pane 搬走（park）；从卡片进入分屏的标签只移动焦点。

## Considered Options

- **进入分屏标签时自动 zoom 到 agent**：否决。zoom 是人的选择，自动 zoom 会藏起人刚分出来的程序，还原后再进来又被 zoom，状态说不清是谁设的。
- **同标签的 agent 放到右侧，和程序一起做分段**：否决。左右的意义就混了：右边该是工具，同级 agent 是说话的对象，切换它们应该和卡片高亮一起动。
- **同标签的 agent 在面包屑里并排成切换器**（实现过一版）：否决。标题位置该说的是正在看谁，并排几个就成了第二份卡片列表，还要为当前那项另画底色；同一标签里的其他 agent 本来就有卡片，也能点它的窗格。
- **只在 agent 标签和程序标签之间加分隔线**：否决。外观仍和 Lists 一样，一个标签仍被当成一个 agent，同标签的几个 agent 分不出来。

## Consequences

- 标签栏多了一份记忆：每个标签最后看的 agent（`navigation.js` 的 `lastIn`），只在内存里，重启后回退到标签里的第一个 agent。
- 焦点在程序或 Inbox 列出的 mod 卡片上时，面包屑留着这个标签最后看的 agent，不亮。不含 agent 的标签按进入方式分：从标签条进入的工具标签属于这份工作，面包屑留着这个 space 最后看的 agent，变暗，点它回去；点面包屑的 space 或按 `cmd-t` 开始新的事之后只有 space，直到再看某个 agent。两头都试过：一律沿用会把上一个 agent 的名字带进新开的终端，一律只显示 space 会让点一下工具就丢掉上下文。
- Inbox 下 agent 的窗格单独显示时，窗格标题不再写名字，名字只在面包屑里说一次。
- zoom 中的标签展开成各个窗格（取代名字后的 `Z`）在两种模式下相同，这不是 Inbox 的规则（[0002](0002-inbox-rules-stay-in-inbox.md)）。
