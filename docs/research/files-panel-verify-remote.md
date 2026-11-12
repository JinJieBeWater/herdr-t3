# Files panel: remote spaces and large Git repositories

Verification run: 2026-11-11, macOS arm64 client and Ubuntu 24 x86_64 `kvm` (16 cores, Git 2.43). Measurements are a reproducible baseline, not a broad benchmark. The local and remote shallow clones were `microsoft/vscode`, HEAD checkout with 21,018 index entries. Both had 20,000 ignored files under `node_modules/noise/` and 5,000 untracked files under `untracked-noise/`. Commands used `--no-optional-locks -c core.fsmonitor=false` unless stated. Timing used Python `perf_counter`; output byte counts are stdout sizes.

## 1. Remote change detection

**Verdict: yes, remote refresh works without installing anything, but it is polling.** Runtime `watchFolder(path)` has no `on` option and is local-only (confirmed in the installed `herdr.d.ts`). KVM had Git, coreutils, `find`, and also `rg`/`fd`; neither `inotifywait` nor `watchexec` was installed. `exec(..., {on: "kvm"})` is the supported remote one-shot call. `hc exec` default timeout is 60 s, cap 600 s; the Herdr mod API default is 30 s, cap 600,000 ms. A five minute wait fits both caps.

Measured repo command costs on the noisy checkout:

| Command | Mac wall | KVM wall | stdout |
|---|---:|---:|---:|
| `git --no-optional-locks -c core.fsmonitor=false ls-files -z` | 0.017 s | 0.006 s | 1,481,921 B |
| `git --no-optional-locks -c core.fsmonitor=false ls-files -co --exclude-standard -z` | 0.111 s | 0.038 s | 1,610,811 B |
| `git --no-optional-locks -c core.fsmonitor=false status --porcelain=v2 -z -uall` | 0.606 s first run; 0.258 s mean over next 5 | 0.153 s first run | 138,890 B |
| `git check-ignore --stdin` with 20k ignored paths | 2.825 s | 3.695 s | 568,890 B |
| `find . -maxdepth 1 -mindepth 1 -print` | 0.005 s | 0.002 s | 711 B |

`check-ignore` time includes passing 20,000 paths to Git and returning 20,000 ignored paths; this is a poor per-file UI query. Avoid asking it for every row. The complete file list is already 1.61 MB in this checkout, before status output.

Ten sequential `hc exec --on kvm true` calls took 1.149 s on the first call, then 0.063–0.094 s each (median 0.067 s). A remote status call plus a local round trip therefore costs about 0.22 s warm on this checkout. Five remote status executions spaced one second apart took 6.345 s total (including the sleeps) and accumulated 0.700 s child user CPU + 0.799 s system CPU. This is about 0.30 CPU seconds per refresh under the tested untracked noise. A 10 s cadence costs roughly 3% of one core on average by this sample; a 1 s status loop would approach 30%. This is a noisy-repo upper case, not a general CPU model.

**Candidates and recommendation**

- **Primary, no-install baseline:** refresh remotely every 10 s with one `exec` for Git status and another for the expanded folder listings, and cache results in the mod. For status use `git --no-optional-locks -c core.fsmonitor=false status --porcelain=v2 -z -uall`; for search/listing use `git ls-files -co --exclude-standard -z`. This is the dependable deployment recipe for a typical remote. Warm request latency was 67 ms, observed changed status within 10 s + about 0.22 s command/round-trip. CPU is bounded by the measured cadence. Do not rerun `check-ignore` for every tree row.
- **Lower-latency optional recipe:** if the user explicitly accepts deploying a binary, run `/tmp/watchexec --only-emit-events --debounce 100ms` with `hc run --bg --on <machine> --cwd <space-folder> ...`, then read its terminal. A musl x86_64 watchexec 2.8.0 archive was downloaded to remote `/tmp` and executed successfully. Creating, editing and removing a file yielded four JSON events in about 0.3 s. The event stream is not a durable queue: two `hc read` calls returned the same four lines (no read cursor), events can coalesce/duplicate, and after a 200-file burst `hc read --lines 0` and `hc read --lines 200` each exposed 103 lines. It is suitable as a best-effort invalidation hint only if the consumer deduplicates and periodically reconciles. Process death, core restart and lost terminal history lose the stream; refresh after reconnect.
- **Long-poll (candidate b):** the shape is feasible within the documented timeout: one remote `exec` runs a shell loop for at most 300 s, samples status plus signatures of expanded folders every 5 s, returns on a changed signature, and the client immediately starts the next wait. Exact command shape (pass only folders currently expanded; `exec` arguments avoid an extra shell interpolation layer):

  ```sh
  sh -lc '
    sig() {
      { git --no-optional-locks -c core.fsmonitor=false status --porcelain=v2 -z -uall
        for d do find "$d" -type d -printf "%p %T@\n"; done
      } | sha256sum
    }
    before=$(sig "$@") || exit 2
    end=$(( $(date +%s) + 300 ))
    while [ "$(date +%s)" -lt "$end" ]; do
      sleep 5
      after=$(sig "$@") || exit 2
      if [ "$after" != "$before" ]; then printf changed; exit 0; fi
    done
    printf timeout
  ' /bin/sh <expanded-folder-1> <expanded-folder-2>
  ```

  A direct `hc exec --on kvm --timeout 90 sh -lc 'sleep 60; echo waited'` completed normally in 60.068 s, proving the core transport does not cut off work at 30 s. It lowers client polling requests to one per wait and change latency to at most about 5 s, but it does not reduce remote Git work versus running the same checks every 5 s. The measured 0.30 CPU s per noisy status check corresponds to about 6% of one core at a 5 s cadence. The long-poll itself and its survival in the mod runtime were not proven in this run; do not claim it survives a space switch until tested there. A timeout must return a full refresh signal, not a no-change result.
