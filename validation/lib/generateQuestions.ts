import { type Screen, type Study, type GeneratedQuestion, newQuestionId } from "./studies";

const SUPPORTED_MEDIA_TYPES: Record<string, string> = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

type ModelQuestion = {
  question_text: string;
  persona_id: string | null;
  source_story_id: string | null;
  tests_assumption: boolean;
  rationale: string;
};

type ModelResponse = {
  screen_id: string;
  questions: ModelQuestion[];
  note?: string;
};

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix — the API wants raw base64.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export type GenerationResult = {
  questions: GeneratedQuestion[];
  // Set when the model deliberately returned fewer than 2 questions — e.g.
  // because no user story plausibly applies to this screen. Not an error:
  // personas, stories, and the mental model are all optional context, and an
  // early screen may have none of them filled in yet.
  note?: string;
};

// Calls the real generation endpoint for one screen. Throws on any failure
// (missing key, network error, malformed model output) — the caller decides
// how to degrade (e.g. falling back to mock questions).
export async function requestGeneratedQuestions(
  study: Study,
  screen: Screen,
  file: Blob,
  priorScreens: Screen[]
): Promise<GenerationResult> {
  const mediaType = SUPPORTED_MEDIA_TYPES[file.type];
  if (!mediaType) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }

  const imageBase64 = await fileToBase64(file);

  const priorQuestions = priorScreens.flatMap((s) =>
    s.questions
      .filter((q): q is GeneratedQuestion => q.kind === "generated")
      .map((q) => ({
        screenId: s.id,
        questionText: q.text,
        personaId: q.personaId,
        sourceStoryId: q.storyId,
      }))
  );

  const res = await fetch("/api/generate-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problemStatement: study.problemStatement,
      mentalModel: study.mentalModel,
      personas: study.personas,
      stories: study.stories,
      priorQuestions,
      screenId: screen.id,
      screenDescription: screen.description,
      imageBase64,
      mediaType,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Generation request failed (${res.status}).`);
  }

  const data = (await res.json()) as ModelResponse;

  return {
    questions: data.questions.map((q) => ({
      id: newQuestionId(),
      kind: "generated",
      text: q.question_text,
      personaId: q.persona_id ?? null,
      storyId: q.source_story_id ?? null,
      testsAssumption: !!q.tests_assumption,
      note: q.rationale ?? "",
      subQuestions: [],
    })),
    note: data.note,
  };
}
