# AI Features Lab — React + Vite edition 🧪⚛️

The scalable rebuild of the AI Features Lab academy as a component-based **React + Vite +
TypeScript** app. Same 11 hands-on lessons (Instructions, Skills, Subagents, Hooks, MCP, Slash
commands, Plugins, the SafePay case study, Real-World Build Projects, and the Capstone) — now with a
component architecture, lesson search, deep-linkable URLs, and a typed content model.

## Features

- **🗺️ The Learning Journey** — the landing view: an anime-landscape world map where each lesson
  is a lantern shrine along a mountain path, from the torii-gate village to the summit pagoda. A
  fox traveler walks to the shrine you pick, completed shrines light up, and the trail behind you
  glows. Day/night follows the theme toggle.
- **🎮 XP, ranks and badges** — every lesson is worth XP (5/minute + a difficulty bonus); XP earns
  ranks from *Wanderer* to *Summit Sage*, and 8 badges celebrate milestones (first lantern, each
  region cleared, 3 lessons in a day, a late-night session, 5 first-try quizzes, full clear).
- **🔒 Shrines unlock as you go** — the next lesson opens when you complete the one before it, so
  the path unfolds. Anything already completed always stays open, and a **Free roam** switch on the
  map lifts the gate entirely.
- **🤖 Agent Runner (OpenClaw)** — connect the lab to your own self-hosted
  [OpenClaw](https://github.com/openclaw/openclaw) gateway and *actually run* the labs. Every lesson
  gets a **“Run this lab with OpenClaw”** button that hands the exercise to the agent and streams
  its response back into the page.
- **📚 Lessons** — 11 hands-on modules with copy-paste code, labs, and quizzes; progress saved locally.
- **🛠️ Template Studio** — interactive generators for every artifact (Skill, Subagent, Hook, MCP server, Slash command, Plugin). Fill a short form → get a ready-to-use file you can **copy or download**.
- **🔎 Lesson search** in the sidebar; **deep-linkable** `#world` / `#lesson-id` / `#studio` URLs with back/forward support.
- **🎨 Light / dark theme** toggle (persisted).
- **⌨️ Keyboard nav** — `←` / `→` move between lessons, `/` focuses search.
- **🎉 Completion tracking** with an overall progress bar.

## Quick start

```bash
cd ai-features-lab-react
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # production build -> dist/
npm run preview      # serve the production build
npm run typecheck    # tsc --noEmit
npm run sync:content # re-import lesson content from the vanilla edition
```

## Why this is more scalable than the vanilla edition

| Concern | Vanilla | React + Vite |
|---|---|---|
| Add a lesson | edit one big array | same data file, rendered by typed components |
| UI reuse | string concatenation | `<Lesson>`, `<Quiz>`, `<CodeBlock>`, `<ProjectCards>` |
| Safety | ad-hoc | typed `Module` model catches content mistakes at build |
| Find a lesson | scroll the sidebar | **search box** filters live |
| Sharing | manual hash | deep-linkable `#lesson-id`, back/forward aware |
| Growth | hand-rolled DOM | HMR, code-splitting, a real build pipeline |

## Architecture

```
ai-features-lab-react/
├── index.html                 # Vite entry
├── vite.config.ts
├── tsconfig.json
├── scripts/
│   └── sync-content.mjs        # imports content from the vanilla edition
└── src/
    ├── main.tsx                # React root
    ├── App.tsx                 # state, hash routing, progress bar, unlock gate
    ├── styles.css              # shared theme
    ├── useProgress.ts          # localStorage store -> progress, XP, rank, badges
    ├── useOpenClaw.ts          # gateway config, connection probe, streaming run
    ├── lib/
    │   ├── openclaw.ts          # OpenClaw gateway client (models, SSE chat)
    │   └── prompts.ts           # builds the agent prompt from a lesson's lab
    ├── data/
    │   ├── curriculum.ts        # typed Module model + helpers
    │   ├── curriculum.json      # content (generated — single source of truth)
    │   └── gamification.ts      # XP / rank / badge / unlock rules (pure functions)
    └── components/
        ├── AgentPanel.tsx       # 🤖 Agent view — setup, run console, output
        ├── WorldMap.tsx         # the Journey map — shrines, trail, HUD, locks
        ├── BadgeToast.tsx       # "badge unlocked" celebration toasts
        ├── Sidebar.tsx          # grouped nav + search
        ├── Studio.tsx           # Template Studio — artifact generators
        ├── Lesson.tsx           # renders one lesson's sections
        ├── CodeBlock.tsx        # copy-to-clipboard code sample
        ├── Quiz.tsx             # interactive check-yourself
        ├── ProjectCards.tsx     # Real-World Build Projects cards
        └── Html.tsx             # trusted-HTML helpers
```

### How the game rules work

All of it derives from one saved object — `{ done: {id: completedAt}, aced: {id: true} }` under
`ai-features-lab.progress.v2` — so nothing extra is persisted and the rules stay pure and testable:

| Rule | Where | Note |
|---|---|---|
| XP per lesson | `xpFor()` | `mins × 5` + `25` per difficulty tier read from the lesson's `level` text |
| Ranks | `rankFor()` | thresholds are **fractions of `TOTAL_XP`**, so adding lessons rescales them automatically |
| Badges | `BADGES[]` | each is `{ icon, name, hint, earned(state) }` — add one by appending to the array |
| Unlocking | `unlockedIds()` | first lesson + anything after a completed one + anything already completed |
| Lit trail | `litRun()` | the unbroken run of completed lessons from the start, drawn glowing over the path |

Pre-v2 saves migrate automatically; they keep a `0` timestamp meaning "date unknown", so
count-based badges still apply but the time-based ones (Swift Traveler, Night Pilgrim) don't
fire retroactively. Completion is checked by **key presence**, never truthiness, so a `0`
timestamp still reads as done.

> **Adding a lesson also means adding its map position.** `NODE_POS` in `WorldMap.tsx` is keyed by
> lesson id — a lesson missing from it will crash the map. The vanilla edition has its own copy in
> `../ai-features-lab/worldmap.js`; both need the new entry.

## Connecting the Agent Runner to OpenClaw

The **🤖 Agent** tab turns the lab from reading material into something that runs. It talks to a
gateway *you* host — nothing is proxied through a third party and there is no backend in this repo.

1. Start your gateway: `openclaw gateway start` (defaults to `127.0.0.1:18789`), verify with
   `openclaw gateway status`.
2. Open the **Agent** tab → **Setup**, paste your `gateway.auth.token` (or `$OPENCLAW_GATEWAY_TOKEN`)
   and hit **Test connection**. A successful probe lists the models the gateway routes to.
3. Open any lesson and click **🤖 Run this lab with OpenClaw** — the lab's goal and steps become the
   prompt, and the reply streams into the Agent tab.

**What it speaks.** The gateway multiplexes a WebSocket RPC channel and an OpenAI-compatible HTTP
API on one port; this client uses the HTTP side — `GET /v1/models` and `POST /v1/chat/completions`
with `Authorization: Bearer <token>`, parsing the SSE stream. Base URL, token and model are all
runtime settings, so a gateway on a different port or behind a proxy needs no code change.

**CORS.** The page is a cross-origin caller, so the gateway has to accept this app's origin
(`http://localhost:5173`) — see `gateway.controlUi.allowedOrigins`. A browser cannot tell "refused"
from "blocked by CORS" (both surface as a bare `TypeError`), so the client reports both possibilities
and the panel links to the fix.

> ⚠️ **This is a real agent, not a sandbox.** OpenClaw has shell, filesystem and browser access on
> your machine. The lab sends a system prompt asking it to work under `./ai-lab-scratch/` and to
> confirm before touching existing files — that is a request the model can ignore, not a guarantee.
> Read what it proposes before letting it act, and don't expose port 18789 beyond loopback.

The token is kept in `localStorage` under `ai-features-lab.openclaw.v1` and is sent only to the URL
you configure. That's appropriate for your own loopback gateway; it is *not* a pattern to reuse for
a hosted third-party API key, which would need a backend to hold it.

## Single source of content

To avoid two copies drifting apart, lessons are still authored once in the vanilla edition's
[`../ai-features-lab/curriculum.js`](../ai-features-lab/curriculum.js). `npm run sync:content`
evaluates that file and regenerates `src/data/curriculum.json`. So: **edit content there, run
the sync, and both editions update.** The example template files in
[`../ai-features-lab/examples/`](../ai-features-lab/examples) are shared too.

> Note on `dangerouslySetInnerHTML`: lesson bodies contain authored HTML (bold, `<code>`,
> links) and are trusted, in-repo content — not user input — so rendering them directly is
> safe here. If content ever becomes user-supplied, add a sanitizer (e.g. DOMPurify).

## Possible next steps (when you need them)

- Port the XP/badge layer back to the vanilla edition (it currently has the map, but not the game
  rules — `gamification.ts` is pure and framework-free, so it transfers almost as-is).
- Add Vitest + React Testing Library — `gamification.ts` and `useProgress.ts` are the obvious first
  targets since they're pure and own all the rules.
- Split `curriculum.json` into per-lesson MDX files for prose-heavy authoring.
- Add React Router for path-based URLs (`/lessons/hooks`) if you want SEO.
- Add a tiny backend to sync progress across devices.
- Add Vitest + React Testing Library for component tests.
