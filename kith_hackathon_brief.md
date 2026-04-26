# Kith — Hackathon Project Brief

## 1. Project Overview

**Project Name:** Kith  
**Tagline:** Holding onto the person, not just the patient.

**One-line Pitch:**  
Kith is a voice-based AI companion for people living with mild-to-moderate Alzheimer's. It helps them stay grounded in their own life through warm, safe, person-centered conversations, while giving families a gentle continuity summary of how their loved one has been doing.

---

## 2. Problem

Millions of people living with Alzheimer's and other dementias experience confusion, fear, disorientation, and repeated memory gaps in daily life. Families and caregivers often feel exhausted, guilty, and unable to be present all the time.

Most existing tools focus on logistics:
- pill reminders
- GPS tracking
- emergency alerts
- appointment support

Those are useful, but they do not preserve **personhood**.

The real gap is this:

> There is no simple, warm system that can hold the person's stories, routines, familiar relationships, comfort cues, and sensitive boundaries — and give that back to them gently when they need it.

---

## 3. Vision

Kith is designed to preserve continuity of identity.

It does three things:

1. **Grounds** the person in the present
2. **Recalls** known people, routines, and familiar context safely
3. **Reflects** meaningful interaction patterns back to the family

Kith is not trying to replace family, clinicians, or caregivers.  
It is a supportive companion layer that helps reduce confusion and strengthen continuity of care.

---

## 4. Core Hackathon Thesis

This project should not be framed as "just another AI chatbot."

The real proposition is:

> Kith uses Claude Opus 4.7 to transform messy family memories, routines, photos, and life context into a structured personhood model, then uses that model to support safe, warm, contextual conversation in real time, and finally turns those interactions into a family continuity letter.

That is the differentiator.

---

## 5. Target Users

### Primary User 1: Person Living with Mild-to-Moderate Alzheimer's
Needs:
- help feeling less lost
- help recognizing familiar people
- patient, non-judgmental interaction
- calm support in repeated questions
- emotional safety

### Primary User 2: Family Caregiver
Needs:
- a fast way to teach Kith about their loved one
- trust that Kith will not hallucinate or mishandle sensitive topics
- continuity when they cannot always be present
- useful reflection on what happened during the week

### Secondary User: Professional Caregiver
Not the focus of the hackathon MVP, but relevant later.

---

## 6. Core MVP

The MVP should prove one believable and emotionally credible loop:

1. Family enters life context
2. Claude structures it into a **Personhood Map**
3. Patient speaks to Kith
4. Kith responds safely, warmly, and contextually
5. Family receives a meaningful continuity summary

### MVP Must Include
- personhood profile intake
- routine-aware conversation
- voice input/output
- safe response generation
- conversation logging
- family continuity letter

### MVP Must Not Include
- dashboards
- analytics panels
- multi-user account system
- polished onboarding
- mobile app
- medication management
- GPS tracking
- smart home integration
- real-time caregiver monitoring

---

## 7. Product Features

### 7.1 Personhood Map
Claude transforms family-provided input into a structured care model.

This includes:
- preferred name
- important people
- relationships
- familiar memories
- routines
- comfort topics
- triggers / avoid topics
- sensitive truth handling preferences
- deceased loved ones handling
- facts Kith can use
- facts Kith must never guess

### 7.2 Routine-Aware Companion
Kith uses routines as grounding anchors.

Examples:
- morning tea
- post-lunch walk
- listening to favorite music
- bedtime calming cues

Routine data helps Kith choose safer and more relevant responses.

### 7.3 Safe Conversation
Kith responds:
- warmly
- briefly
- honestly
- without pretending
- without inventing memories

### 7.4 Family Continuity Letter
A gentle weekly note that explains:
- moments of connection
- repeated confusions
- comforting topics
- changes family should know
- one suggested action for the week

---

## 8. Claude Opus 4.7 Creative Role

Claude must be used as the core intelligence layer, not just a talking bot.

### Claude Responsibilities
1. Convert messy family input into structured memory
2. Extract useful context from text, photos, notes, or voice notes
3. Plan safe responses before speaking
4. Use routines and care mode to guide live responses
5. Build continuity memory across sessions
6. Generate family-facing reflections

### Why This Matters
Judges should see that Claude is being used for:
- structured reasoning
- contextual memory modeling
- emotionally bounded response behavior
- synthesis across time

Not just chat.

---

## 9. Safety Principles

These are non-negotiable.

Kith must:
- never claim to be human
- never pretend to be a family member
- never invent people, memories, or facts
- never shame or harshly correct
- never say "you already told me that"
- never give medical advice
- always acknowledge uncertainty honestly
- redirect gently when unsure
- surface risk language when needed

### Sensitive Topic Handling Modes
Kith should support one of these modes per family preference:
- Gentle Redirect
- Gentle Truth
- Memory-First Response

### Risk Escalation Triggers
Examples:
- "I fell"
- "I can't breathe"
- "I want to die"
- "someone is hurting me"
- "I took too many pills"

For MVP:
- show a caregiver attention banner
- log the event clearly

---

## 10. UX Direction

### Product Feel
Kith should feel:
- calm
- warm
- premium
- uncluttered
- safe
- obvious to use

### UX Principles
- one main action at a time
- large touch targets
- very low cognitive load
- clear interaction states
- simple language
- minimal options
- visible reassurance
- accessibility by default

