# CLAUDE_CODE_PROMPTS.md — the prompts you paste into Claude Code

Opus 4.7 in Claude Code works best when you give it full task context
up front — intent, constraints, acceptance criteria, relevant file
paths — rather than leading it line by line. The 4.7 best-practices
doc is explicit about this.

This file contains the prompts to paste at the start of each build
session. They are structured so Claude Code has everything it needs
to work autonomously.

---

## How to use this file

For each session:

1. Open Claude Code in the repo root
2. Pick the relevant prompt from this file
3. Paste it as your first message
4. Let Claude Code work — avoid interrupting every 30 seconds

Do not hand-hold. If Claude Code gets stuck, give it a focused
nudge and step back.

If you want deeper thinking on a hard task, append:
> "Think carefully and step-by-step before making changes.
> This affects the conversation loop which is the demo's core."

---

## Session 1 — Day 1 morning: project skeleton + Claude client

```
Read CLAUDE.md, OPUS_4_7_USAGE.md, SAFETY.md, and PHASES.md to
orient. Do not skim — these files are the contract.

Then build the minimum skeleton for Phase 1:

1. package.json with dependencies: express, cors, dotenv,
   @anthropic-ai/sdk, openai (for Whisper), and node-fetch
2. .env.example listing ANTHROPIC_API_KEY, OPENAI_API_KEY,
   ELEVENLABS_API_KEY
3. src/services/claude.js — a single exported function
   callClaude({ systemPrompt, userMessage, effort, taskBudget })
   that:
   - uses the task-budgets-2026-03-13 beta header
   - defaults to model "claude-opus-4-7" and effort "xhigh"
   - accepts an optional taskBudget parameter and passes it through
   - parses the response and returns the text content
4. src/services/prompts.js — loads a prompt file from /prompts/
   and substitutes {{placeholders}} from a given object
5. test-kith.js — a CLI: node test-kith.js "<utterance>"
   that loads data/personhood.json, loads prompts/kith_voice.txt,
   substitutes all placeholders, calls Claude, and pretty-prints
   the JSON response with the spoken_response highlighted.

Acceptance criteria:
- node test-kith.js "Hello" prints a valid JSON response with a
  spoken_response field
- The call uses xhigh effort and a task budget of 3000 tokens
- Prompts are loaded from disk at runtime, not embedded in code

Do not build any UI yet. Do not build /api routes yet. Do not
build voice integration yet. The goal of this session is a
working CLI loop.
```

---

## Session 2 — Day 1 afternoon: voice tuning

This is not a build session — it's a prompt-tuning session. Do
not use Claude Code for this. Use `test-kith.js` directly.

1. Run every one of the 30 hardest-utterances tests in PHASES.md
2. For each failure, edit `prompts/kith_voice.txt` and re-run
3. Goal: every one of the 30 produces a dignity-preserving,
   non-hallucinating response

Common failure modes to watch for and fix in the prompt:
- Kith asks "do you remember...?" (never allowed)
- Kith invents a detail not in the Personhood Map
- Kith's response is longer than 3 sentences on simple prompts
- Kith says "I'm an AI assistant" instead of "I'm Kith"
- Kith confirms a false fact the patient asserted
- Kith breaks JSON format

Do not move to Day 2 until all 30 pass.

---

## Session 3 — Day 2 morning: voice pipeline

```
Goal for this session: add voice input and output to the CLI, then
prove end-to-end voice round-trip works in under 4 seconds.

Read UX.md for the voice latency target and quality guidance.

Build:
1. src/services/voice.js with two functions:
   - transcribe(audioBuffer) → text, via OpenAI Whisper API
   - speak(text) → audioBuffer, via ElevenLabs API
   Use a warm voice (look up ElevenLabs voice IDs — pick one that
   is calm and not broadcast-smooth; we'll audition more later)
2. test-voice.js — a CLI that records 5 seconds of audio from the
   mic, transcribes it, passes through the existing Kith loop,
   and plays the response audio
3. Time each stage and log it at the end of each run

Acceptance criteria:
- Full round trip (speech end → audio playback start) completes
  in under 4 seconds on a typical wifi connection
- The playback voice is warm and calm (we'll judge subjectively)
- The prompt, effort level, and task budget are unchanged from
  Session 1

Do not touch the patient-facing UI yet. We're still at the CLI.
```

