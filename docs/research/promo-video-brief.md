# Promo video brief

A prompt for an agent that makes herdr-t3's promo film, drawn from [promo-video-prompts.md](promo-video-prompts.md): everestchris6's director brief and critic loop, Shpigford's real-UI rule, twoclipping's stills-first checkpoint. Paste everything under the line into a fresh session started in this repo.

---

<role>
You make a short promo film for herdr-t3, a Herdr App layout, out of real shots of its window. The motion is code: one HTML page whose every frame is a pure function of time, rendered frame by frame. The film is done when it passes the quality bar below as judged by fresh critics, and a first-time viewer gets the point with the sound off.
</role>

<brief>
- What it is for: show people who run many coding agents how herdr-t3 lets them keep the agents running out of sight and look only at the ones that need them.
- Who watches: developers on X and in Herdr's layout gallery who already run several agents (Claude Code, Codex, Pi) and lose track of them.
- What they do at the end: install it. The end card reads `herdr.dev/layouts/JinJieBeWater/herdr-t3`.
- Length and size: about 30 seconds, 1920x1080, 60 fps.
- Look: the layout's own. Dark ground, Geist and Geist Mono, one accent per scene, as `scripts/demo/poster.html` sets them. The posters' headline "14 agents working. Your Inbox shows just one." is the film's thesis.
- Facts: `README.md` and `docs/user/guide.md` are the only source for any feature name, key or claim on screen. Keys appear exactly as the guide writes them.
</brief>

<footage>
Every picture of the UI is a real shot of the demo window. Read `AGENTS.md`'s Demo window section and `scripts/demo/stage.sh` first.
- Build the film's states as a new scene, `scripts/demo/scene-promo.sh`, in the style of the existing scenes: stand-in agents from `fake`, one `herdr-app shot` per state, numbered in story order.
- Drive the window with `stage.sh do herdr-app do …` and the commands `herdr-app commands` lists. A state that needs the pointer (hover cards, a dragged row) is out of reach: tell the same beat through its key instead.
- Animate pieces of shots, cropped and moved as `poster.html`'s `shot()` does. A card that rises is that card's pixels from the shot, landing on the pixels it holds in the next shot. Draw no UI of your own; a cursor overlay is fine on a control that does that action when clicked, with the next real shot as its result.
- Look at every shot whole before you use it. A state that came out wrong is shot again.
</footage>

<story>
A starting spine. Own the calls, and keep each beat to what the guide says the layout does.
1. Hook: fourteen agents at work, and the sidebar nearly empty.
2. One card needs you: a blocked agent rises to the top of Inbox.
3. Work it: `cmd-]` opens it, `cmd-shift-s` settles it, and Home is quiet.
4. It comes back by itself when there is new work.
5. Quick beats, one each: Lists (`cmd-shift-b`), Go to (`cmd-p`), Actions, Review.
6. End card with the install line.
</story>

<kit>
Clone https://github.com/echris6/motion-video-kit at `e4b1c000` and read `business-motion-film/SKILL.md`. Use its motion grammar (`motion-grammar.md`, `launch-film-notes.md`), its review loop (`gauntlet.md`, `critic-prompts.md`, `quality-bar.md`), `audio.md`, and its scripts. Its business offers, AI footage and Three.js parts sit outside this film: every picture here is a real shot.
</kit>

<steps>
1. Storyboard: one table of time, what is on screen, what the beat is for, how it leaves, and which piece carries into the next shot. 12 to 15 compositions. Send it to a fresh critic and fix what it finds. Done when the critic's list is empty or answered.
2. Checkpoint with me: show the storyboard and four rendered stills (hook, the card that needs you, Home, end card), and ask whether I supply a music track. Wait for my answer. This is the one stop.
3. Shots: write `scene-promo.sh` and shoot every state the storyboard names. Done when each storyboard beat points at a shot you have looked at.
4. Build: `scripts/demo/promo.html`, a single `seek(t)` timeline, and `scripts/demo/promo.sh`, which renders it frame by frame with headless Chrome as `poster.sh` does and joins the frames with ffmpeg. Render a 5 second test first.
5. Critic loop: render the whole film, send it to a fresh critic that has seen none of the build, fix from the top of its list, and send the next render to a new critic that checks every earlier item. Keep a ledger of rounds. Done when a critic says ship and the quality bar passes measured.
6. Sound, if I supplied a track: cut on its beats, a soft whoosh per real scene change, a click only on a real action, loudness per `audio.md`. Also deliver the silent master.
</steps>

<quality_bar>
- Frame one is a finished picture.
- No still stretch longer than about half a second; under about a second of frozen screen in all.
- Text is at least 4.5:1 against what is behind it, and collides with nothing.
- Every UI pixel comes from a shot, and every claim from the README or guide.
- A first-time viewer can say, sound off, what the layout does and how to get it.
</quality_bar>

<deliverables>
- In `$DEMO`, kept out of the repo: the MP4, a contact sheet, the critic ledger, and the quality bar results.
- In the repo: `scene-promo.sh`, `promo.html`, `promo.sh`, so a later UI change is one re-run. Follow `AGENTS.md`'s Finishing a change; `scripts/check.sh` prints `all checks passed`.
- A short note of what a human should still watch or listen to.
</deliverables>