- **Failure and cancellation:** `exec` errors when the machine is unreachable, the executable is absent, or the request times out. A watcher terminal can die on machine reboot, core loss or terminal cleanup; reopen it and reconcile with a full scan. Installed declarations say an already-started `exec` continues running; no mod API cancellation was found. On space changes, discard stale results by checking the active space/request generation before applying them. Treat app-level cancellation as unverified.

## 2. Initial demo runtime probe

**Verdict at that attempt: partial.** The first probe's result file was not produced; the live mod follow-up below closes that evidence gap. Started the isolated window with `DEMO=/private/tmp/herdr-t3-verify-remote sh scripts/demo/stage.sh up`, added KVM to its separate core, and confirmed the demo app had no reported layout errors. The first add via the SSH alias failed because the demo had no SSH config; symlinking the real SSH identity files into the demo-owned `$DEMO/home/.ssh` and adding a minimal `kvm` config allowed `hc machine add kvm` to succeed. The user's `~/.config/herdr-app` was not touched.

A throwaway `remote-probe` mod passed `herdr-app check` after correcting its render return. It was opened in the demo and a mod tab was created, but the probe's result file was not produced. So the requested measurements from the mod runtime are **not established** for: short `exec`, a 60 s+ in-flight `exec`, `readTextFile` text/missing/binary/>1 MiB behavior, and `exec("base64", ...)` throughput. Equivalent calls were exercised through `hc exec` only: remote 2 MiB base64 output was 2,832,997 B and took 0.007 s on the remote process; `hc file read` and `hc exec cat` each returned a 19 B text fixture, with local round trips of 0.656 s and 0.415 s respectively. These do not substitute for Herdr API measurements. `readTextFile`'s installed declaration promises UTF-8 up to 1 MiB and `null` when absent, but binary and oversized behavior are unspecified.

Demo setup recipe for repetition: `DEMO=/private/tmp/herdr-t3-verify-remote sh scripts/demo/stage.sh up`; create `$DEMO/home/.ssh/config` for `Host kvm` and symlink `~/.ssh/id_ed25519` and `~/.ssh/id_ed25519_tailnet` into its `.ssh`; run `DEMO=/private/tmp/herdr-t3-verify-remote sh scripts/demo/stage.sh do hc machine add kvm`. The unfinished probe is in the demo app only and is removed by `stage.sh down`.

## Mod runtime (follow-up)

**Verdict: remote calls work from a live mod.** I repeated the probe in the isolated demo, putting incremental JSON results in a hidden file under the demo app home. The hidden filename avoided triggering a source reload while the probe was running. The mod was displayed as a tab pane. KVM was added to the demo core through a demo-owned SSH config and symlinked SSH identities; no user's Herdr home was changed.

