# Pre-Read — Internal AI-Assisted User Research Tool

---

## 1. Problem Statement

PMs across the company — roughly 20–30 people, showing prototypes to customers on a near-weekly basis — have no scalable way to run discovery at that volume. One-by-one customer calls don't scale to this many PMs and this cadence, and group settings like customer advisory boards dilute individual feedback to the point it's not actionable. As a result, prioritization and roadmap decisions are frequently made without solid, validated customer input.

**[NOTE: based on the author's own experience as a PM — not yet confirmed as a shared pain across the other 20–30 PMs.]**

---

## 2. Pain Points

| # | Pain Point | Evidence / Source |
|---|---|---|
| 1 | Group customer settings (e.g., customer advisory boards) surface only generic, surface-level feedback — there's no ability to probe individual responses in depth, so signal that would come from a 1:1 conversation is lost. | Self-reported by author (PM), from direct experience running board sessions where feedback stayed generic and couldn't be deepened. **[ANECDOTAL — single PM, not yet confirmed across other PMs]** |
| 2 | Running discovery via individual 1:1 calls at the volume required (~10 calls/week per PM to cover weekly prototype reviews) consumes enough PM time that it crowds out the rest of the PM role (roadmap, spec work, cross-functional alignment). | Self-reported by author (PM), based on personal estimate of call volume required. **[ANECDOTAL — single PM, not yet confirmed across other PMs]** |

---

## 3. User Stories

| Persona | High-Level Story | Sub Stories |
|---|---|---|
| **PM** | As a PM, I want to run discovery at scale without it consuming all my time, so that I can validate prototypes with customers while still doing the rest of my job. | • As a PM, I want to generate discovery questions from my problem statement and user stories, so that I don't have to build a research script from scratch each time.<br>• As a PM, I want to map questions to specific prototype screens, so that customers are asked about the right part of the experience at the right time.<br>• As a PM, I want customers to complete the interview asynchronously, so that I'm not bottlenecked scheduling 1:1 calls with each one.<br>• As a PM, I want to rehearse the script before publishing it, so that I catch bad phrasing or broken flows before it reaches real customers.<br>• As a PM, I want individual, in-depth responses from each customer, so that I get signal that's actually actionable, unlike the generic feedback from group board sessions.<br>• As a PM, I want all responses centralized in one place, so that I can review feedback across customers without chasing call notes or recordings. |
| **Customer** *[ASSUMPTION - NEEDS VALIDATION: no direct customer research behind this row yet]* | As a customer, I want to give feedback on a prototype in a way that fits my own schedule, so that I can contribute without committing to a live call. | • As a customer, I want to complete the interview at my own pace, so that I don't have to coordinate a live meeting time.<br>• As a customer, I want to resume where I left off if I'm interrupted, so that I don't lose progress or have to start over.<br>• As a customer, I want to understand what's being asked of me and why, so that my feedback feels meaningful rather than arbitrary. |

---

## 4. Mental Model

**PM Persona — current workflow & vocabulary**

Today, PMs derive discovery questions manually and ad hoc: looking at the prototype itself and reasoning through what to ask about *that specific feature* — likely failure points, and business impact. There's no template or systematic method being reused across PMs currently; each PM starts from the prototype and thinks it through fresh.

"Good discovery," in the PM's own mental model, means walking away with a concrete verdict on four things: whether the feature would be used at meaningful frequency (daily/weekly), whether it has measurable business impact, whether the UX is good, and whether it solves a genuinely pressing problem. This is effectively the bar the tool's output needs to help PMs clear — vague or generic feedback (as in the board-session pain point) fails this bar because it can't answer these four questions with confidence.

PMs refer to this activity as **"validation sessions"** (discovery framed as validation) — not "customer interviews" or "discovery calls." Worth carrying this vocabulary into the product's own language later.

**Customer Persona — current disposition & behavior**

Customers are generally enthusiastic, not reluctant — they want to help and see contributing feedback positively, not as a chore. This softens the assumption raised earlier in the process; customers aren't a population that needs to be won over on motivation.

Customers have also, informally, already expressed a preference for lower-friction, asynchronous feedback formats (e.g., asking to send something later rather than sitting on a live call).

**[Informally observed by PM through direct customer interactions — not formal/systematic research, but based on real customer statements rather than pure assumption.]**

This directly supports the async, self-paced chat format as something customers are predisposed toward, not just a PM convenience.

---

## Open Points (running)

- Whether the two Pain Points are shared across other PMs, or unique to the author's workflow — worth a quick informal check before treating this as company-wide fact.
- Customer persona's User Story row is based on inference + informal signal, not formal research — worth validating directly if this PRD moves forward toward build.
