# 另一个窗口靠名字认领 Home：`Home` 加零宽空格

Home 的 id 只记在本机的 `shared.json`，而 space 在 core 里，同一 core 的另一个窗口不知道它。所以 Home 的名字是 `Home` 加一个零宽空格（`\u200b`）：各处看起来都是 Home，也没人打得出来。`t3-tabs` 还不知道 Home 时，只把本机上明确命名、名字完全相同的 space 认作 Home；已有的 Home 会被改成这个名字。

## Considered Options

- **可见的保留名，如 `t3-home`**：Go to 和 Inbox 会显示 space 名，用户会看到它。
- **“叫 Home 且有 `t3-home` 窗格”**：默认页可能被关掉，用户的 space 也可能有这个窗格。

认错会把用户的 space 藏起来，认不出最多多一个 Home，所以只取严格匹配。