---

## Session 4 — Day 2 afternoon: the /talk screen

```
Read UX.md in full before writing any HTML or CSS. The /talk
screen is the single most important surface Kith has and the
spec in UX.md is detailed — follow it exactly.

Build public/talk.html — a single-page app that:

1. Shows the date and time of day in large serif at the top
2. Displays Kith's last response in large serif (min 32px) in
   the middle-upper area
3. Shows the mic button per the three-state spec in UX.md:
   resting, listening, speaking — with the exact animations
   described
4. Shows today's anchors (from personhood.json this_week field)
   softly at the bottom
5. Uses the exact color palette in UX.md (cream, navy, coral)
6. Implements tap-to-talk interaction: hold or tap-and-release
   to record, then send audio to /api/chat

Also build src/routes/chat.js — POST /api/chat that:
1. Accepts audio (multipart) or text (for fallback testing)
2. If audio, transcribes via Whisper
3. Runs through the existing Kith conversation loop
4. Returns JSON: { spoken_response, audio_url, observation }
5. Appends the turn to /data/conversations.jsonl

Acceptance criteria:
- The screen matches the UX.md layout exactly
- All three mic states animate correctly
- Full voice round-trip works from the browser
- Text contrast ratio passes WCAG AAA
- prefers-reduced-motion is respected
- No other UI elements on the screen (no logo, no menu, no
  settings, no history)

End of session: I should be able to sit down with my laptop and
have a real spoken conversation with Kith that feels warm.
```

---

## Session 5 — Day 3 morning: the Shoebox

```
Goal: the high-resolution vision pipeline that drafts the
Personhood Map from scanned family photos. This is one of the
two biggest 4.7 showcase features — prioritize it.

Read OPUS_4_7_USAGE.md section 1 and prompts/shoebox_onboarding.txt
before starting.

Build:

1. src/services/shoebox.js — a function processShoebox(imagePaths)
   that:
   - Batches images in groups of 10
   - For each batch, calls Claude Opus 4.7 with:
       - effort: high
       - task_budget: 15000
       - the prompt from prompts/shoebox_onboarding.txt
       - the images as image content blocks at full resolution
   - Merges batch outputs into a single draft Personhood Map
   - Handles the _confidence and _source fields correctly

2. public/setup.html — a page with two entry points:
   - "Tell Kith about your loved one" (wizard path — stub this)
   - "Upload photos from the shoebox" (file input accepting
     20-100 images, calls POST /api/shoebox)

3. src/routes/shoebox.js — POST /api/shoebox that:
   - Accepts uploaded images
   - Calls processShoebox
   - Returns the draft Personhood Map as JSON
   - Saves to /data/personhood_draft.json for family review

Acceptance criteria:
- Uploading 20 real photos produces a draft Personhood Map in
  under 2 minutes
- Every extracted person/event has a _source field pointing to
  a specific image
- The draft is not trusted as the final Personhood Map — it is
  marked as draft until the family reviews
- Handwritten captions on backs of photos are being read
  (test with at least 3 such images)

This feature is a demo centerpiece — get it right before moving on.
```

---

## Session 6 — Day 3 morning: the Notebook

```
Goal: Kith's file-system memory. Second of the two biggest 4.7
showcase features.

Read OPUS_4_7_USAGE.md section 2 before starting.

Build:

1. Initialize /data/kith_notebook/ with empty:
   - today.md
   - recurring_themes.md
   - joy_log.md
   - concerns.md
   - gentle_boundaries.md
   
2. Update src/services/safeConversation.js so that every
   conversation turn:
   - Reads all five notebook files before calling Claude
   - Concatenates them into the {{notebook}} placeholder
   - After the Claude response, appends each notebook_updates
     entry to the corresponding file with a timestamp

3. Create src/services/nightlyReflection.js — a function that:
   - Loads today.md plus the other four files
   - Calls Claude with effort: high and task_budget: 8000
   - Asks Claude to restructure the notebook: move stable
     recurring themes into recurring_themes.md, clear today.md,
     etc.
   - The prompt for this is in prompts/nightly_reflection.txt
     (create it if not present — model it on kith_voice.txt's
     brevity and self-verification rules)

4. Expose a POST /api/notebook/reflect endpoint so the demo
   can trigger the nightly job on demand.

Acceptance criteria:
- A conversation on Day 2 of the pilot can reference a moment
  from Day 1 naturally (e.g., "you were asking about Lily
  yesterday")
- The notebook files visibly grow and restructure
- concerns.md correctly accumulates any risk-flagged turns
```