- **Short exec, 10 sequential calls:** `exec("true", [], {on: "kvm"})` returned code 0 for all calls. A representative series was 297, 104, 63, 559, 69, 73, 68, 69, 60, 67 ms (median 69 ms; occasional transport spikes). An earlier series ranged 58–75 ms.
- **Long poll and timeout:** `exec("sh", ["-lc", "sleep 60; printf waited"], {on: "kvm", timeout: 90000})` returned code 0 and `waited` after 60,074–60,081 ms. There was no 30 s app-side cutoff. Herdr's declared cap is 600,000 ms; the 90,000 ms option exceeds the wait duration with margin.
- **Space change:** while that request was in flight, I selected a different space, then returned to the probe space. The old pane's request resolved and recorded its result (`after-space-switch`: 15,072–15,082 ms for a second 15 s command). Space selection does not cancel a started request. Its result can be ignored by comparing a captured space/generation after `await`, for example `const generation = this.generation; const space = focused()?.space; ... if (generation !== this.generation || focused()?.space !== space) return;`. The mod must advance its generation when its displayed context changes.
- **Pane close:** a dedicated mod started `sleep 20; printf done > /tmp/herdr-files-runtime/pane-close.done; printf finished` with a 60 s API timeout. I closed its pane while pending. The remote marker appeared after 20 s, but the mod's result file remained at `pane-close-pending` and no completion record arrived after close. So closing the pane does not cancel the remote process, while the closed mod cannot consume and record the eventual result. Do not launch side-effecting remote work without considering this lifetime.
- **`readTextFile` remote results:** text returned a 19-character string in 61–73 ms; missing path returned `null` in about 61–72 ms; empty file returned `""` in 57–72 ms. A 2.17 MB valid PNG and a 2 MiB text file both failed with `Text file exceeds 1 MiB` (the returned errors took 8.6–26.2 s across runs). A directory path returned `null` in about 69–72 ms. A separate valid 80-byte PNG below the limit returned an 80-character string, replacing its invalid leading UTF-8 byte `0x89` with U+FFFD (68 ms); it did not throw. Thus the remote binary behavior differs from the local probe's strict UTF-8 error and should be treated as lossy text.
- **2.17 MB PNG transfer and render:** `exec("base64", [remotePng], {on: "kvm", timeout: 120000})` returned all 2,930,158 base64 characters for a 2,169,078-byte valid PNG. Total `exec` round trip took 12.335 s in one run and 27.802 s in another; `atob` plus `Uint8Array` conversion took 107–130 ms, and `fs.writeFile` under demo app home took 0–1 ms. Herdr rendered the PNG through `image("cache/remote-probe.png")`; [the demo screenshot](./files-panel-verify/remote-probe-image.png) shows the complete image in the mod pane.
- **21k-file Git list:** `exec("git", ["ls-files", "-co", "--exclude-standard", "-z"], {cwd: "/tmp/herdr-files-runtime/vscode", on: "kvm", timeout: 120000})` returned code 0, 1,481,966 ASCII characters and exactly 21,019 NUL-terminated entries. Wall time was 6.036 s on one run and 12.449 s on another; stdout arrived intact, including its final NUL. This clone had no extra 5k untracked-noise directory, so its list is smaller than the noisy benchmark in section 3.

**Follow-up method:** create a `mod.json`/`main.js` probe in the demo app, expose it in a tab with `herdr-app do tab.new '{"space":"<demo-space>","mod":"remote-probe"}'`, and start its sequence in `init` using `cx.spawn(async () => { ... })`. Time each `await exec` or `readTextFile`; after each step, write a result snapshot to `appHome()+"/.remote-probe-results.json"` using `fs.writeFile`. For the space switch, wait for the long-poll pending marker, run `space.select` to a second demo space, then wait for the result file. For pane close, wait for a separate pending marker, run `pane.close --pane <mod-pane>`, then compare the app-home result file with a remote marker written by the still-running command. The hidden results filename prevents the app's file watcher from reloading the mod on each snapshot.

## 3. Git performance and fsmonitor

**Verdict: yes, enumeration is inexpensive in this shallow VS Code checkout; full untracked status and ignore checks dominate.** Table above gives times, result sizes and remote/local comparison. This is a shallow checkout with 21,018 indexed paths, not a very large history or a several-hundred-thousand-file monorepo. The ignored 20k files did not appear in `ls-files -co --exclude-standard`; the 5k untracked files did appear in status. Directory listing used `find` at repo root, equivalent in cost shape to listing a single expanded folder; it returned 711 bytes.

