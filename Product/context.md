# Internal AI-Assisted User Research Tool — Design Notes

## The Problem

PMs currently prototype in Lovable, then have to go customer-by-customer to run discovery interviews — slow, and doesn't scale. Idea: a tool where the PM gives a problem statement plus screenshots of the user flow, the tool generates discovery questions per screen as each screenshot comes in, and customers can go through a conversational (chat) interview on their own time. Feedback gets captured centrally.

## Scope for V1

- **In scope:** semi-automated research design (PM-assisted question generation + manual screen mapping) + automated conducting of the research (chat interview, no live PM needed per session)
- **Out of scope for now:** synthesis/analysis of collected feedback (themes, patterns, reports) — raw feedback capture only
- **Market context:** this space already has mature players (Maze, Outset, Strella, Conveo, User Intuition, and others) running AI-moderated interviews at scale, including direct Lovable/Bolt/Figma-Make prototype import. This tool is being built as an **internal** tool, not a product to compete with them — scoped intentionally narrower.

---

## 1. PM Input & Question Generation

**Input Phase 1 — Study setup.** PM provides three structured inputs (not FRs/DRs/NFRs):

| Input | Purpose |
|---|---|
| Problem statement | Sets the overall goal/lens for the study — why this prototype exists |
| Mental model of user | Who the user is, what they already believe, their vocabulary/expertise level — shapes phrasing and flags where the PM's own assumptions about the user could be wrong |
| User stories (As a ___, I want ___, so that ___) | The real generation engine — each story's "so that" clause is a testable outcome |

**Input Phase 2 — User journey (sequential screenshot upload).** Once Phase 1 is set:
- PM uploads a screenshot for step 1 of the user flow → tool immediately generates 2–3 candidate questions for that screen, tied to which user story it's meant to satisfy
- PM uploads the next screenshot → tool generates questions for that screen, and so on — one screen at a time, not a batch upload
- Each generated question is tagged with its source user story, e.g. *"Tests whether [user story X]'s outcome is actually achieved on this screen"*
- If there's more than one persona, tag each user story with the persona it belongs to, so phrasing can adapt (power user vs. first-timer)
- Output accumulates into a **candidate question bank, already placed per screen** — PM picks, edits, and reorders as they go. Nothing is auto-finalized.
- **Manual upload only for v1** — considered having an agent auto-navigate the prototype and capture screenshots itself, but that requires knowing the navigation path through the prototype (brittle for branches/forms/auth) and adds build complexity not justified for an internal v1 tool. Manual upload also *is* how the PM defines the user flow order, so it doubles as flow definition, not just image capture.

---

## 2. Screen-to-Question Placement (was: "Screen-to-Question Mapping")

Because generation in Phase 2 is already screen-by-screen, questions arrive pre-placed on their screen — there's no separate blank-slate mapping step where a PM assigns a standalone question bank onto a standalone screen list.

