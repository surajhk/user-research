# Design Requirements — Internal AI-Assisted User Research Tool

Written for designers. These describe observable user outcomes, not system behavior — they give design room to make decisions, not a spec to implement against. Backdrop: see `pre-read.md` (Problem Statement → Mental Model) and the user flow agreed in chat (Input Phase 1: problem statement/mental model/user stories → Input Phase 2: sequential screenshot upload with per-screen question generation).

---

## Block 1 — Study Setup (PM)

**User Story**
As a PM, I want to start a new study by telling the tool what I'm building research around — my problem statement, my mental model of the user, and my user stories — so that the tool has the context it needs to generate relevant discovery questions later.

**Acceptance Criteria**
A user is considered to have successfully used this feature when they can:
- Start a new study from a clear entry point that asks what they want to build research around today
- Enter a problem statement describing why the prototype/feature exists
- Enter their mental model of the user, structured as:
  - **Behavior — what they actually do today**
    - Current workflow (steps)
    - Tools/artifacts currently used
    - Friction/breakdown point (where the current approach stops working)
  - **Framing — how they think and talk about it**
    - Comparison/analogy ("it's like X but for Y")
    - Vocabulary/terminology (their words for key concepts)
    - Mental objects & relationships (what "things" they reason in terms of, and how those relate)
  - **Evidence — how much to trust it**
    - Source & confidence: Validated (cite interview/session/date) or Assumption (flagged, needs research)
- Add one or more user stories in "As a ___, I want ___, so that ___" format
- Add more than one persona when the study covers more than one type of user, and attach each user story to the right persona
- Save this input as a draft and come back to finish it later without losing progress
- See a clear signal of what comes next (uploading screens), so it's obvious this is step 1 of a larger flow, not the whole setup

**[PM INPUT NEEDED]**
- Should the three inputs be free text, or structured fields/prompts that guide the PM toward a consistent format (since not every PM will naturally write a clean problem statement or story)?
- Is there a minimum number of user stories required before a PM can move on to uploading screens, or can they proceed with just one?

---

## Block 2 — Question Generation from Screenshots (PM)

**User Story**
As a PM, I want to upload a screenshot of a user flow step and immediately see candidate discovery questions for that screen, so that I can build a research script without starting from a blank page.

**Acceptance Criteria**
A user is considered to have successfully used this feature when they can:
- Upload an image for a single screen and see candidate questions appear for that screen before needing to upload the next one
- See each candidate question paired with a plain-language note on which user story/outcome it's testing (e.g. "Tests whether [story X]'s outcome is achieved here")
- See questions phrased differently by persona when more than one persona applies to the study
- Edit the wording of any generated question inline, in place
- Remove any generated question they don't want to keep
- Add their own custom question to a screen, alongside the generated ones
- Keep uploading additional screens in sequence, with each new screen's questions appearing without disrupting or resetting screens already reviewed
- Add as many custom questions of their own to a screen as they want, if the generated 2–3 aren't enough

**Resolved (no longer open):**
- Screen reordering after upload is explicitly **out of scope** for v1 — upload order is final. If a PM uploads out of sequence, they need to redo the upload rather than reorder in place.
- The generated candidate count (2–3 per screen) is a fixed system behavior, not a PM-adjustable setting — PMs needing more coverage on a screen add custom questions rather than requesting more generated ones.

---

## Block 3 — Preview / Test Mode (PM)

**User Story**
As a PM, I want to preview my script by acting as the customer myself, so that I can catch bad phrasing, awkward flow, or broken adaptive behavior before real customers ever see it.

**Acceptance Criteria**
A user is considered to have successfully used this feature when they can:
- Enter a preview/test session via a private link, without needing to publish the script to real customers first
- Type answers into the chat themselves, playing the customer role, and experience the bot exactly as a real customer would
- Type a deliberately vague or hedged answer (e.g. "kind of," "I guess") and see whether the adaptive follow-up fires as expected
- Ask the bot an off-script question and see how it handles it — answering from context, or falling back to "I'll flag this for the PM"
- Trust that anything said during preview is kept separate from real customer feedback — it won't show up mixed in with genuine responses later
- See a persistent, unambiguous signal at all times that this is a preview session, not a real one
- Publish the script once satisfied, with a clear understanding that publishing locks it — further wording changes require a new version, not a live edit

**Resolved (no longer open):**
- No inline editing during the test session — this step is pure roleplay/immersion (testing how it *feels* as a customer), not an editing surface. Any fixes needed after testing happen back in the script editor (Block 2/3 curation), not mid-session.

---