`core.fsmonitor=true` was tested locally after starting Git's built-in daemon. On the same noisy tree, five warm `status --porcelain=v2 -uall` calls averaged 0.269 s versus 0.258 s with `core.fsmonitor=false`; accumulated child CPU was also effectively the same (true: 0.738 s user + 1.157 s sys; false: 0.734 s + 1.092 s). No speedup appeared in this workload. The daemon created `.git/fsmonitor--daemon/` and its `cookies/` directory; cookie paths are under `.git/fsmonitor--daemon/cookies/` during synchronization (the directory was empty when sampled after the commands). A recursive `watchFolder` of a local repo could be woken by those writes; the current evidence does not establish whether every cookie write is reported by Herdr's watcher. Do not enable fsmonitor solely based on this run.

Reproduction recipe (both checkouts): clone with `git clone --depth 1 --filter=blob:none https://github.com/microsoft/vscode.git <tmp>/vscode`; make the 20,000 ignored and 5,000 untracked files as above; append `node_modules/` to `.git/info/exclude`; run the five commands in the table, capturing stdout bytes. On macOS, warm then repeat `git --no-optional-locks -c core.fsmonitor=true status --porcelain=v2 -z -uall` and compare to `false`. The `core.fsmonitor` switch here is command-scoped; no repository config was changed.

## 4. Remote reveal/open actions

**Verdict: copy-path actions make sense; Finder reveal does not.** Copy absolute path is useful when the user means the remote machine path, but it must be labeled as remote and should offer copy-relative-path for a portable repository reference. Reveal in Finder cannot reveal a remote filesystem path. “Open in default app” would need an explicitly remote program/desktop integration that this mod API does not provide; omit it for remote spaces. `hc file read --on` supports line offset/limit and up to 8 MiB as a CLI convenience, whereas `readTextFile` gives a UTF-8 string capped at 1 MiB directly to a mod. Neither is a binary preview API. `hc file read` is useful for manual inspection or larger text slices, not a better in-app preview primitive.

## Verdict table

| Concern | Local recipe | Remote recipe | Fallback | Risk / status |
|---|---|---|---|---|
| Change detection | `watchFolder(root)` plus periodic reconciliation | Every 10 s call `exec` for Git status and expanded listings; cache between refreshes | Optional remote `watchexec` terminal as an invalidation hint | Terminal reads replay old output and can truncate; reconcile after reconnect |
| Faster remote refresh | N/A; native Herdr watcher | Optional 300 s long-poll `exec`, sample every 5 s, restart on return | 10 s one-shot polling | 60 s `exec` returned; space switch does not cancel it. Guard stale results by space/generation |
| Git tree/search | `git ls-files -co --exclude-standard -z`, local filtering | Same via `exec(..., {on})` | `find` outside Git | Mod received all 21,019 paths / 1,481,966 chars in 6.0–12.4 s |
| Git status | `git --no-optional-locks -c core.fsmonitor=false status --porcelain=v2 -z -uall` | Same via remote `exec` | Refresh at a slower cadence | Noisy sample status 0.258 s local / 0.153 s remote; not a huge-repo upper bound |
| Ignore checks | Avoid per-row `check-ignore`; request ignored paths in a batch only if needed | Same; 20k stdin took 3.7 s remotely | Don't display ignored entries in the first version | Per-file ignore queries are too expensive at this scale |
| File contents | `readTextFile(path)` | `readTextFile(path, {on})` | `hc file read --on` for manual larger text slices | Mod runtime confirmed: missing/empty/text; small PNG is lossy UTF-8, >1 MiB errors; directory returned `null` |
| In-flight lifecycle | N/A | Started `exec` survives space switch; compare captured generation/space before applying result | Close pane to stop consuming results | Pane close left remote process running; disposed mod did not record completion |
| Image transfer | N/A | Base64 2.17 MB PNG, decode and write to app home, then `image()` | Cache decoded image | Returned intact and rendered; transfer took 12.3–27.8 s |
| Reveal/open | Copy absolute/relative path; local Finder reveal can be available | Copy paths labeled with machine; no Finder reveal/default open | N/A | Remote path strings are not local paths |

## Cleanup and evidence limits

The demo and all benchmark clones, fixtures and downloaded binaries are temporary. Demo cleanup is `DEMO=/private/tmp/herdr-t3-verify-remote sh scripts/demo/stage.sh down`; follow-up remote cleanup removes only `/tmp/herdr-files-runtime` and no software was installed system-wide. The PNG screenshot is saved at `docs/research/files-panel-verify/remote-probe-image.png`. No commit was made. Result variability reflects a single remote link and is not a throughput guarantee.
