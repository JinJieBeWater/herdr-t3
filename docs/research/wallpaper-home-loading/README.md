# Home return blank: reproduction pending

User report: “读取能否优化一下，现在如果长时间没回到home，封面会回收，导致home会空白一下”. No production loading or rendering change has been made: the exact failure has not yet been reproduced.

## Observed on 2026-11-12

The test used a copy of the currently selected `.ans`, in a separate app home, HOME and core in the existing macOS VM. Host and guest Herdr were both 0.1.15, with identical executable SHA-256 `31ae7a641399a44d202a6550543fc0a1ce72e5d1109f7ae468c847819882df52`. The host desktop received no GUI input. The demo window was 1280×699, zoom 1, default 256px sidebar.

Temporary instrumentation recorded wallpaper `init`, `close` and `refresh`. A replay warmed Home, captured its reference, selected another space, waited, returned through the actual `t3-tabs.home` command, then captured fifteen whole-window frames with timestamps. Pixel comparisons used the picture region `(270,45)-(1260,675)`; the complete frames were also inspected to distinguish the previous page from an empty Home.

| While Home was hidden | Result |
| --- | --- |
| 40 seconds, other terminal idle | First capture still showed the previous terminal; the next Home frame matched the reference. |
| 5 seconds, another mod updating native text every 16 ms | First capture still showed that mod; the next Home frame matched the reference. |
| 130 seconds, continuous native updates | Every captured Home frame matched the reference, including the first capture. |
| 8 seconds, 64 distinct 1024px SVG masks in the other mod | Every captured Home frame matched the reference. |

The wallpaper initialized once and refreshed once, with no `close` during these cases. The app reported no errors. A 55-second native ScreenCaptureKit recording around the long return was inspected; its sampled frames moved from the previous page to the complete wallpaper, without an observed empty Home. This does not rule out a gap shorter than the recording's frame interval, or a failure at the user's larger window/display scale.

The [API/source survey](api-findings.md) found no elapsed-time eviction in the inspected SVG atlas path, no public SVG preloading/retention option, and no hidden-pane teardown in the inspected ownership path. This agrees with the replay, but does not establish the user's cause. No busy timer, repeated preloading or speculative replacement cache was added.

## Missing trigger

Asked for the usual time away, intervening activity (terminal work, project/Review switching, minimization or sleep), and visible transition (plain blank, a built-in cover, or gradual appearance of the original). The next replay depends on that answer. A fix is accepted only when that original or equivalent scenario first reproduces and then stops producing the blank.

The temporary adapter and replay fixtures are diagnostic only. No user image or `.ans` is committed. No full gate or installation sync was needed because production code is unchanged.

The owned demo app, isolated core, fixtures, recording, helper processes and agent were removed. The Driver session ended and macOS shut down normally; Lume confirmed `stopped`. The user's selected wallpaper and installation remain untouched. Diagnosis is waiting for the missing trigger, not marked fixed.
