# UX.md — design principles for Kith

Kith has three surfaces. Each has one job and no other job.

- `/setup` — caregiver teaches Kith about the patient (used once, by family)
- `/talk` — the patient interacts with Kith (used daily, by patient)
- `/letter` — the family reads the weekly continuity letter (used weekly, by family)

The design principles below apply differently to each surface. The
`/talk` surface is the most demanding — it is what the patient uses
and what the judge sees in the demo.

---

## The one principle that overrides all others

**If a design decision makes Kith easier for a confused 80-year-old, do it.
If it makes the screen more "impressive," do not do it.**

That tension will come up constantly. The elderly-accessible choice
usually looks simpler and less designed than you want it to. That is
correct. A screen that looks slick but loses the patient for three
seconds has failed.

---

## `/talk` — the patient companion (the most important screen)

### The layout

One screen. No scroll. No navigation. No menus. No settings.

```
┌─────────────────────────────────────┐
│                                     │
│         Sunday afternoon            │  gentle date/time, top
│            26 April                 │
│                                     │
│                                     │
│  "That's your granddaughter Lily.   │  Kith's last response
│   You taught her to make pancakes   │  large serif, soft fade-in
│   last summer."                     │
│                                     │
│                                     │
│              ◯◯◯◯                   │
│            ◯◯◯◯◯◯◯◯                 │  the mic button
│              ◯◯◯◯                   │  very large
│                                     │
│         tap to talk to Kith         │  small helper text,
│                                     │  fades after first use
│                                     │
│                                     │
│  Mark calls at 4 today.             │  today's anchors, soft bottom
│  Dinner is shepherd's pie.          │
│                                     │
└─────────────────────────────────────┘
```

### Three states of the mic button

The single control on the screen. Three states, smooth transitions.

**Resting** — soft filled circle, subtle breathing animation (scale
1.0 → 1.02 over 3 seconds, looping). The helper text "tap to talk to
Kith" appears the first time the page loads and fades after first use.

**Listening** — the circle pulses outward in concentric rings
(opacity fades from 0.6 to 0 over 1.5 seconds, looping). Center
turns soft coral. A quiet "ready" tone plays when the button enters
this state.

**Speaking** — warm amber glow around the button, no pulsing. The
glow gently breathes with the voice audio (ducking slightly between
words is a nice touch if easy; skip otherwise).

Return to resting when Kith finishes speaking.

### Typography and color

