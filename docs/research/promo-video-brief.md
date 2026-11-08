# Promo video brief

A prompt for an agent that makes herdr-t3's promo film, drawn from [promo-video-prompts.md](promo-video-prompts.md): everestchris6's director brief and critic loop, Shpigford's real-UI rule, twoclipping's stills-first checkpoint. The story and every line on screen were settled with the author; the prompt leaves the agent the motion, not the message. Paste everything under the line into a fresh session started in this repo.

Review gets a film of its own later, see [Later: the Review film](#later-the-review-film): it is an extra an install leaves out, and the main film shows only what installing the layout gives.

---

<role>
You make a short promo film for herdr-t3, a Herdr App layout, out of real shots of its window. The motion is code: one HTML page whose every frame is a pure function of time, rendered frame by frame. The film is done when it passes the quality bar below as judged by fresh critics, and a first-time viewer gets the point with the sound off.
</role>

<brief>
- What it is for: one message, "save your attention". Many agents run out of sight; you see only the one that needs you, put it away when done, and it comes back by itself.
- Who watches: developers on X and in Herdr's layout gallery who already run several agents (Claude Code, Codex, Pi) and lose track of them.
- What they do at the end: install it. The end card reads `herdr.dev/layouts/JinJieBeWater/herdr-t3`.
- Length and size: about 24 seconds, 1920x1080, 60 fps. The last frame comes back to the first, so it loops.
- Look: the layout's own. Dark ground, Geist and Geist Mono, one accent per scene, as `scripts/demo/poster.html` sets them.
- Facts: `README.md` and `docs/user/guide.md` are the only source for what a feature does. The lines on screen are exactly those in `<story>`.
</brief>

<story>
Four features, in this order, each told as a pain and then its effect. The pain is a visible cost on screen, held long enough to feel; the effect is the same object resolving it. The captions are final: use them word for word, one at a time. No keys or key caps appear anywhere: every change is a click on a real control or a state that changes by itself.

| # | Time | Feature | Pain, then effect | On screen |
|---|---|---|---|---|
| 1 | 0–3.5s | Lists, Herdr's default | Pain: fourteen rows fill the sidebar, all spinning Working. One blocked row is buried among them, its mark small. The camera scans down and can't find it. | 14 agents. Which one needs you? |
| 2 | 3.5–6.5s | Inbox | Effect: the toggle at the sidebar's top right is clicked. Thirteen rows fold away; the blocked one lands alone on top of Inbox. This is the film's first signature moment. | Inbox shows only that one. |
| 3 | 6.5–8.5s | Settle | Pain: you answered it and it finished, yet its card stays on top, and other finished cards pile up under it. | Done with them. Still here. |
| 4 | 8.5–11.5s | Settle | Effect: one press of `✓ Settle` swept across the run drops them into the Settled shelf. Active is empty. | Settle them. Out of sight. |
| 5 | 11.5–15s | Comes back | Pain, held short: a quiet, empty Inbox, and the doubt of missing its next turn. Effect: new output, and the settled card rises back to the top by itself. The second signature moment. | Put away, never lost. New work brings it back. |
| 6 | 15–17s | Snooze | Pain: a card you can't deal with yet sits on top, in the way every time you look. | Not now. But don't forget. |
| 7 | 17–20s | Snooze | Effect: its clock picks a time and the card goes. The time runs forward; it returns marked `Woke`. | Snooze it. It wakes on time. |
| 8 | 20–24s | End card | The camera pulls back to the whole window, calm, then shrinks it into the wordmark. | Herdr T3 · Save your attention. / A layout for Herdr / herdr.dev/layouts/JinJieBeWater/herdr-t3 |

Beat 5 carries two lines, the first over the pain and the second over the effect. The carried object through beats 2 to 5 is the blocked agent's card.
</story>

<footage>
Every picture of the UI is a real shot of the demo window. Read `AGENTS.md`'s Demo window section and `scripts/demo/stage.sh` first.
- Build the film's states as a new scene, `scripts/demo/scene-promo.sh`, in the style of the existing scenes: stand-in agents from `fake`, one `herdr-app shot` per state, numbered in story order. Start it in Lists and switch to Inbox for its later shots.
- States come from labels, as `stage.sh`'s `settle()` writes `settled`: `t3-inbox` reads `snoozed` as the time a snooze ends, so a past time gives `Woke`.
- A control that shows only under the pointer (a card's `✓ Settle`, its clock, the snooze picker) still has to be a real render. Open it the way `scripts/demo/mods/demo-stage` opens the Actions menu, a command that does what the click does. If one can't be shot for real, bring it to the checkpoint.
- Animate pieces of shots, cropped and moved as `poster.html`'s `shot()` does. A card that rises is that card's pixels from the shot, landing on the pixels it holds in the next shot. Draw no UI of your own; a cursor overlay is fine on a control that does that action when clicked, with the next real shot as its result.
- Look at every shot whole before you use it. A state that came out wrong is shot again.
</footage>

<kit>
Clone https://github.com/echris6/motion-video-kit at `e4b1c000` and read `business-motion-film/SKILL.md`. Use its motion grammar (`motion-grammar.md`, `launch-film-notes.md`), its review loop (`gauntlet.md`, `critic-prompts.md`, `quality-bar.md`), `audio.md`, and its scripts. Its business offers, AI footage and Three.js parts sit outside this film: every picture here is a real shot.
</kit>

<steps>
1. Storyboard: break each beat of `<story>` into compositions of 1.4 to 3.5 seconds, in one table of time, what is on screen, its pain or effect, how it leaves, and which piece carries into the next shot. Send it to a fresh critic and fix what it finds. Done when the critic's list is empty or answered.
2. Checkpoint with me: show the storyboard and four rendered stills (the buried row in Lists, the lone card in Inbox, the pile of finished cards, the end card), any control you couldn't shoot for real, and ask whether I supply a music track. Wait for my answer. This is the one stop.
3. Shots: write `scene-promo.sh` and shoot every state the storyboard names. Done when each storyboard composition points at a shot you have looked at.
4. Build: `scripts/demo/promo.html`, a single `seek(t)` timeline, and `scripts/demo/promo.sh`, which renders it frame by frame with headless Chrome as `poster.sh` does and joins the frames with ffmpeg. Render a 5 second test first.
5. Critic loop: render the whole film, send it to a fresh critic that has seen none of the build, fix from the top of its list, and send the next render to a new critic that checks every earlier item. Keep a ledger of rounds. Done when a critic says ship and the quality bar passes measured.
6. Sound, if I supplied a track: cut on its beats, a soft whoosh per real scene change, a click only on a real action, loudness per `audio.md`. Also deliver the silent master.
</steps>

<quality_bar>
- Frame one is a finished picture.
- Every pain reads as a cost before its effect lands: a first-time viewer, sound off, can say what was wrong and what fixed it, for each of the four features.
- No still stretch longer than about half a second; under about a second of frozen screen in all.
- Text is at least 4.5:1 against what is behind it, and collides with nothing.
- Every UI pixel comes from a shot; every line on screen is one of `<story>`'s.
</quality_bar>

<deliverables>
- In `$DEMO`, kept out of the repo: the MP4, a contact sheet, the critic ledger, and the quality bar results.
- In the repo: `scene-promo.sh`, `promo.html`, `promo.sh`, so a later UI change is one re-run. Follow `AGENTS.md`'s Finishing a change; `scripts/check.sh` prints `all checks passed`.
- A short note of what a human should still watch or listen to.
</deliverables>

---

## Later: the Review film

A second, short film for the Review extra, made after the main one with the same prompt, look and pipeline. Its message: AI sorts out an agent's diff, so reviewing it takes less of your attention. It reuses the main film's signature move, out of sight while working and back by itself when ready, so the two read as one series.

| # | Pain, then effect | On screen |
|---|---|---|
| 1 | Pain: an agent has finished, and the Review bar counts what it changed, a lot to read cold. The count is whatever the shot shows. | Agent done. Now read all of it? |
| 2 | Effect: the count is clicked. The review's card goes Working and out of sight while it analyzes. | AI reads it first. |
| 3 | Effect: the analysis ends and the card comes back to Inbox by itself. | Back when it's ready. |
| 4 | Effect: opened, the review pane slides out beside the agent, both halves in frame for a beat, then the camera pushes into the analysis. | Not settled: the author words what the analysis saves. |
| 5 | End card. | pulls.review · an extra for Herdr T3 / herdr.dev/mods/JinJieBeWater/herdr-pulls-review |

The pane opens beside the agent: that is `openIn`'s default and what the README describes. Facts come from `docs/user/extras.md`; the scenes can start from `scene-layout.sh`, which already runs a real analysis.
