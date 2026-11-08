# 用 Opus 做产品视频的爆款提示词（2026-11-08）

调研 X 上用 Claude Opus 做产品或发布视频、并公开了提示词的帖子，给 herdr-t3 的宣传片找做法。帖子原文用 fxtwitter API 取得，热度是当天的数字；仓库用 `gh api` 读取。视频本身没有逐个看过。照这些做法写成的 herdr-t3 提示词见 [promo-video-brief.md](promo-video-brief.md)。

## 帖子

| 帖子 | 日期 | 赞 / 浏览 / 收藏 | 工具 | 提示词 |
|---|---|---|---|---|
| [@stephanlivera](https://x.com/stephanlivera/status/2103315922098470926) | 2026-09-25 | 17,239 / 2,318,445 / 13,155 | Opus 5.5 Max effort，不清楚具体环境 | 一句话，[原文](#一句话放手stephanlivera) |
| [@twoclipping](https://x.com/twoclipping/status/2103835273813496100) | 2026-09-26 | 2,199 / 144,447 / 3,810 | 单个 HTML 文件、Playwright、ffmpeg | 分段写的完整导演稿，[原文](#一镜到底twoclipping) |
| [@everestchris6](https://x.com/everestchris6/status/2104965415164399895) | 2026-09-29 | 1,063 / 128,866 / 2,835 | GSAP、Three.js、[motion-video-kit](https://github.com/echris6/motion-video-kit) | 导演稿，加上独立的批评循环，[原文](#导演稿加批评循环everestchris6) |
| [@Shpigford](https://x.com/Shpigford/status/2015250030815584647) | 2026-01-25 | 916 / 75,347 / 1,677 | Claude Code、Remotion skill、ElevenLabs MCP | 在产品仓库里，用真实组件，[原文](#创始人演示shpigford) |

另外三条只有出处，没有可用的提示词：

- @LexnLin 说一个提示词让 Opus 5.5 跑了 8 小时，做出一个虚构日历产品的发布片。提示词没有公开，但成片和整条管线开源在 [Leonxlnx/claude-launchvideo](https://github.com/Leonxlnx/claude-launchvideo)（MIT，`f0906e86`）。管线是 Remotion 出画面，Python 合成全部声音，两者从同一条时间线导出 cue 来对齐，并用光流测速度、算子帧数来做运动模糊。
- @uxmiles 说"这个视频用了 3 个提示词"，问他要提示词，他说是用语音口述"把脑子里想的全倒进去"，原文没有公开。
- HeyGen 的 [HyperFrames](https://github.com/heygen-com/hyperframes) 把 HTML 渲染成 MP4，是给 agent 用的框架，安装命令是 `npx skills add heygen-com/hyperframes`。HeyGen 自己的发布视频就是用它在 Claude Code 里做的。

## 共同做法

1. **先定分镜，再做动画**：twoclipping 先给拍点表和 4 张定帧；everestchris6 先写分镜表，每 30 秒 12–15 个镜头，每个 1.4–3.5 秒；Shpigford 先盘问清楚再出计划。
2. **每一帧是时间的纯函数**：用 `seek(t)` 计算每一帧，不用 CSS transition、计时器和不带种子的随机数，再用无头浏览器逐帧渲染。这样任何一帧都能重现，也能单独检查。
3. **用真素材**：Shpigford 用产品自己的 React 组件，不加新的美术素材；everestchris6 规定屏幕上出现的所有数字和说法都必须来自 facts file。
4. **一直在动**：缓动用弹簧，不用线性；前景物体本身就是转场；静止不超过约 0.5–1 秒。
5. **制作者不给自己打分**：每轮把成片交给一个没看过制作过程的新 agent，它按 0.2 秒一张做缩略图，返回带时间戳的问题排序；修完再交给另一个新 agent 逐条复核。
6. **声音最后加**：音乐用素材库里的，转场一个轻的 whoosh，点击声只放在真实的操作上，剪点落在拍子上，响度做到 −14 LUFS。另外交一个纯音乐版本。

## 原文

### 一句话放手（@stephanlivera）

```text
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.
```

### 创始人演示（@Shpigford）

原帖用的是 Unicode 等宽字母，这里转成普通字母，拼写错误按原样保留。他是在 Presscut 的代码库里运行这条提示词的，后来又用 ElevenLabs 分段生成配音、配乐和音效，由 Claude 按每一段的时长对齐。

```text
Create a demo video of the Presscut app/product using remotion. Use react componenents to replicate UI elements and replicate the UI of the app as closely as possible.  The app has a LOT of features/functionality, so take guidance from the marketing home page/index for what to highlight, while keeping language simple and to-the-point.  Really grill me with questions to nail down exactly how the final video should look/feel and what content should be there.  The ultimate goal of this is to replicate what me, the founder, would be showing/doing with a product demo with a customer.
```

### 一镜到底（@twoclipping）

```text
<inputs>
Ask me for: a one-word brand name for the wordmark (a verb works best), 9 to 12 high-res photos, a royalty-free song around 120 BPM with a drop and a quiet breakdown (Mixkit, free for commercial use), and a free stock clip of a plain wall with moving plant shadows (Pexels).
</inputs>

<direction>
An Apple-keynote launch film, 2D only, one continuous take. Every scene is made out of the previous one: nothing fades, blurs or cuts. Objects change shape instead: text rises out of a mask line, icons pop from zero on a spring, bars draw across, pages push, and a black shape floods the whole frame and contracts into the next scene. Warm off-white canvas, black UI, iOS 26 liquid glass over the photos. Archivo (wdth 125, weight 800) for the wordmark, Geist for UI. A cursor drives every change with real clicks, drags and long-presses. The camera zooms screen-studio style so each moment fills the square, and the cursor scales with it.
Banned: crossfades, blur-ins, brightness "developing", 3D flips, particles, glows, holds longer than 1s, anything that looks like a template.
</direction>

<structure>
120 BPM, 54 beats, something happens on every beat.
Open: the wordmark squeezes into its own period like an accordion, the dot grows into a black pill, a label rises inside it. Click: six iris blades close over the label and snap open onto a photo. The circle becomes a square, shrinks, the grid unfolds from behind it like a paper map (center, plus, corners), reflows into a bento, and a click zooms into one tile, landing exactly on the drop.
Glass: a glass word pops in letter by letter, melts into a droplet that stretches into a glass toolbar. The adjust icon turns it into a slider. Dragging relights the photo from day to golden hour (two aligned shots), and the knob turns into a glass lens while held. It lifts into a glass orb, the next photo opens inside it as a circle, and the orb expands into a lock screen: glass clock digits, date, and a home bar that stretches into a glass music player.
Stage: the lock screen pulls back into a phone (the bezel grows out of the screen edge). The Dynamic Island stretches like liquid, pinches off, flies over and grows into a Mac window that rolls up like a blind. Long-press the wallpaper, drag it onto a Safari tab, the page pushes in, drop it and it becomes the hero of a landing page. Scroll: the hero morphs into a framed print on a product card, with the mat and molding growing out of the photo's edge. Pick a frame color (it paints across) and a size, then the nav button flies down into "Order print".
Order: one black shape keeps morphing: Ordered ✓ → Printing % → On its way (a van on a route) → Delivered ✓.
Wall: the delivered circle floods the frame edge to edge, holds black for a beat, and contracts into the framed print hanging on the real wall footage. The same iris opens onto the print, closes again, the frame floods the screen and contracts into the pill → the dot → the letters spring back out, landing on the beat return. Last frame = first frame.
</structure>

<build>
1. One HTML file, square 1440x1440. Every style is computed from time inside an async seek(t): no CSS transitions, no timers, no state between frames.
2. Springs are closed-form step responses. A value with many targets is the sum of one spring per change, so it stays a pure function of time.
3. Liquid glass: each glass element holds its own clone of the scene behind it, filtered with an SVG feImage displacement map (a rounded-rect distance field) through three feDisplacementMaps at slightly different scales for chromatic edges, plus a rim light. Glass letters: a canvas distance field per glyph gives the map, mask and highlights.
4. Goo: blur + alpha threshold, then composite the source atop it so the glass stays sharp inside.
5. Iris: 6 blades around a hexagonal aperture. Each blade is its two vertices, both edge extensions and the SHORT arc between them.
6. Wordmark squeeze: every letter moves toward the dot by the same factor and its drawn width follows (narrow the wdth axis, scale the rest), so the letters stay touching.
7. Footage: re-encode all-intra (ffmpeg -g 1), load it as a blob URL, await 'seeked' before drawing each frame.
8. Sound: a downloaded SFX for every event (Mixkit), never synthesized, each placed by its measured peak. The song starts on a downbeat: the zoom lands on the drop, the wall sits in the breakdown, the wordmark returns with the beat. Loudnorm to -14 LUFS.
9. Render with Playwright: 4 subframes per frame blended with ffmpeg tmix, 60fps. Check one frame per beat, then scan for single-frame pops (frame-difference spikes 3x their neighbours).
</build>

<gotchas>
backdrop-filter: url() misreads displacement maps in Chromium, so clone the scene instead. A flood must overscale past the corners and take about 0.3s, or half the screen changes in one frame. A child with visibility: visible shows through a hidden parent, so use inherit. Text that swaps inside a morphing shape needs its own mask. python http.server can't range-seek video, so use the blob URL.
</gotchas>

<start>
Ask me for the inputs, then show me the beat map and 4 stills (open, glass, stage, wall) before you write the full film.
</start>
```

### 导演稿加批评循环（@everestchris6）

`<kit>` 引用的 [motion-video-kit](https://github.com/echris6/motion-video-kit)（MIT，读取的是 `e4b1c000`）是一个 skill，`business-motion-film/SKILL.md` 按步骤告诉 agent 该读哪份参考：分镜读 `motion-grammar.md` 和 `launch-film-notes.md`，评审读 `gauntlet.md`、`critic-prompts.md` 和 `quality-bar.md`，声音读 `audio.md`。它还带了测静止时长、测响度、做缩略图的脚本。这个 kit 面向商业广告，默认会用 AI 生成画面。

```text
<role>
you design and build motion videos entirely in code, with gsap for the animation and three.js for any 3d. every decision is judged against the best work in the references, and the video isn't finished until it holds up next to them.
</role>

<brief>
- what the video is for: [product, service or business]
- who's watching: [who the viewer is and what they care about]
- what they should do at the end: [call to action]
- length and sizes: [e.g. 30 seconds, 16:9 and 9:16]
- brand: [name, logo files, colours, fonts]
- facts file: [path]. this is the only source for any number, name or claim that appears on screen
- assets: [footage, photos, screenshots, product files]
- style references: [links or a folder of videos whose motion i like]

i'm away and won't answer questions. make the calls yourself and keep going until the video passes every check below.
</brief>

<kit>
before anything else, clone and read http://github.com/echris6/motion-video-kit. read SKILL.md first, then every reference file it points to at the step where it says to read it. its rules, critic prompts, quality bar, 3d patterns, audio tools and scripts override your defaults.
</kit>

<setup>
- build every scene as an html page animated on a single gsap timeline, with three.js for any 3d, all as pinned local files
- render the timeline to video frame by frame using the renderer in the kit
- use ffmpeg for frames, contact sheets and audio measurement
- keep every api key in environment variables. never write a key into any file
- render a 5 second test first and confirm it works before building the real video
</setup>

<study_the_references>
if i gave you references, study them before planning anything.
- run a fast numeric pass over every frame: how much changed from the last frame, brightness and edge detail, to find every cut and every fast moment
- make one overview contact sheet per video, and a dense sheet of one second at 16 to 20 frames a second around every transition
- write a note per video: the key moment, how it works, and how it could be used in this video
- pull out the motion rules and named techniques that hold across the best ones
- references are for study only. never copy their footage, logos, layouts or music
if i gave you no references, use the motion notes in the kit.
</study_the_references>

<motion_principles>
1. the thing in the front of the shot becomes the transition. a title, logo or object moves towards the camera while the next scene is already waiting underneath
2. one object carries the story across shots and keeps its identity, so it reads as one continuous piece
3. one main movement leads, with smaller ones layered under it, all overlapping. the frame never stops and starts all at once
4. the speed always changes. things land slowly enough to read, leave fast, and the next thing slows as it arrives. no linear motion
5. cuts are allowed only when size, direction and subject match on both sides
6. every action produces a visible result. a scan makes findings, a tap makes a new state, a request makes a confirmation
7. type is motion too. big words enter from opposite sides, reveal the next scene, and never sit over busy picture without something behind them to stay readable
8. vary the scale from close, to wide, to overhead, to full-frame type. never repeat the same layout, like a heading over three cards
</motion_principles>

<storyboard>
write a brief and a storyboard before any animation.
- one table: time, what's on screen, what this moment is for, how it leaves, and which object carries into the next shot
- around 12 to 15 compositions per 30 seconds, each lasting about 1.4 to 3.5 seconds
- the main subject fills most of the frame. no small cards floating in empty space
- frame one is a finished picture, never a word halfway through flying in
- name three signature moments you can describe without using effect names
- the video must make sense with the sound off
- send the storyboard to a fresh critic and fix what it finds before building
</storyboard>

<build>
- every animated value is a function of timeline time only. no timers, no real-time animation, no unseeded randomness. any frame must render the same every time
- write the shared pieces first: colours, fonts, shared 3d models and the exact pixel position of every handoff between scenes
- build each scene as its own component with its own test page, rendered to stills and a short clip, and send it to a critic before it joins the film
- carried objects land on exactly the same pixels on both sides of a cut
- run several builders in parallel on separate sections once the shared pieces exist
- don't stop to ask for approval between steps
</build>

<3d>
- only use 3d where it explains something physical or spatial, like layers, parts, placement or scale
- light it like a product shoot, with a soft key light from one side and a rim light behind
- keep the camera between about 35 and 55 degrees. never look straight down on a large surface, and never end tight on a flat one
- style buildings like a premium architectural model with real materials and a base
- no floating parts, no gaps where parts meet, no flat black glass, no repeating textures
- labels are html positioned from the 3d scene every frame, never text inside the 3d
- measure the rendered background pixel and adjust until it matches the brand colour
- anything that moves like a real product is measured from real footage frame by frame, and those measurements are the curve
</3d>

<images_and_footage>
- prefer building shots in code. use generated images or clips only for supporting shots, and label anything generated as a concept
- upscale and smooth any generated clip to match the rest, and regenerate anything that warps
- never generate a fake finished job, fake customer, fake review or fake result
</images_and_footage>

<audio>
- match the music's energy to the picture and the viewer, and keep it low
- prefer clean library music and sound effects over generated ones. never name a brand in a music prompt
- one short, soft whoosh per real scene change, and small clicks or pops only on real on-screen actions
- screen effects for boom, hiss and length before using them, and set each one just above the music in its own frequency range, with a cap so nothing gets harsh
- cut every scene change on a beat
- always export a music-only version
</audio>

<critic_loop>
the builder never judges its own work.
- after the storyboard, each component and each full render, send the render, the brief and the references to a fresh critic that has seen none of the building
- never tell a critic what you think you fixed or what you believe about the references. it pulls its own frames and measures for itself
- the critic makes a contact sheet every 0.2 seconds plus dense frames around every transition, measures frozen time and loudness, and returns a ranked list of problems with timestamps, ending with ship or one more pass
- fix the biggest problem first, render, then send to a new critic that checks every previous item as fixed, partly fixed or still there, and hunts for anything new that broke
- keep a ledger of every round: what was found, what changed, and the numbers before and after
</critic_loop>

<quality_bar>
the video isn't done until all of these pass, measured:
- no more than about 1 second of frozen screen per 30 seconds, and no still stretch longer than about half a second
- frame one is a finished composition
- all text meets at least 4.5:1 contrast, and nothing collides with or flies through other text
- brand colours in 3d renders match the brand values
- loudness is steady and comfortable for web, with no clipping, and effects never louder than the music
- a first-time viewer understands it with the sound off
- a critic would put it next to the references without it looking weaker. a video with no bugs is not the same as a good video
</quality_bar>

<honesty>
- only put numbers, names and claims on screen that are in the facts file
- no invented testimonials, ratings, prices, savings, warranties or results
- anything conceptual or generated is labelled as such
- in your reports, separate what you measured from what still needs a human to watch or listen
</honesty>

<deliverables>
- the final mp4 in every size requested, at 1080p and 60 frames a second
- a music-only version
- a contact sheet of the final video
- the critic ledger and the final quality bar results
- a short note on anything a human should still check
</deliverables>
```
