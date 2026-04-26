# Kith — The Companion That Knows Who She Is

> **Cerebral Valley × Anthropic · Claude Opus 4.7 Hackathon · April 2026**

*Holding onto the person, not just the patient.*

---

## What

Kith is a voice-first AI companion for people living with mild-to-moderate Alzheimer's disease — and a weekly continuity letter for the families who love them.

It is not a generic chatbot. Every word Kith speaks is grounded in a structured **Personhood Map** built from the patient's own life: their stories, the people they love, their routines, the things that bring comfort. Kith never invents a memory. Every claim traces back to a source.

---

## The Problem — Scale and Urgency

Alzheimer's is not a niche condition. It is one of the largest, fastest-growing, and most under-served health crises on the planet.

### Prevalence

| Stat | Figure | Source |
|---|---|---|
| People living with dementia worldwide today | **55 million** | WHO, 2023 |
| Alzheimer's share of all dementia cases | **60–70%** | WHO |
| New cases diagnosed globally every year | **10 million** | WHO |
| Americans aged 65+ living with Alzheimer's | **6.7 million** | Alzheimer's Association, 2023 |
| Frequency of new US diagnoses | **Every 65 seconds** | Alzheimer's Association |
| Projected global cases by 2050 | **139 million** | Alzheimer's Disease International |

### Human cost

| Stat | Figure | Source |
|---|---|---|
| Unpaid family caregivers in the US alone | **11 million** | Alzheimer's Association, 2023 |
| Hours of unpaid care provided annually | **18.4 billion hours** | Alzheimer's Association, 2023 |
| Average years lived with the disease after diagnosis | **8–10 years** | CDC |
| Patients diagnosed in the early stage (when help is most effective) | **fewer than 1 in 4** | Alzheimer's Association |
| Dementia care that happens at home, not in facilities | **~70%** | Alzheimer's Disease International |

### Economic cost

| Stat | Figure | Source |
|---|---|---|
| Annual economic cost in the US | **$345 billion** | Alzheimer's Association, 2023 |
| Projected annual US cost by 2050 | **$1 trillion+** | Alzheimer's Association |
| Average lifetime care cost per patient | **$290,000+** | Alzheimer's Association |
| Alzheimer's rank among leading causes of death in the US | **7th** | CDC |

### The gap Kith fills

Research is consistent on one point: **social isolation and lack of meaningful conversation accelerate cognitive decline.** Patients who have regular, grounded, personally-relevant conversation show measurably slower progression. Yet the reality for most families is that their loved one spends hours alone — unable to navigate a smartphone, too disoriented to call anyone, and too confused for a generic voice assistant that has no idea who they are.

There is currently no AI product built specifically around the safety and identity needs of an Alzheimer's patient. Kith is the first.

---

## Why

Over **55 million people** worldwide live with Alzheimer's. Their families cannot be present every hour. When they are not — the person is alone, disoriented, and talking to no one who knows them.

Generic AI assistants make this worse: they hallucinate facts, confirm false memories, and have no idea who the person is. Kith is designed from the ground up to be the opposite — safe, grounded, and deeply personal.

**Three hard problems Kith solves that generic AI cannot:**

1. **False memory confirmation** — When Ellie says "George is coming for dinner," a generic AI plays along. Kith holds ground warmly without harsh correction — an architectural constraint called *dissonant-data resistance*.
2. **Context collapse** — Every conversation starts from scratch with generic AI. Kith loads the full Personhood Map, rolling notebook, and conversation history into every turn. Nothing is ever forgotten.
3. **Family disconnection** — Families can't know how their loved one is really doing. Kith's weekly letter and on-demand investigator give specific, sourced, honest answers.

---

## How

### The core loop

```
📷  Family Memory In
    Shoebox photos · Caregiver notes · Handwritten captions
         ↓  [Opus 4.7 high-res vision reads every photo]
🗺  Personhood Map
    Every fact tagged known or inferred — nothing invented, ever
         ↓  [1M token context — full map in every turn]
🎙  Safe Companionship
    Warm, grounded, dissonant-data resistant — in her voice
         ↓  [Kith writes observations nightly — file-system memory]
📓  Kith's Notebook
    Grows across sessions — Day 7 still knows Day 1
         ↓  [5 parallel subagents fan out simultaneously]
👥  Five Specialist Agents
    Mood · Memory · Changes · Routines · Joy
         ↓  [Synthesizer produces the weekly letter]
💌  Weekly Family Letter
    Warm · Specific · Cited — something a family would keep
         ↓
🔍  Ask Kith — Investigator
    Tool loop: reads notes, searches conversations, cites every claim
         ↓
👪  Family
    Letter · On-demand answers · Daily caregiver alerts
```

