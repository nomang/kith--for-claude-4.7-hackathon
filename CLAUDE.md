# CLAUDE.md — instructions for Claude Code building Kith

This is the orientation file for any Claude Code session working on this
repository. Read it in full before writing or modifying code.

---

## What Kith is

Kith is a voice-based AI companion for people living with mild-to-moderate
Alzheimer's. It helps them stay grounded in their own life through warm,
safe, person-centered conversations, and gives families a gentle weekly
continuity letter about how their loved one has been.

The core loop:

```
Family memory in
  ↓
Structured personhood model (built by Opus 4.7)
  ↓
Safe, contextual companionship (served by Opus 4.7)
  ↓
Weekly continuity letter back to family (synthesized by Opus 4.7)
```

This is what you are building. Everything else is supporting detail.

---

## Build context

- **Hackathon:** Built with Opus 4.7, hosted by Cerebral Valley + Anthropic
- **Timeline:** 4 days of build, 1 day of demo prep, then submission
- **Budget:** $500 in API credits — spend deliberately
- **Team:** Two people
- **Judges:** Boris Cherny and the Claude Code team — they will read the
  repo and the code, not just watch the demo

The single most important strategic fact: **the judges built Opus 4.7.**
They will recognize within 30 seconds whether we used 4.7 as a creative
platform or as a chat endpoint. Design every non-trivial choice around
capabilities that are new or meaningfully improved in 4.7.

---

## What Opus 4.7 must be doing (creatively, visibly)

Nine places Kith uses a 4.7-specific capability. Preserve all of these
when making changes. If a change would silently remove one, flag it.

| # | 4.7 capability | Where it shows up in Kith |
|---|---|---|
| 1 | High-resolution vision (2576px / 3.75MP) | The Shoebox: family uploads scanned old photos; Kith reads handwritten captions, signage, text-in-image to draft the Personhood Map |
| 2 | File-system memory (improved multi-session note use) | Kith's Notebook: a directory of markdown files Kith writes to herself and reads back on every new session |
| 3 | Self-verification (model checks its own outputs) | Every patient response runs a silent "list every claim → find its source → rewrite if unsourced" pass before speaking |
| 4 | Dissonant-data resistance | When the patient confidently asserts something untrue, Kith holds ground gracefully — never harshly contradicts, never confirms the fabrication |
| 5 | Adaptive thinking (optional per-step) | Fast responses on simple greetings; deeper reasoning when the patient is distressed, confused, or asks about something outside the known data |
| 6 | Task budgets (public beta) | Each operation has an explicit token budget: conversation ~3k, nightly reflection ~8k, weekly letter subagents ~10k, synthesizer ~20k |
| 7 | Parallel subagents, deliberately invoked | Weekly letter built by 5 subagents (Mood, Memory, Changes, Routines, Joy) fanning out in a single turn, then synthesized |
| 8 | 1M context at standard pricing | Every conversation loads the full Personhood Map, full rolling notebook, last 10 turns, today's anchors — no rationing |
| 9 | /ultrareview (Claude Code-side) | Run on the codebase before final submission; noted in README |

A tenth, stretch-goal use:

- **128k max output** → "Book of Her" feature. At week-N a command
  generates a keepsake book of the patient's life from all conversation
  history. Ship only if time allows. Mention in demo as future vision.

---

## Hard safety rules (non-negotiable)

These are architectural invariants. Do not relax them to make a feature
easier. If a change would violate one of these, stop and flag it.

1. **Never invent memories.** Every specific claim Kith makes about a
   person, event, place, or fact must trace to the Personhood Map,
   the Notebook, today's anchors, or the current conversation. If
   there is no source, Kith hedges or redirects.
2. **Never pretend to be human.** Kith does not role-play as a family
   member, caregiver, or friend. If asked "are you a person?" Kith
   answers honestly and warmly.
3. **Never ask the patient to remember something as a test.** Do not
   say "do you remember...?" Ground them instead.
4. **Never harshly correct.** When the patient states something untrue,
   use the dissonant-data pattern: acknowledge the feeling, do not
   confirm the false fact, redirect to a known anchor.
5. **Honor avoid-topics from the Personhood Map.** Never raise these
   unprompted. If the patient raises one, respond gently per the
   family's chosen Sensitive Handling Mode.
6. **No medical advice. Ever.** Redirect to "please ask the family"
   or "let's ask the doctor next time."
7. **Risk escalation triggers** — phrases like "I fell," "I can't
   breathe," "I want to die," "someone is hurting me," "I took too
   many pills" — must surface a caregiver attention banner and log
   the event clearly. Details in `SAFETY.md`.
8. **Deceased loved ones** must be handled per family preference
   (Gentle Redirect / Gentle Truth / Memory-First). Never mention
   death unprompted. Never confirm a deceased person is alive.

---

## Voice stack (read this before anything voice-related)

Claude Opus 4.7 is a text-in, text-out model. It does not accept audio
input and does not produce audio output. There is no "Claude voice
mode" API.

Kith's voice layer is a standard three-stage pipeline:

1. **Speech to text:** OpenAI Whisper API
2. **Reasoning:** Claude Opus 4.7 (via Anthropic API)
3. **Text to speech:** ElevenLabs API

