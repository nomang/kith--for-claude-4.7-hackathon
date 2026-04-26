# Prompts

All of Kith's system prompts live here as plain text files. Code loads
them at runtime. This means you can iterate prompts without touching
code — which is where most of the tuning time will go.

## Files

- `kith_voice.txt` — patient-facing conversation (the most important)
- `shoebox_onboarding.txt` — high-res vision pipeline that drafts the
  Personhood Map from a family's scanned photos
- `weekly_letter.txt` — the synthesizer that writes the family letter
- `letter_subagents.txt` — the five parallel subagents the synthesizer
  draws from (Mood, Memory, Changes, Routines, Joy)

## Placeholder syntax

All prompts use `{{placeholder}}` syntax. Code substitutes these at
call time. Do not change placeholder names without updating the
calling service.

Placeholders currently in use:
- `{{preferred_name}}` — what to call the patient
- `{{personhood_map}}` — full JSON of the Personhood Map
- `{{notebook}}` — concatenated contents of `/data/kith_notebook/*.md`
- `{{date}}`, `{{time_of_day}}`
- `{{whats_happening_today}}`, `{{whos_visiting_or_calling}}`
- `{{sensitive_handling_mode}}`
- `{{last_10_turns}}`
- `{{conversations}}`, `{{routines}}` (letter subagents only)

## Iteration workflow

1. Change the prompt file
2. Run `node test-kith.js "<test utterance>"`
3. Repeat until the response feels right

Do not embed prompts in code. Do not merge them with templating logic.
Keep them plain text — they are the most edited files in the project.

## Priority for Day 1

Spend at least three hours on `kith_voice.txt` before building any UI.
The quality of Kith's warmth and reliability is 80% prompt and 20%
everything else. Get the voice right at the terminal first — the UI
is dressing.

Run all 30 of the hardest-utterances test cases in `PHASES.md`
before moving to Day 2.
