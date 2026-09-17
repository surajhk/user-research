import { type Study, type GeneratedQuestion, newQuestionId } from "./studies";

// Offline fallback for when the real generation call fails (missing API key,
// network error, malformed model response) — so a broken call degrades to
// something usable instead of leaving a screen with no questions at all.
// Deterministic: a pure function of the study's existing input plus the
// screen's position, so the same screen always falls back to the same thing.

export function generateMockQuestions(
  study: Study,
  screenIndex: number
): GeneratedQuestion[] {
  const { personas, stories, mentalModel } = study;
  const multiplePersonas = personas.length > 1;
  const questions: GeneratedQuestion[] = [];

  if (stories.length > 0) {
    const story = stories[screenIndex % stories.length];
    questions.push({
      id: newQuestionId(),
      kind: "generated",
      text: `Walk me through how you'd use this screen to ${
        story.want || "get what you need"
      }.`,
      personaId: multiplePersonas ? story.personaId : null,
      storyId: story.id,
      testsAssumption: false,
      note: `Tests whether ${story.role || "this user"} can ${
        story.want || "complete this step"
      } — the outcome behind "${story.benefit || "their goal"}."`,
      subQuestions: [],
    });
  } else {
    questions.push({
      id: newQuestionId(),
      kind: "generated",
      text: "Walk me through what you'd try to do first on this screen.",
      personaId: null,
      storyId: null,
      testsAssumption: false,
      note: "Tests general task flow on this screen — add user stories to sharpen this.",
      subQuestions: [],
    });
  }

  const notes = mentalModel.notes.trim();
  questions.push({
    id: newQuestionId(),
    kind: "generated",
    text: "What would you expect to happen next on this screen?",
    personaId: null,
    storyId: null,
    testsAssumption: false,
    note: notes
      ? "Tests whether this screen matches the mental model described for this study."
      : "Tests whether this screen behaves the way they'd expect it to.",
    subQuestions: [],
  });

  return questions;
}