- **PM's role here is curation, not construction**: reorder questions within a screen, move a question to a different screen if the tool placed it wrong, edit wording — all still fully manual/PM-controlled, just starting from a placed draft instead of an empty grid
- Output data structure: `{screen_id: [question_ids]}` (unchanged)
- **The customer views the uploaded screenshot directly inside the tool**, side-by-side with the chat (screenshot panel on one side, chat on the other) — this is a static image, not a live/clickable embed of the Lovable prototype. No separate prototype tab, no verbal "go to X screen" instruction needed — the tool itself is showing the customer exactly what screen they're being asked about.
- Sequencing model for v1: **guided/sequential**, not synchronous co-browsing. A **"Next" button advances to the next uploaded screenshot** (only appears/matters when a study has more than one screen — a single-screen study has nothing to advance to). No integration into Lovable's internals needed, since there's no live prototype involved during the interview at all. **[OPEN: does clicking Next require the current screen's questions to be answered first, or can the customer advance freely?]**

---

## 3. Test Mode (PM rehearsal before publishing)

Because the script is used verbatim across all real customer sessions, the PM needs a way to test it first:

- **Draft state:** script lives in draft until explicitly published; only accessible via a private preview link
- **Live rehearsal:** PM types answers into the chat themselves — including deliberately vague ones ("kind of," "I guess") — to check adaptive follow-ups fire sensibly, and off-script questions to check the bot's fallback response sounds right
- **Inline editing during test:** PM can edit a question right in the test session and see it reflected on the next turn — no separate edit screen
- **Test data isolation:** anything said during test mode is flagged `is_test: true`, kept separate from real customer feedback
- **Publish = lock:** once published and sent to customers, the script freezes. Wording changes require a new version, not a live edit, so responses stay comparable across customers and the flat sheet stays consistent
- **Persona simulation:** single-pass rehearsal only for v1 (one PM, one pass) — no multi-persona simulation in test mode yet

---

## 4. Chat-Based Back-and-Forth

- Bot asks the scripted question for the current screen; customer answers in chat
- **Follow-up depth is two-tiered, both hedge-triggered (not fired on a strong/confident answer):**
  - **General questions:** one level of adaptive follow-up if the answer is short/hedged ("I guess," "maybe," "kind of") — e.g. "Can you say more about that?"
  - **Business-case/problem-validation questions** (i.e. questions whose source user story is about whether the problem is real/pressing or has measurable business impact — see the "good discovery" bar in `pre-read.md`'s Mental Model): can chain up to **3 follow-up turns** if answers keep lacking depth, to actually get to root cause/impact rather than stopping at the first vague answer. This is tagged per-question at generation time (`probe_depth: "multi"` vs `"single"`), not a judgment call the bot makes mid-conversation.
- Customer can ask the bot questions back; bot answers basic orientation questions using the problem statement + screen descriptions, and says "I'll flag that for the PM" for anything it can't answer
- **No response pressure:** no timeout, no "still there?" nudge, no auto-advance. Real B2B interviews often involve 2–3 stakeholders discussing off-band before someone types — the chat just waits, however long that takes

---

## 5. Session Creation & Identity

- PM creates a session by: picking the published script → entering customer name + email → system generates a unique session link → PM sends it to the customer
- **The unique link *is* the identity** — no login screen, no email re-confirmation. Zero real security stakes for an internal tool, so this friction isn't worth adding
- **Single-use, single-sitting model** (like a Google Form): one link → one session → one full pass through the script, then locked
- **Interruption handling:** if the customer closes the tab mid-way, reopening the same link **resumes** the same session (same chat history, continues at the next unanswered question) — it does not start a new session or discard progress
- **Session states:**
  - `in_progress` — link opened, not all questions answered yet
  - `submitted` — auto-triggered once the last scripted question gets a response (no manual "Submit" button needed since it's chat-based). Bot closes with a completion message. Reopening after this shows the same closed message, read-only.

---

## 6. Feedback Capture (flat sheet, no synthesis)

Two lightweight, separate stores — not one merged table:

**Sessions sheet** (what the PM sees when managing links):
```
session_id | customer_name | customer_email | script_id | status | created_at | completed_at
```

**Feedback sheet** (the actual Q&A data):
```
session_id | timestamp | screen | question | question_goal | probe_depth | response | follow_up_1_question | follow_up_1_response | follow_up_2_question | follow_up_2_response | follow_up_3_question | follow_up_3_response | is_test
```
- `probe_depth` echoes the question's tag (`single`/`multi`) so it's clear from the sheet alone why a row has 0, 1, or up to 3 follow-up pairs filled in
- Follow-up columns are fixed at 3 (the multi-tier cap) rather than variable-length, to keep this a flat sheet — `single`-depth questions and any `multi`-depth question that resolved early just leave the later pairs blank

- Customer identity lives only in the sessions sheet — join on `session_id` if ever needed, to avoid two sources of truth
- Individual chat-line attribution within a group discussion (who on the customer side said what) is explicitly not being solved for v1 — that's synthesis-adjacent complexity, already out of scope

---

## Open Decisions Still Worth Making

- Whether to eventually add gentle re-engagement nudges for sessions that stall in `in_progress` for a long time (currently: no nudge, ever)
- Whether test mode should support multi-persona rehearsal later (currently: single-pass only)
- Whether synchronous co-browsing (auto-fire question on screen change) is worth building once the guided/sequential model is validated
- Whether automated screenshot capture (agent-driven prototype navigation) is worth building later, once manual upload is validated — parked for v1 due to navigation-path complexity (branches/forms/auth)

## Not Yet Designed (next steps)

- Combined data model showing script object + session object together
- The actual question-generation prompt that consumes problem statement + mental model + user stories