---

## Session 7 — Day 4 morning: the letter pipeline

```
Goal: the weekly family letter, built as a five-subagent fan-out
followed by a synthesizer. This is the third of the three big
4.7 showcase features.

Read OPUS_4_7_USAGE.md section 7, prompts/letter_subagents.txt,
and prompts/weekly_letter.txt in full before starting.

Build:

1. src/services/continuityLetter.js — a function generateLetter()
   that:
   - Loads the week's conversations.jsonl and the full notebook
   - Spawns all five subagents IN PARALLEL (use Promise.all) with:
       - effort: high
       - task_budget: 10000
       - the relevant section of prompts/letter_subagents.txt
   - Collects their five JSON outputs
   - Calls the synthesizer with:
       - effort: xhigh
       - task_budget: 20000
       - prompts/weekly_letter.txt
       - all five subagent outputs as context
   - Returns the final letter as plain text

2. src/routes/letter.js — POST /api/letter/generate that calls
   generateLetter() and saves the result to /data/latest_letter.md

3. public/letter.html — renders the most recent letter per the
   UX.md spec. Include the caregiver attention banner at the top
   if concerns.md contains unacknowledged RISK_ESCALATION entries.

4. On first visit to /letter with no generated letter, show a
   single button: "Generate this week's letter." This lets the
   demo trigger generation live.

Acceptance criteria:
- The five subagents are genuinely called in parallel (confirm
  by timing — five calls complete in roughly the duration of one)
- The synthesizer's output reads like a letter, not a report
- A real letter generated from the real pilot conversation
  produces observations the family finds meaningful
- The caregiver attention banner appears when concerns.md has
  fresh risk entries
```

---

## Session 8 — Day 4 afternoon: ultrareview + polish

```
Final polish pass before demo recording and submission.

1. Run /ultrareview across the codebase. Address every issue
   it flags — if it's not worth fixing, note why in a code
   comment.

2. Walk through the README, CLAUDE.md, OPUS_4_7_USAGE.md,
   SAFETY.md, and UX.md. Fix any stale references,
   contradictions, or typos.

3. Put demo sample data in /demo/: sample_profile.json,
   sample_conversations.jsonl, sample_letter.md — so judges
   can inspect the system without needing pilot data.

4. Verify all six success criteria from CLAUDE.md are green:
   - Setup produces a trustworthy Personhood Map
   - 10 realistic utterances get safe responses
   - No invented facts across test utterances
   - Notebook grows across sessions
   - Letter reads like something a family would keep
   - Demo video covers the full loop in under 2 minutes

5. Confirm the README's "Why Opus 4.7 specifically" section
   clearly names the nine capabilities with one line each.

Do not add new features in this session. If it's not shipping,
it's not shipping.
```

---

## A few prompt-engineering tips for these sessions

### Keep task specs in the first turn

Every prompt above puts the full task in one message. This is
deliberate. Opus 4.7 is explicit in the best-practices guide that
spreading context across many user turns makes it less coherent
and more token-hungry.

### When you do want Claude Code to parallelize

By default Opus 4.7 is conservative about spawning subagents. If
you want fan-out (e.g., for the five letter subagents, or for
processing multiple prompt files at once), say so explicitly:

> "Spawn subagents in parallel — one per subagent file — rather
> than processing them sequentially."

### When you want deeper thinking

Add at the end of any prompt:

> "Think carefully before making changes to the conversation loop —
> this is the demo's core and a bug here is fatal."

### When you want less thinking (to save budget)

For low-stakes tweaks:

> "Respond directly rather than thinking deeply — this is a small
> cosmetic change."

### Never ask Claude Code to "be creative"

It is building a product with a specific brief. Creativity here
means careful execution, not novel ideas. Keep prompts focused on
intent + constraints + acceptance criteria.
