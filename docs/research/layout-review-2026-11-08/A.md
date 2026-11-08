# A：数据存储与状态

审查基线：当前完整工作树，`HEAD=fc7f6c3bafe09bfdd924d45845fca8848c3cff40`。按一个人、本机一到几个窗口、连接若干 core、同时几十个 agent 判断。已读 AGENTS、GLOSSARY、中文 RECIPE、全部 ADR 和中文使用指南；共享代码以 `shared/` 为准。

确认 7 项问题，其中 4 项必须修、3 项应该修。以下场景均重新核对过调用方；1、2、3、4、6、7 另用仓库源码与现有假 Herdr 夹具在内存中回放，5 用历史布局与宿主存储实现交叉确认。

## 必须修

1. **旧的 Settle 清理写入能覆盖刚完成的新 Settle**（`mods/t3-inbox/main.js:118`、`mods/t3-inbox/main.js:130`、`mods/t3-inbox/main.js:212`）

   - **是什么**：同一终端的 label 写入允许同时在途，`w.unsure` 用来保证快速撤销最终收敛。
   - **问题**：agent 原有 `settled=500:1`，开始工作触发自动清理（`main.js:219`）；清理尚未完成，它结束第 2 轮，人点卡片 Settle，发出 `settled=2000:2`（`actions.js:51`）。让新 Settle 先落、旧清理后落，最终 core 的 `settled` 为空，agent 又回到 Active。第二个值与旧快照不同，`w.unsure` 始终为 false，新值一回读就被移出 pending，最后也不会补写。两次请求都成功仍能复现。
   - **最小修法**：同一地址、同一 label 只要发生重叠写入，就保留最后意图并标为待收敛，不要限定为“新值等于当前快照”；沿用现有的在途写结束后补写机制。增加上述“清理旧轮次 → 新轮次 Settle”的反序回放。
   - **不修的后果**：远程延迟下，用户成功做出的 Settle 会被更早的后台维护操作撤销；当前快速 Undo 检查覆盖不到它。

2. **后台窗口会消耗另一个窗口还没看过的 Woke**（`mods/t3-inbox/main.js:230`、`mods/t3-inbox/main.js:231`、`mods/t3-inbox/row-model.js:71`）

   - **是什么**：到期 Snooze 在“正在查看”时清除标签，这同时消除 Woke。
   - **问题**：窗口 A 原来选着 agent X，随后留在后台；人在窗口 B Snooze X，B 回 Home。A 的选中位置仍是 X，到期后 A 的定时计算照样执行 `snoozed=`，虽然没人回来看它。回放 `window.active=false`、X 仍 focused、`snoozed=2000`，在时间 2001 得到 `label vps/A snoozed=`。宿主的 `agents().focused` 只表示本窗口的选中位置，不包含窗口活动状态（参考宿主 `src/window.rs:1732`）；Herdr 自己标已读时则检查活动窗口（同文件 `:1513`）。
   - **最小修法**：仅对“人已看过”和“查看时开始新一轮”这两个清理条件，加上 `window().active`；失败自动唤醒继续独立执行，不要停止后台的到期计算。
   - **不修的后果**：开着多个窗口时，后台选中位置能替人清除所有窗口共用的 Snooze 标签，真正返回时没有 Woke 提醒。

3. **卡片 Settle 写失败后，置顶永久丢失且 Undo 被撤掉**（`mods/t3-inbox/actions.js:49`、`mods/t3-inbox/actions.js:51`、`mods/t3-inbox/main.js:124`、`mods/t3-inbox/main.js:128`）

   - **是什么**：Settle 先写本机的 `agents.pins` 取消置顶，再异步写 core 标签。
   - **问题**：对已置顶的远程 agent 点卡片 Settle，恰好连接暂时失败。失败分支只回滚 pending，随后把 notice 计数减成 0 并关闭；已经删除的 pin 没有恢复。回放结果为 `pins=[]`、`pending={}`、`notice.live=false`，同时确实出现离线错误提示。`t3-tabs.settle()` 已经在写成功后才取消 pin（`mods/t3-tabs/main.js:258`），两个入口的失败行为不一致。
   - **最小修法**：卡片路径同样在 `settled` 写成功后再取消 pin；如果继续保留乐观更新，则失败时按原位置恢复该 pin，保留期间新加的其他 pin。
   - **不修的后果**：一次没有完成的远程操作会改掉持久化的置顶顺序，而且撤销入口也消失，只能人工重新置顶和排序。

4. **两个 Review 窗格保存不同设置，也会互相覆盖**（`extras/mods/review/settings.js:30`、`extras/mods/review/settings.js:41`、`extras/mods/review/settings.js:48`、`extras/mods/review/settings.js:80`）

   - **是什么**：各窗格打开设置时各读一份 daemon 设置，修改任何字段后，把整份旧快照 PUT 回去。
   - **问题**：两个窗口的 Review 设置都已打开并读到 `locale=en, model=old`；A 把语言改成 `zh-CN` 并成功保存，随后 B 只把模型改成 `new`。B 仍提交它缓存的 `locale=en`，最终语言被改回英语。这个回放不需要同时写入。另在单窗格连续修改语言、模型时，两次 PUT 反序落地也会把新模型退回旧值。daemon 的 PUT 确实整体替换设置（参考 `pulls-review/packages/cli/src/daemon/server.ts:139`）。
   - **最小修法**：保存函数接收本次修改的字段；同一 daemon 的窗格共用顺序保存队列，每次读取最新设置、只合并本次字段后再 PUT。跨进程同时编辑的保证需要 daemon 的局部更新或版本条件写入。
   - **不修的后果**：改语言会撤回别处刚选的 agent/模型，改模型也会撤回语言；界面里各自的旧快照还会继续显示“保存成功”的值。

