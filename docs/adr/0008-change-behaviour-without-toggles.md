# 有真实用户，但直接改行为，不加开关

决定时 herdr-t3 有 139 star、8 fork，近两周 1236 个独立 clone。行为变化直接生效，不做开关保留旧行为；需要用户手动做的迁移写进 CHANGELOG，能自动做的交给 `scripts/update.sh`。