### Apple-Inspired Design Sense
Apply Apple-style design discipline in:
- hierarchy
- spacing
- typography
- calm layout
- restrained controls
- accessibility

Do **not** overdo visual effects.

---

## 11. Core User Flows

### Flow A — Caregiver Setup
Goal: Teach Kith about the loved one.

Steps:
1. Start setup
2. Enter basics
3. Add important people
4. Add routines and comforts
5. Configure sensitive handling
6. Review generated Personhood Map
7. Activate Kith

### Flow B — Patient Conversation
Goal: Let the patient speak to Kith simply.

Steps:
1. Patient sees calm home screen
2. Taps mic
3. Speaks
4. Kith listens
5. Kith responds in text + voice
6. Interaction gets logged

### Flow C — Family Reflection
Goal: Give family meaningful value back.

Steps:
1. Open weekly summary
2. Read letter
3. Review key moments
4. See suggested follow-up

---

## 12. Screen List

### Screen 1 — Patient Home
- greeting
- day/date/time
- grounding line
- large mic button
- latest Kith response

### Screen 2 — Active Conversation
- listening / thinking / speaking state
- patient's latest utterance
- Kith reply
- tap-to-speak-again

### Screen 3 — Caregiver Setup Wizard
Sections:
- Basics
- Important People
- Memories
- Routines
- Comfort & Triggers
- Sensitive Topics
- Review

### Screen 4 — Weekly Reflection
Sections:
- Moments of connection
- What seemed grounding
- Where confusion showed up
- A small thing to try this week

---

## 13. Suggested Data Model

### Personhood Map
- patient_name
- preferred_name
- caregiver_name
- important_people[]
- favorite_memories[]
- routines[]
- comfort_topics[]
- avoid_topics[]
- deceased_people[]
- sensitive_handling_preferences
- grounding_facts
- never_guess_rules

### Conversation Log
- timestamp
- patient_text
- assistant_text
- topic
- emotional_state
- risk_flag
- routine_context
- confidence_level

---

## 14. Technical Scope

### Frontend
- simple web app
- patient mode
- caregiver mode
- very light UI

### Backend
Endpoints:
- `/create-profile`
- `/chat`
- `/generate-letter`

### Suggested Components
- Claude Opus 4.7 for reasoning and generation
- speech-to-text
- text-to-speech
- JSON-based personhood store
- conversation log store

---

## 15. Phase Plan

## Phase 0 — Scope Lock
**Goal:** Freeze MVP and cut distractions.

Tasks:
- finalize one-line pitch
- finalize MVP boundaries
- confirm target user stage: mild-to-moderate Alzheimer's
- choose care mode defaults
- lock screen list

## Phase 1 — Personhood Layer
**Goal:** Build family input into structured memory.

Tasks:
- define input schema
- define Personhood Map schema
- build setup wizard or simple structured form
- generate review page from Claude
- save output as JSON

## Phase 2 — Conversation Engine
**Goal:** Make Kith talk safely.

Tasks:
- build voice input flow
- build voice output flow
- define Claude response-planning prompt
- inject personhood + routine context
- log each interaction
- test realistic patient questions

## Phase 3 — Routine Awareness
**Goal:** Make responses more contextual and grounded.

Tasks:
- define routine schema
- infer current routine based on time
- pass routine context to Claude
- test calm redirection behavior

## Phase 4 — Family Continuity Letter
**Goal:** Turn interaction logs into value.

Tasks:
- define continuity letter template
- generate weekly reflection
- render summary page cleanly
- test usefulness and warmth

## Phase 5 — Demo Preparation
**Goal:** Make the story land.

Tasks:
- prepare sample patient profile
- prepare sample conversations
- generate reflection letter
- capture demo flow
- write README
- finalize submission assets

---

## 16. Priority Order

### Must-Have
- Personhood Map
- safe chat loop
- voice in/out
- routine-aware responses
- family continuity letter

### Should-Have
- simple photo ingestion
- caregiver attention banner
- interaction snippets in weekly letter

### Nice-to-Have
- voice note ingestion from family
- multiple care modes exposed in UI
- richer relationship graph

---

## 17. Success Criteria

The MVP is successful if:

1. caregiver can teach Kith about one person
2. Kith answers 10 realistic questions safely
3. Kith never hallucinates known/unknown facts
4. Kith uses routine or personhood context meaningfully
5. the family continuity letter feels emotionally useful
6. the demo tells a coherent story

---

## 18. Demo Story

### Act 1 — Teaching Kith
Show the caregiver entering:
- who matters
- routines
- comfort cues
- sensitive handling preferences

Show Claude creating the Personhood Map.

### Act 2 — Kith in Use
Show the patient asking:
- who is this?
- what day is it?
- where is John?
- repeated story or familiar topic

Show Kith responding warmly and safely.

### Act 3 — Family Reflection
Show the weekly letter:
- moments of connection
- what grounded them
- what family should know

End on continuity, not technology.

---

## 19. README Notes

The repo should communicate clearly:
- what Kith is
- why it matters
- what the MVP does
- how Claude Opus 4.7 is used creatively
- what is in scope vs out of scope
- safety principles
- setup instructions
- demo flow

---

## 20. Final Strategic Reminder

For this hackathon, the winning move is **not** building a big care platform.

The winning move is proving one emotionally credible, technically safe, and clearly differentiated loop:

> family memory in → personhood model → safe companionship → continuity back out

If that works, the concept lands.
