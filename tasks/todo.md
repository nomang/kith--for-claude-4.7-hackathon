# Kith — Todo (Next.js build)

Source of truth: `PHASES.md` and `CLAUDE.md` in repo root. This file tracks execution.

Stack: **Next.js 15 (App Router, TypeScript)** + API routes. JSON files in `/data`. Prompts as plain text in `/prompts` with `{{placeholder}}` substitution. Voice = browser SpeechRecognition + Opus 4.7 + Gemini 2.5 Flash TTS.

---

## Phase 0 — Scaffold
- [x] Reorganize spec docs into repo root per `CLAUDE.md` layout
- [x] Scaffold Next.js (TypeScript, App Router, Tailwind)
- [x] `.env.example` with `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- [x] Install deps: `@anthropic-ai/sdk`, `@google/genai`, `zod`, `dotenv`
- [x] Confirm Opus 4.7 round-trip via CLI

## Phase 1 — Make Kith talk (CLI first, no UI)
- [x] `src/services/claude.ts` — Opus 4.7 client with effort, task budgets, beta header
- [x] `src/services/promptLoader.ts` — load `/prompts/*.txt`, substitute `{{placeholder}}`
- [x] `src/services/safeConversation.ts` — build context, call Claude, parse JSON
- [x] `src/models/personhood.ts` — Zod schema for PersonhoodMap
- [x] `src/services/notebook.ts` — read/append `/data/kith_notebook/*.md`
- [x] `scripts/test-kith.ts` — `npx tsx scripts/test-kith.ts "<utterance>"`
- [x] Seed `/data/personhood.json` from `/demo/sample_profile.json`
- [x] Initialize `/data/kith_notebook/*.md` files

## Phase 2 — Voice + `/talk` screen
- [x] `POST /api/chat` route (text-in, JSON-out)
- [x] `POST /api/tts` — Gemini 2.5 Flash TTS → PCM → WAV
- [x] `app/talk/page.tsx` — clock, grounding line, mic button, last response
- [x] Mic button states: resting / listening / processing / speaking
- [x] Browser SpeechRecognition for STT (no key needed)
- [x] Feedback loop fixed (abort mic on result)
- [x] `src/instrumentation.ts` — forces .env to override shell vars

## Phase 3 — Shoebox + Notebook + Pilot
- [x] `POST /api/shoebox` — multipart upload, Opus 4.7 vision, draft Personhood Map
- [x] `app/setup/page.tsx` — Shoebox mode + 6-section wizard, save to personhood.json
- [x] Notebook read-before / append-after in every `/api/chat` call
- [x] `POST /api/reflect` — nightly reflection: behavioural summary, caregiver alert, doctor's note

## Phase 4 — Letter + Polish + Demo
- [x] `POST /api/letter` — 5 parallel subagents (Mood/Memory/Changes/Routines/Joy) + synthesizer
- [x] `app/letter/page.tsx` — letter render + daily analysis panel + caregiver banner
- [x] Sample data in `/demo/` — conversations, letter HTML, profile JSON
- [x] README written
- [ ] `/ultrareview` pass before submission

---

## Review

### What was built
All five phases complete. The full Kith loop works end-to-end:

**Patient flow** (`/talk`): Browser SpeechRecognition → Opus 4.7 (adaptive thinking, 1M context, full personhood map + notebook) → Gemini TTS (Aoede voice) → WAV playback via Web Audio API. Notebook updated after every turn. Risk escalation triggers caregiver banner.

**Family setup** (`/setup`): Shoebox mode — upload photos → Opus 4.7 vision reads handwriting/captions/signage → drafts PersonhoodMap JSON → family reviews in wizard. Wizard mode — 6 sections, dot progress, save to `data/personhood.json`.

**Family letter** (`/letter`): 5 parallel subagents (Mood/Memory/Changes/Routines/Joy) fan out concurrently, synthesizer writes ~400-word prose letter. Daily analysis panel runs a separate Opus 4.7 reflection that produces caregiver alert + doctor's visit note, written to notebook files.

### Nine Opus 4.7 capabilities used
1. High-res vision — Shoebox photo pipeline
2. File-system memory — Kith notebook (5 markdown files)
3. Self-verification — every chat response checks claims against data
4. Dissonant-data resistance — George pattern, fabrication handling
5. Adaptive thinking — `effort: medium` for greetings, `xhigh` for distress/hard questions
6. Task budgets — explicit per-call budgets (3k conversation, 10k subagent, 20k synthesizer)
7. Parallel subagents — 5 fan out in one `Promise.all` for the weekly letter
8. 1M context — full personhood map + all notebook files + last 10 turns loaded every turn
9. /ultrareview — run before submission

### Safety rules enforced
- Never invent — self-verification pass in every response
- Never claim to be human — explicit in system prompt + examples
- Never test the patient's memory — "do you remember?" pattern forbidden
- Never harshly correct — dissonant-data pattern with three handling modes
- Risk escalation — "I fell / I want to die / I can't breathe" → caregiver banner + log
- Avoid-topics honored — per Personhood Map + gentle_boundaries.md
- No medical advice — redirect to family/doctor
- Deceased loved ones — per family's chosen Sensitive Handling Mode