### The three surfaces

| Surface | Who | What it does |
|---|---|---|
| **Talk** `/talk` | The patient | Always-on voice companion. Wake word: "Hey Kith". Full Personhood Map + notebook in every turn. |
| **Personhood Map** `/map-review` | Caregiver (setup) | Interactive life timeline built by Opus 4.7 from shoebox photos. Every person, every memory, every anchor. |
| **Family** `/family-letter` + `/ask` | The family | Weekly letter from 5 parallel agents + an on-demand investigator that reads its own notes and cites every claim before answering. |

### Safety constraints (non-negotiable)

1. **Never invent memories** — every claim traces to the Personhood Map, notebook, or conversation
2. **Never pretend to be human** — Kith answers honestly when asked
3. **Never test memory** — no "do you remember?" — grounds instead
4. **Never harshly correct** — acknowledge feeling, do not confirm false fact, redirect to known anchor
5. **Never give medical advice** — redirects to family or doctor
6. **Risk escalation** — "I fell," "I want to die," etc. surface an immediate caregiver alert and notebook entry

---

## Claude Opus 4.7 — Nine Capabilities, All Used

| # | Capability | Where in Kith |
|---|---|---|
| 1 | **High-res vision** (2576px / 3.75MP) | Reads handwriting, signage, and text-in-image on scanned family photos to build the Personhood Map |
| 2 | **File-system memory** | Kith's Notebook — 5 markdown files Kith writes to herself nightly and reads back every session |
| 3 | **Self-verification** | Every patient response runs a silent claim-tracing pass: list claims → find sources → rewrite if unsourced |
| 4 | **Dissonant-data resistance** | When the patient asserts something false, Kith never confirms and never harshly corrects — redirects to known anchors |
| 5 | **Adaptive thinking** | Fast responses on simple greetings; deeper reasoning when the patient is distressed or asks about something outside the known data |
| 6 | **Task budgets** | Explicit token budgets per operation: conversation ~3k, nightly reflection ~8k, letter subagents ~10k, synthesizer ~20k |
| 7 | **Parallel subagents** | Weekly letter: 5 specialist agents fan out in a single turn (Mood, Memory, Changes, Routines, Joy), synthesized by a 6th |
| 8 | **1M token context** | Full Personhood Map + full notebook + last 10 turns + today's anchors in every conversation — no rationing |
| 9 | **Tool use · Agentic loop** | Ask Kith runs a multi-turn tool loop: `read_notebook_file`, `search_conversations`, `check_recurrence`, `finalize_answer` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| AI reasoning | Claude Opus 4.7 (Anthropic API) |
| Speech-to-text | Browser Web Speech API (SpeechRecognition) |
| Text-to-speech | Gemini 2.5 Flash TTS (primary) · Browser speechSynthesis (fallback) |
| Wake word | Continuous SpeechRecognition — "Hey Kith" |
| Data storage | JSON + JSONL + Markdown files on disk (`data/`) — no database |
| Hosting | Vercel-ready |

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd claude47-hackathon
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. First-time setup

1. `/caregiver-input` — enter the patient's name, key facts, people, routines, and upload photos
2. `/map-review` — review the Personhood Map built by Opus 4.7 from the photos
3. `/talk` — tap the mic or say **"Hey Kith"** to start

> Sample data for **Ellie Marsh** (the demo patient) is pre-loaded in `data/` — you can skip straight to `/talk` to see Kith in action.

---

## Project Structure

