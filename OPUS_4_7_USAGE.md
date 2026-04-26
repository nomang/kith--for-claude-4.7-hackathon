# How Kith uses Claude Opus 4.7

This file documents which Opus 4.7-specific capabilities each part of Kith
uses, why they matter, and exactly where in the code they fire.

Kith is designed *around* Opus 4.7 — not merely powered *by* it. Every
capability listed here is used at runtime in production code, not just
claimed in a pitch deck.

---

## The design principle

Kith is a companion for someone whose memory is failing and for the family
trying to hold that person's life together. Several of Opus 4.7's
capabilities map directly onto that job in ways that make the difference
between a safe product and a dangerous one:

| # | Opus 4.7 capability | The patient need it addresses |
|---|---|---|
| 1 | High-resolution vision | Read a family's old photographs and handwritten captions |
| 2 | File-system memory | Keep a nurse's notebook across sessions, not just one conversation |
| 3 | Self-verification | Never invent a memory that isn't in the data |
| 4 | Dissonant-data resistance | Hold ground when the patient confidently asserts something untrue |
| 5 | Adaptive thinking | Respond fast in gentle moments, reason deeply in hard ones |
| 6 | Task budgets | Pace care across a day — quick in conversation, deeper at night |
| 7 | Parallel subagents | Bring five specialist lenses to the weekly family letter |
| 8 | 1M token context | Hold the person's whole life in-context every turn — no rationing |
| 9 | Tool use · Agentic loop | Investigate family questions by reading notes and citing every claim |
| 10 | Routine analysis · Reminders | Generate warm, time-aware grounding reminders from the patient's daily schedule |

---

## 1. High-resolution vision (2576px / 3.75MP)

**Code:** `src/app/api/shoebox/route.ts`  
**Prompt:** `prompts/shoebox_onboarding.txt`

**Why 4.7 specifically:** At 4.6's 1568px ceiling, scans of old photographs
lose handwritten captions, faded signage, and text-in-image detail. At
4.7's 2576px those are reliably readable. This is not a marginal improvement
— it is the difference between Kith being able to read a 1968 caption or not.

**How it works in code:**
- Family uploads scanned photos via `/caregiver-input`
- `src/app/api/shoebox/route.ts` sends each photo as a base64 `image` block
  to Opus 4.7 with `thinking: { type: 'adaptive' }` and `effort: 'high'`
- Kith extracts: people visible, apparent era, location clues, occasion,
  and handwritten captions on the backs of prints
- Output is a draft Personhood Map the family reviews and corrects at
  `/map-review`

**Why it matters:** Many families cannot fill out a blank form about their
parent. They freeze. But they have a shoebox. 4.7's vision turns that
shoebox into a life story.

---

## 2. File-system memory (Kith's Notebook)

**Code:** `src/services/notebook.ts`, `src/app/api/reflect/route.ts`  
**Data:** `data/kith_notebook/` (5 markdown files)

**Why 4.7 specifically:** The 4.7 release explicitly calls out improved
multi-session note use — the model is better at reading files it wrote
itself and acting on them across future sessions.

**How it works:**

```
data/kith_notebook/
  today.md              — today's observations, appended live per turn
  recurring_themes.md   — things the patient brings up repeatedly
  gentle_boundaries.md  — family-editable soft-avoids (e.g. "don't mention the dog")
  joy_log.md            — specific moments of comfort and connection
  concerns.md           — risk flags and emerging patterns
```

- Every conversation turn begins with `readNotebookAsText()` — all 5 files
  loaded into the system prompt
- Every turn ends with `appendToNotebook()` writing Kith's observation
- Nightly: `/api/reflect` runs a reflection pass that restructures the
  notebook (`writeNotebookFile('today.md', ...)`) and appends to `concerns.md`
- The weekly letter reads the entire notebook before the 5 agents run

**Framing:** Kith keeps a notebook, like a nurse at a bedside table. She
reads it at the start of every shift and adds to it at the end. It's how
she remembers what the patient cannot.

---

## 3. Self-verification

**Code:** `src/services/safeConversation.ts` (calls the prompt below)  
**Prompt:** `prompts/kith_voice.txt` — "Self-verification" section

**Why 4.7 specifically:** 4.7 natively devises ways to check its own
outputs before reporting. Anthropic partner Hex noted that 4.7 "correctly
reports when data is missing instead of providing plausible-but-incorrect
fallbacks." That is exactly what a dementia companion needs.

**How it works:** Before emitting any patient-facing response, the
`kith_voice.txt` prompt instructs Kith to run a silent verification pass:

