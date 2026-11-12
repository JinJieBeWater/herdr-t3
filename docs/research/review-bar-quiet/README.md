# Review bar quiet, panel card: demo shots

Demo window (`scripts/demo/stage.sh`), default sidebar width, zoom 1.1, 1680pt wide; a branch of herdr-t3-inbox 2 ahead of main, 1 to push, 1 uncommitted.

- `1-closed.png`: panel closed. Counts dim, unoutlined; the panel toggle last, on its own.
- `2-closed-badge-working.png`: the same with `review.status` forced to `working` (`demo-stage.shared`): the spinner on the toggle icon's top-right corner; `blocked` and `done` were also shot and the toggle didn't move.
- `3-open-files.png`: panel open on Files with a file open. Toggle lit, no badge; the Review tab carries the spinner. The panel body is a card.

Measured on `3-open-files.png` (layout px, 2.2 device px each):

| | left pane card | panel card |
|---|---|---|
| top | 40.0 | 40.0 |
| bottom inset | 8.2 | 8.2 |
| side inset | 8 from the sidebar rule | 8.2 from the window edge, 8 from the work column |

Pixels (device RGB):

```
left card (terminal pane, empty)                 ( 600,600) -> (30, 30, 46)
panel toolbar (empty, right of breadcrumb)       (1300, 60) -> (30, 30, 46)
panel body: editor, blank line 13                (1100,318) -> (30, 30, 46)
panel body: line-number strip                    ( 903,400) -> (30, 30, 46)
panel column (file tree, empty below rows)       (1450,925) -> (30, 30, 46)
panel column under its search                    (1450, 88) -> (30, 30, 46)
chrome (panel head)                              (1450, 20) -> (24, 24, 37)
```