```
/
├── src/
│   ├── app/
│   │   ├── page.tsx               # Homepage — hero, animated pipeline, capabilities
│   │   ├── talk/                  # Patient companion screen
│   │   ├── map-review/            # Personhood Map + Shoebox timeline
│   │   ├── family-letter/         # Weekly letter (5 parallel agents)
│   │   ├── letter/                # Daily analysis + doctor's note
│   │   ├── ask/                   # Ask Kith investigator (agentic loop)
│   │   └── api/                   # API routes: chat, tts, letter, ask, reflect, reminders…
│   ├── components/
│   │   ├── HeyKith.tsx            # Always-on wake-word orb (floating, every page)
│   │   ├── DemoTour.tsx           # Cinematic guided demo tour (spotlight + mission card)
│   │   └── KithFlow.tsx           # Animated pipeline diagram (homepage)
│   └── services/
│       ├── claude.ts              # Opus 4.7 client — adaptive thinking, parallel calls, task budgets
│       ├── claudeAgent.ts         # Multi-turn tool-use agentic loop (Ask Kith)
│       └── agentTools.ts          # 6 tool implementations for the investigator
├── data/
│   ├── personhood_map.json        # Ellie's structured Personhood Map (known/inferred tags)
│   ├── conversations.jsonl        # Append-only conversation log
│   └── kith_notebook/             # Kith's file-system memory
│       ├── today.md
│       ├── recurring_themes.md
│       ├── joy_log.md
│       ├── concerns.md
│       └── gentle_boundaries.md
├── prompts/                       # All system prompts as plain text files (not inlined in code)
├── demo/                          # Sample data: photos, conversations, letter
├── CLAUDE.md                      # Orientation for Claude Code sessions
├── SAFETY.md                      # Full safety specification and risk escalation rules
└── .env.example                   # Required environment variables (no secrets)
```

---

## Who

**Muhammad Noman**  
Founder, BTL Software  
[mnoman@btlsoftware.com](mailto:mnoman@btlsoftware.com)

Built solo for the **Cerebral Valley × Anthropic Claude Opus 4.7 Hackathon** — 4 days of build, powered entirely by Claude Code and Opus 4.7.

---

## Roadmap

Kith v1 is the hackathon build — voice companion, Personhood Map, weekly letter, and the Ask Kith investigator. Here is what comes next.

### Wearable integration — Apple Watch & smartwatch support

The hardest moments for an Alzheimer's patient happen when no one is watching. A smartwatch changes that.

Planned capabilities:
- **Passive safety monitoring** — fall detection, heart rate anomalies, and unusual stillness trigger a caregiver alert without the patient needing to do anything
- **Ambient check-ins** — Kith notices the patient hasn't moved in two hours and sends a gentle voice prompt through the watch: *"Ellie, it's nearly lunchtime — can I help you find the kitchen?"*
- **Location anchoring** — if the patient wanders outside a safe zone, the watch vibrates and Kith speaks a grounding phrase tied to their Personhood Map
- **Conversation from the wrist** — tap to talk to Kith directly from the watch; no phone, no screen, no confusion
- **Biometric context in responses** — elevated heart rate or disrupted sleep shared with Kith's context so conversations can open with appropriate warmth (*"You didn't sleep well last night — shall we sit quietly for a bit?"*)

### Caregiver & clinical tools

The current build gives caregivers a daily analysis and a doctor's note. The next version gives clinicians a proper professional toolkit.

Planned capabilities:
- **Caregiver dashboard** — week-at-a-glance view: mood trend, sleep pattern, high-risk moments flagged, topics that brought joy, topics that caused distress
- **GP / specialist report** — one-click structured clinical summary covering cognitive observations, behavioural changes, physical complaints, and monitoring suggestions — formatted for the doctor's record system
- **Medication reminder integration** — Kith reads the prescription schedule and reminds the patient in their own language style (*"Ellie, it's time for your little white pill — the one Dr. Henderson gave you"*)
- **Multi-caregiver handover notes** — shift-change summary so the incoming caregiver knows exactly what happened, what was said, and what to watch for
- **Decline trend detection** — Opus 4.7 analyses conversation history across weeks to surface early signals of cognitive change, reported to the clinical team before the family notices
- **Family portal** — role-based access so adult children in different cities each see what is relevant to them: the letter, the alerts, the ability to ask Kith questions

---

## A note on who this is really for

Somewhere there is a family who has watched someone they love begin to disappear while still sitting in front of them. There is a daughter who hasn't lived in the same city as her mother in fifteen years and calls every day and is still not there for the hardest hours. There is a grandmother who is frightened sometimes because the people in the pictures on her wall feel both familiar and far away.

Kith was built for them.