## 应该修

5. **从添加 Home 之前的版本更新，Inbox 旧存储会失去读取入口**（`scripts/update.sh:39`、`layouts/herdr-t3.json:55`、`mods/t3-inbox/main.js:40`、`mods/t3-inbox/main.js:60`）

   - **是什么**：更新承诺保留 `data/` 中的折叠、收纳区和顺序记忆，但只保留文件，没有迁移 mod 实例的存储身份。
   - **问题**：真实历史版本 `5d482d6^` 的 Inbox props 是 `{newMenu, picker}`，当前默认布局又加入 `home`。Herdr 按完整 props 的哈希选取 `data/<mod>/store-<hash>.json`（参考宿主 `src/mods.rs:1154`—`:1165`）；`update.sh` 直接换成当前布局，Inbox 就读到另一份空存储。旧 `changes`、space 筛选及各收纳区开合仍在旧文件，却不再被读取。这与使用指南 `docs/user/guide.zh-CN.md:65` 的保留承诺冲突，也不属于文档已声明的 Focus 改名迁移。
   - **最小修法**：为这个已知旧 props 身份做一次存储迁移，再替换布局，并添加从 `5d482d6^` 布局升级的夹具；持久化身份以后应保持稳定。
   - **不修的后果**：普通升级会让 Inbox 的筛选、开合和顺序记忆看起来全部重置；文件虽然仍在，用户没有恢复入口。

6. **归还未读状态的写入失败会被当作成功丢掉**（`mods/t3-tabs/main.js:403`、`mods/t3-tabs/main.js:405`、`mods/t3-tabs/main.js:406`）

   - **是什么**：程序自行退出导致 Herdr 短暂选中右邻时，`payBack()` 负责归还被误消耗的 done 和 Woke。
   - **问题**：离开右邻后，代码先把 `o.seen=true` 或清空 `o.snoozed`，直接发起 `hc()`，随即删掉 owed 记录；没有等待结果、检查退出码或处理拒绝。让 `hc` 返回离线失败，回放仍得到 `owed.size=0`、通知为空，而 core 中未读状态没有恢复。同文件已有会检查结果并提示的 `writeLabel()`（`:233`），这里绕过了它。
   - **最小修法**：等待写入成功后才清除对应 owed 字段，复用已有的失败提示；失败时在现有有效期限内保留记录供后续重试，并防止每帧重复发起在途请求。
   - **不修的后果**：短暂掉线会静默丢掉未读 done 或 Woke；重连也不会再补偿，用户无法知道这个提醒被漏掉了。

7. **Review 的旧“标为已审”请求能撤销后来的取消已审**（`extras/mods/review/diff.js:54`、`extras/mods/review/diff.js:61`、`extras/mods/review/diff.js:64`）

   - **是什么**：已审复选框立即更新界面，每次点击独立发送持久化请求；`marking` 只是计数，没有约束写入顺序。
   - **问题**：同一文件先勾选已审，再在前一次请求完成前取消。让取消请求先落地，旧的勾选请求后落地，最后 daemon 保存 `reviewed=true`，与最后一次点击的 `false` 相反。源码回放结果为 `lastUserChoice=false, persisted=true, pending=0`；随后回读只会把错误的旧选择重新显示出来。
   - **最小修法**：同一文件版本的已审写入按顺序发送，或在途时合并为最后一次选择，结束后再提交最后目标；保留现有失败提示和回读。
   - **不修的后果**：快速纠正一次勾选时，未审文件可能在持久化记录里重新变成已审，重开 Review 后仍然如此。

## 可以更好

没有需要另外提出的具体事项；不把已有 ADR 和 `shortcut:` 明示接受的取舍列为问题。

做得好、不该动：`settled=<时间>:<turn>` 让 core 保存事实，`shared/tree.js:32` 用当前轮次判断是否仍有效，避免把是否绘制过 Inbox 当成事实来源。更新脚本的扩展 `config.json` 排除、其他快捷键分区保留，以及主题导出的条件写入也值得保留。

验证：52 份共享副本均与 `shared/` 相同；11 组无需写入安装状态的现有 CJS 检查全部通过。审查只新增本报告，没有修改仓库、安装、core 或运行会话，没有提交。

没检查到的：真实 GUI/多窗口与远程掉线实机回放、崩溃断电恢复、实际升级；未跑完整 `scripts/check.sh`（会调用 `check-update.sh` → `update.sh`）、会创建临时仓库的 pulls-review 检查及 `herdr-app check`。