1. List every specific claim in the draft (names, dates, places, relationships)
2. For each claim, identify its source (Personhood Map / Notebook / today's anchors / current conversation)
3. Any claim with no source triggers a rewrite — hedge or redirect, never guess

**Why it matters:** Hallucinated biography in a dementia tool is
catastrophic. Self-verification is the architectural firewall.

---

## 4. Dissonant-data resistance

**Code:** `src/services/safeConversation.ts`, `prompts/kith_voice.txt`  
**Reference:** `SAFETY.md` — "Dissonant-data handling"

**Why 4.7 specifically:** Opus 4.7 resists "dissonant-data traps" — when a
user confidently asserts something contradicted by the data, 4.7 holds
ground gracefully where 4.6 would capitulate.

**How it works in code:**
- `isComplexUtterance()` in `safeConversation.ts` detects avoided topics
  and distress signals, escalating effort to `'xhigh'`
- The `kith_voice.txt` prompt frames the patient as a *trusted but
  unreliable narrator* and gives concrete response patterns for each case
- Three Sensitive Handling Modes (Gentle Redirect / Gentle Truth /
  Memory-First) are set by the family at setup and shape every response —
  see `SAFETY.md` for the full matrix

**In practice:**
> Patient: "Where is George?" (husband, deceased)  
> Kith (Gentle Redirect): "You're thinking about George. Would you like
> me to put on your Willie Nelson record for a bit?"

No confirmation. No harsh correction. Warm redirection to a known anchor.

---

## 5. Adaptive thinking

**Code:** `src/services/safeConversation.ts` — `isComplexUtterance()` + `effort` param

**Why 4.7 specifically:** Thinking is now optional per-step — the model
decides when to think more based on context. Less prone to overthinking
than 4.6 on simple turns.

**How it works:**

```typescript
const isComplex = isComplexUtterance(utterance, map.comfort_and_avoid.topics_to_avoid);
const effort = isComplex ? 'xhigh' : 'medium';
```

`isComplexUtterance()` returns `true` when:
- The utterance contains a risk word (fell, bleeding, want to die…)
- The utterance touches a family-specified avoid topic
- The utterance is longer than 120 characters (nuance likely needed)
- The utterance mentions a person not in the Personhood Map

**In practice:** "Good morning, Kith" → `medium` effort, ~1 second response.
"Where is George?" (George is deceased) → `xhigh` effort, ~3–4 seconds.
Judges see this without needing it captioned.

---

## 6. Task budgets (public beta)

**Code:** `src/services/claude.ts` — `TASK_BUDGETS` + beta header  
**Beta header:** `anthropic-beta: task-budgets-2026-03-13`

**Why 4.7 specifically:** Task budgets give the model a running token
countdown across an agentic loop so it can prioritise and wrap up
gracefully rather than hitting the limit mid-thought.

**Per-operation budgets in `TASK_BUDGETS`:**

| Operation | Effort | Budget | File |
|---|---|---|---|
| Patient conversation turn | `medium` / `xhigh` | ~3k | `src/services/safeConversation.ts` |
| Shoebox photo batch (~10 photos) | `high` | ~15k | `src/app/api/shoebox/route.ts` |
| Nightly reflection | `high` | ~8k | `src/app/api/reflect/route.ts` |
| Letter subagent (each of 5) | `high` | ~10k | `src/app/api/letter/route.ts` |
| Letter synthesizer | `xhigh` | ~20k | `src/app/api/letter/route.ts` |
| Ask Kith investigator | `high` | ~25k | `src/services/claudeAgent.ts` |

---

## 7. Parallel subagents, deliberately fanned out

**Code:** `src/app/api/letter/route.ts` — `callClaudeParallel()`  
**Service:** `src/services/claude.ts` — `callClaudeParallel()` uses `Promise.all`  
**Prompts:** `prompts/letter_subagents.txt`, `prompts/weekly_letter.txt`

**Why 4.7 specifically:** 4.7's best-practices doc says to spell out
explicitly when fan-out is wanted. `callClaudeParallel()` does exactly
that — five concurrent calls in a single orchestration turn.

**How it works:**

```
[Letter orchestrator]
        |
  ┌─────┼─────┬──────┬──────┐
  ↓     ↓     ↓      ↓      ↓
Mood Memory Changes Routines Joy
  └─────┴─────┴──────┴──────┘
        |
  [Synthesizer — xhigh, ~20k budget]
        |
   Final letter (~400 words)
```

- **Mood** — emotional weather of the week
- **Memory** — which people, places, and stories dominated
- **Changes** — new patterns vs. Personhood Map baseline and prior weeks
- **Routines** — which routines held, which slipped
- **Joy** — specific moments of warmth and connection

All five run simultaneously via `Promise.all`. The synthesizer receives
all five reports and produces a single warm, specific, cited family letter.

---

## 8. 1M token context at standard pricing

**Code:** `src/services/safeConversation.ts` — system prompt construction

**Why 4.7 specifically:** 1M context at no long-context premium. Kith
stops rationing. No summarisation-induced information loss.

**What loads into every conversation turn:**

| Content | Approx. tokens |
|---|---|
| Full Personhood Map (JSON) | ~5–10k |
| Full Kith Notebook (5 markdown files) | ~4k |
| Last 10 conversation turns | ~2k |
| Today's anchors (what's happening, who's visiting) | ~500 |
| **Total per turn** | **~12–17k** |

Combined footprint is well under 1M — every fact Kith knows about the
patient is present in full on every single turn. Nothing summarised,
nothing left out, nothing forgotten.

---

## 9. Tool use · Agentic loop (Ask Kith Investigator)

**Code:** `src/services/claudeAgent.ts`, `src/services/agentTools.ts`  
**Route:** `src/app/api/ask/route.ts`  
**Prompt:** `prompts/care_investigator.txt`

**Why 4.7 specifically:** Tool use in 4.7 is more reliable and
self-directed. The model knows when it has enough information and
calls `finalize_answer` without being forced.

**How it works — 6 tools in a multi-turn loop:**

| Tool | What it does |
|---|---|
| `list_notebook_files` | Sees what memory files are available |
| `read_notebook_file` | Reads a specific notebook file verbatim |
| `search_conversations` | Full-text search across all conversation history |
| `check_recurrence` | Counts how many times a topic/name appeared this week |
| `read_personhood_section` | Reads a specific section of the Personhood Map |
| `finalize_answer` | Terminal — emits the cited answer and stops the loop |

**Example trace for "Has she been mentioning George more this week?":**
1. `search_conversations` → finds 7 George mentions in 3 days
2. `check_recurrence` → confirms up from 2 the prior week
3. `read_personhood_section` → reads George's entry in the Personhood Map
4. `finalize_answer` → cites all three sources in the answer

Every claim in the output is sourced. Not a chatbot answer. An investigation.

---

## 10. Routine analysis · Grounding reminders

**Code:** `src/app/api/reminders/route.ts`  
**UI:** `src/app/talk/TalkScreen.tsx` — `RemindersWidget` ("What's on today?" button)

**Why it matters for Alzheimer's patients:** Disorientation peaks when
routines feel unpredictable. A gentle, time-aware prompt from Kith — *"It's
nearly time for your herb garden walk"* — provides grounding without
demanding the patient remember anything.

**How it works:**
- Reads `map.routines` from the Personhood Map (family-specified daily schedule)
- Sends the current time and day name to Opus 4.7
- Generates 1–3 reminders tagged `now` / `soon` / `today`
- Each reminder is phrased as a warm fact, never a command:
  *"This is usually when you have your cup of tea by the window"*
- A `comfort_cue` from the patient's known comfort items is included when relevant

**Prompt rules enforced:**
- Never "you should" or "don't forget"
- Always grounded in the patient's *actual* routine — no generic suggestions
- Urgency tagged precisely so the UI can show what matters right now

---

## What Kith does not overclaim

For honesty — things mentioned elsewhere that are not runtime API capabilities:

- **/ultrareview** — a Claude Code development tool used before submission, not an Opus 4.7 API capability
- **128k max output (Book of Her)** — a planned stretch feature; not shipped in this build
- **Programmatic image-library tool-calling** — not used beyond photo reading in the Shoebox

---

## The file that proves it

Every capability above is callable end-to-end in the running app.
The judge who wants to verify can:

1. Upload a photo → `src/app/api/shoebox/route.ts` → capability #1
2. Talk to Kith → `src/services/safeConversation.ts` → capabilities #2, 3, 4, 5, 6, 8
3. Click "What's on today?" on `/talk` → `src/app/api/reminders/route.ts` → capability #10
4. Generate the weekly letter on `/family-letter` → `src/app/api/letter/route.ts` → capability #7
5. Ask a question on `/ask` → `src/services/claudeAgent.ts` → capability #9
6. Run daily analysis on `/letter` → `src/app/api/reflect/route.ts` → capability #6