- Background: warm cream `#FAF6F0`
- Body text: deep navy `#1F2A44`
- Accent (Kith's voice): coral `#E8927C`
- Helper text: soft gray `#8A8A8A`

Avoid pure white. Avoid pure black. Avoid high-saturation blues and
greens. Soft and warm.

- Kith's response: serif, **32px minimum**
- Date and anchors: sans-serif, **22px**
- Helper text (small): sans-serif, **18px**
- Line height 1.5 minimum

Left-align or center-align — never justify.

### Interaction rules

- **One tap, one action.** The mic button is the only interactive
  element on `/talk`. No other tappable thing exists.
- **No double-tap, no long-press, no swipes.** Just a single tap-and-release.
- **Kith's response stays on screen.** It does not auto-hide. The patient
  can re-read it ten times if they need to. It only gets replaced when
  the next response arrives.
- **No notifications, no popups, no alerts, ever.** If something needs
  the family's attention, it surfaces on `/letter` via the caregiver
  attention banner — never on `/talk`.

### What does not go on this screen

- No branding, no logo, no "powered by"
- No navigation bar, no menu
- No conversation history
- No settings toggle
- No hamburger, no gear icon
- No loading spinners (use the mic button's state change instead)
- No error messages visible to the patient
  (if Kith fails, fall back to: *"I'm just gathering my thoughts —
   give me a moment."* spoken in her voice)

### Accessibility floors (non-negotiable)

- Text contrast ratio ≥ 7:1 (WCAG AAA level)
- Mic button ≥ 120px × 120px touch target
- No information conveyed by color alone (the three mic states differ
  by animation, not just color)
- Respects `prefers-reduced-motion`: replace animations with static
  color changes
- Full keyboard navigation available (spacebar activates mic)
- Screen reader labels on every interactive element

---

## `/setup` — the caregiver wizard

### Philosophy

The family member filling this out is exhausted, overwhelmed, possibly
grieving a loss that hasn't happened yet. The wizard cannot feel like
a form. It should feel like a conversation.

### Two modes, offered up front

1. **The Shoebox** — "Drop in photos of the people and moments that
   mattered. Kith will read them and draft everything." Recommended.
2. **The Wizard** — six gentle sections, one per scroll-snap screen.

Let them switch between modes at any point — most families will use
both, Shoebox to start and wizard to fill gaps.

### The six wizard sections

One per screen. Scroll-snap so they feel self-contained.

1. **About them** — name, preferred name (used by Kith), age, hometown,
   a paragraph about who they are
2. **The people in their life** — repeatable cards, 5–8 recommended
3. **Their daily life** — routines, music, food, shows, hobbies
4. **Stories they love to tell** — repeatable, 3–5 recommended
5. **Comfort and avoid** — comforts, topics to gently avoid (with reason),
   difficult times of day
6. **This week's anchors** — today's date, what's happening this week

Bottom of screen 6: single button — *"Save and meet Kith."*

### Wizard UX rules

- Placeholder text shows what a good answer looks like — not just a
  field label. e.g., the "things that comfort them" field shows
  *"Willie Nelson on the radio. The green blanket. Hearing Mark's voice."*
- No required-field red asterisks. Soft optional prompts instead.
- A "skip for now" link on every section — the family can fill in
  more later
- Progress indicator at top: dots, not a percentage bar — less
  pressure
- Every section can be revisited and edited after setup

### Design language

- Single-column layout, max width 640px
- Cream background (same as `/talk`)
- Serif for headings (warm, letter-like)
- Sans-serif for fields and helper text
- Generous padding — this should feel spacious, not urgent
- No progress-nagging ("You're only 30% done!")

---

## `/letter` — the weekly family letter

### Philosophy

This is an artifact the family should want to keep. Treat it as a
letter, not a webpage. Design it like something a family member would
print and tuck into a journal.

### Layout

Single elegant column, max width 640px, cream background.

```
              Kith

    A letter about Maggie
   Week of 19–26 April 2026


Dear family,

[Opening paragraph — warm, specific, names a moment]

Moments of joy this week
────────────────────────
[2-3 sentences with specific moments]

How Maggie has been
────────────────────────
[Emotional tone of the week, with examples]

Something new worth knowing
────────────────────────
[Honest observation]

A small suggestion
────────────────────────
[One actionable, gentle thing to try]


With care,
Kith


────────────────────────
Written from 14 conversations
over the week of 19–26 April 2026
```

### Typography

- Serif throughout — this is a letter
- Body: 20px, line height 1.7
- Section dividers: a thin rule, not bold headings
- Sign-off ("With care, Kith") in italic serif

### The caregiver attention banner

If any risk flags have triggered since the family last visited, a
banner appears *above* the letter:

```
⚠  Kith noticed something that needs your attention.
   Tuesday 3:42pm — Maggie mentioned she had fallen.
   [Acknowledge]
```

- Dusty coral background, not alarming red
- Short, specific, not clinical
- Single "Acknowledge" button — clears the banner when tapped
- The banner comes from `/data/kith_notebook/concerns.md` entries
  flagged `RISK_ESCALATION`

### No chrome

- No logo beyond the word "Kith" at the top
- No share buttons, no social, no print button (let the browser handle it)
- No navigation — this page is reached by direct URL

---

## The voice (technical choice, with UX implications)

Kith speaks through ElevenLabs TTS. The voice choice is part of the
design. Audition at least five voices before committing.

What to listen for:
- **Warmth without theatricality** — not a broadcaster, not a smooth
  podcast host
- **Pace** — slightly slower than conversational default. Test the
  pace by playing it to an elderly person if you can.
- **No upspeak** — statements should end on a down inflection
- **Natural pauses** — a voice that rushes through sentences will feel
  cold regardless of the words

Budget: ~$60 of your API credits for voice. Don't cheap out here.

### Latency

End-to-end target: speech end → Kith speaking ≤ 3.5 seconds. Beyond
that, the patient loses the thread.

If latency creeps above 4 seconds in testing, reduce the task budget
on the conversation call before you touch the voice pipeline — the
prompt has more headroom than the audio stack does.

---

## Cross-surface: the design vocabulary

### Shared type scale

| Use | Size | Family |
|---|---|---|
| Kith's voice on `/talk` | 32px | Serif |
| Section heading on `/letter` | 28px | Serif |
| Body on `/letter` | 20px | Serif |
| Date/anchor on `/talk` | 22px | Sans |
| Wizard body on `/setup` | 18px | Sans |
| Helper text (rare) | 16px | Sans |

### Shared palette

| Role | Hex |
|---|---|
| Background | `#FAF6F0` (cream) |
| Primary text | `#1F2A44` (deep navy) |
| Kith's accent | `#E8927C` (coral) |
| Muted | `#8A8A8A` (soft gray) |
| Rule lines | `#E5DED1` (warm stone) |
| Risk banner bg | `#E8927C` at 15% opacity |

### Motion principles

- Everything fades, nothing slides in dramatically
- Durations: 200ms for micro-interactions, 600ms for content transitions
- Respect `prefers-reduced-motion` throughout
- Never use bounce, spring, or over-easing

---

## What we are explicitly not designing

So no one wastes time:

- A mobile app (runs in a browser, that's the deliverable)
- A dark mode (the warm cream palette is the palette)
- A tablet-vs-desktop breakpoint system beyond "works on a 1024px-wide laptop"
- Onboarding transitions or celebrations ("You did it! 🎉")
- Illustrations or custom iconography
- A marketing landing page
- An About page or Settings page
- Multi-user avatars, profile pictures on people cards
- Any animation beyond the three mic button states and simple fades

If it is not listed in this file, do not build it.