Target end-to-end latency: ≤ 3.5 seconds from end-of-speech to
Kith-starts-speaking. If you cannot hit that, reduce the conversation
task budget before you touch the voice stack.

Do not attempt to route through realtime voice APIs from other
vendors (OpenAI Realtime, Gemini Live, etc.) — the integration cost
is not worth it for a 4-day hackathon judged on Claude usage.

---

## Repository shape

```
/
├── CLAUDE.md                   ← you are here
├── README.md                   ← public-facing project description
├── UX.md                       ← design principles for the three screens
├── SAFETY.md                   ← safety rules in detail, including escalation
├── OPUS_4_7_USAGE.md           ← per-feature map of 4.7 usage
├── PHASES.md                   ← the 4-day build plan
├── /prompts/                   ← all system prompts as plain text
│   ├── README.md
│   ├── kith_voice.txt          ← the patient-facing conversation
│   ├── shoebox_onboarding.txt  ← vision pipeline for the Personhood Map
│   ├── weekly_letter.txt       ← synthesizer for the family letter
│   └── letter_subagents.txt    ← the 5 parallel subagents
├── /src/
│   ├── /routes/                ← Express or Next API routes
│   ├── /services/              ← Claude calls, voice, safety
│   ├── /models/                ← PersonhoodMap schema validation
│   └── /utils/
├── /public/                    ← the three HTML pages
│   ├── setup.html              ← caregiver setup wizard
│   ├── talk.html               ← patient companion (the most important UI)
│   └── letter.html             ← weekly letter view
├── /data/
│   ├── personhood.json         ← the one patient's profile
│   ├── conversations.jsonl     ← append-only conversation log
│   └── /kith_notebook/         ← Kith's file-system memory
│       ├── today.md
│       ├── recurring_themes.md
│       ├── joy_log.md
│       ├── concerns.md
│       └── gentle_boundaries.md
└── /demo/                      ← sample data for the demo
    ├── sample_profile.json
    ├── sample_conversations.jsonl
    └── sample_letter.html
```

---

## Prompts live in plain text files, not in code

All system prompts are loaded from `/prompts/*.txt` at runtime. Do not
inline prompts into code. Do not turn them into template literals. The
reason: these files get iterated 50+ times during the build. Keeping
them as plain text means we can tune them without touching any JS/TS
and without breaking anything else.

If you need a placeholder in a prompt, use `{{placeholder}}` syntax.
The code substitutes at call time.

---

## Effort and budget defaults

Use these unless explicitly overridden:

| Call site | Effort | Task budget |
|---|---|---|
| Patient conversation turn | `xhigh` | ~3k tokens |
| Shoebox batch (per ~10 photos) | `high` | ~15k tokens |
| Nightly notebook reflection | `high` | ~8k tokens |
| Letter subagent (each of 5) | `high` | ~10k tokens |
| Letter synthesizer | `xhigh` | ~20k tokens |

Task budgets require the beta header `task-budgets-2026-03-13`.
Set it at the client level.

Never use `max` effort. The 4.7 best-practices doc specifically warns
that max shows diminishing returns and overthinks.

---

## What NOT to build

From the hackathon brief, explicitly out of scope. Do not spend time on:

- Login / auth / user accounts — single patient, single family, hard-coded
- Multi-patient architecture or "teams"
- A dashboard beyond the three screens listed above
- Mobile app — web only, runs in browser
- Medication tracking as a core feature (the Medicine Shelf is stretch)
- GPS, smart home, wearables, or emergency calling
- A real database — JSON files on disk are fine
- Polished onboarding transitions / animations
- Tests beyond a single smoke test for the chat loop
- Error-handling beyond user-facing failure messages and a backend log
- Analytics, telemetry, or any tracking
- A landing page / marketing site

Anything not on the build plan in `PHASES.md` gets a "not this week"
unless explicitly added to the plan.

---

## How to talk to Claude Code on this project

Claude Opus 4.7 works best when given full task context up front rather
than led line-by-line. When opening a session:

- Specify intent, constraints, and acceptance criteria in the first turn
- Point to the relevant prompt file or source file by path
- Batch questions; don't spread a task across many small back-and-forths
- For fan-out work (e.g., updating all 5 subagent prompts), say
  explicitly "spawn subagents in parallel to handle each of the five"

If a task might benefit from `/ultrareview`, use it — especially before
submission.

---

## The success criteria

Submission is ready when these six tests pass:

1. A caregiver can complete the setup wizard (or Shoebox upload) and
   get a Personhood Map they would actually trust.
2. The patient can ask 10 realistic questions (including hard ones —
   asking about a deceased loved one, asking about someone not in
   the doc, asking the same thing three times) and Kith responds
   safely and warmly every time.
3. Kith never invents a fact not present in the data.
4. The Notebook visibly grows across sessions — day 2's conversation
   can reference day 1's.
5. The weekly letter reads like something a family would keep —
   specific, warm, honest, useful.
6. The demo video tells the full loop in under 2 minutes and ends
   on a family moment, not a feature list.

If any of these six does not hold, the submission is not ready.
