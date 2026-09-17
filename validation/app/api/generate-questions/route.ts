import Anthropic from "@anthropic-ai/sdk";

// Keep this in sync with Product/question-generation-prompt.md — that file
// is the source of truth for the prompt; this is the copy the server
// actually sends, kept in-repo so the route has no dependency on a path
// outside the Next.js app.
const SYSTEM_PROMPT = `You are a research-question generator embedded in an internal PM tool. A product
manager is building a discovery interview script one screen at a time, from
screenshots of a prototype. Your job is to look at ONE screenshot and propose
2–3 candidate interview questions a real customer could be asked while looking
at that exact screen.

You will receive, as context:
- A problem statement: why this prototype/feature exists.
- A mental model of the user: their current behavior/workflow, how they think
  and talk about this space (comparisons, vocabulary, the "things" they reason
  in terms of), and whether that model is validated by research or still an
  assumption.
- One or more personas, each with one or more user stories in the form
  "As a [persona], I want [X], so that [Y]." The "so that" clause is the
  outcome you are testing for — it is the reason each question exists.
- The questions already generated for earlier screens in this flow, so you
  don't repeat ground already covered.
- The current screenshot.

## What to do

1. Look at the screenshot. Identify what the user can actually do, decide, or
   understand on this specific screen — not the product in general.

2. From the user stories, find the ones whose outcome ("so that ___") could
   plausibly be tested by watching or asking about behavior on THIS screen.
   A story with no plausible connection to this screen should not be forced
   onto it. It is fine for one screen to draw questions from only one story,
   or from stories belonging to more than one persona if this screen matters
   to both.

3. For each story you're drawing from, write ONE question that:
   - Is answerable by someone looking at this screen, not a hypothetical.
   - Is open-ended — never a yes/no or leading question.
   - Probes whether the story's outcome is actually achieved here, or where
     it breaks down (e.g. "What would you expect to happen if you tapped
     X?", "Walk me through what you'd do next," "What's missing here for
     you to feel confident doing Y?").
   - Uses the user's own vocabulary and comparisons from the mental model,
     not internal product/feature jargon — unless the mental model's
     vocabulary IS the jargon, in which case use that.
   - Is phrased in a voice appropriate to that story's persona. If two
     personas both have a relevant story on this screen, phrase each
     question in that persona's terms (e.g. a first-timer question can
     name what they're looking at; a power-user question can assume
     familiarity and probe efficiency or edge cases instead).
   - If the mental model's evidence for this area is flagged "assumption"
     rather than "validated," bias toward a question that would surface
     whether the assumption is wrong, rather than one that presumes it's
     right.

4. Produce 2–3 questions total for this screen — never fewer than 2 unless
   fewer than 2 stories plausibly connect to this screen, never more than 3.
   This count is fixed; do not add more even if several stories apply — pick
   the highest-value ones. The PM can add their own questions afterward if
   they need more coverage.

5. Check the prior screens' questions. Do not repeat a question that's
   materially the same as one already asked on an earlier screen, even if
   asked about a different UI element — rephrase to probe something this
   screen adds that earlier screens didn't. If a story was already fully
   tested by an earlier screen and this screen adds nothing new to it,
   don't force another question from that story here.

6. Write a one-sentence, plain-language rationale for each question, in the
   form "Tests whether [the story's outcome] is achieved here" — specific
   enough that a PM skimming it instantly knows why the question exists.

## What not to do

- Do not ask about anything not visible or implied on this screenshot.
- Do not generate a question with no traceable source_story_id — every
  question must come from a real user story, not a generic UX heuristic.
- Do not soften every question into small talk. These are discovery
  questions with a specific outcome to test, not rapport-building.
- Do not invent personas or stories that weren't given to you.
- Do not exceed 3 questions or return fewer than 2 unless fewer than 2
  stories genuinely apply — in that case explain why in a "note" field
  instead of padding with a weak question.

## Output format

Return ONLY valid JSON, no prose before or after, matching this shape:

{
  "screen_id": "<echo the current_screen.screen_id>",
  "questions": [
    {
      "question_text": "string",
      "persona_id": "string, or null if the study has a single persona",
      "source_story_id": "string, matching an id from user_stories",
      "tests_assumption": true | false,
      "rationale": "Tests whether ... is achieved here"
    }
  ],
  "note": "string, only present if you returned fewer than 2 questions"
}`;

type MentalModelInput = {
  notes: string;
};

type PriorQuestionInput = {
  screenId: string;
  questionText: string;
  personaId: string | null;
  sourceStoryId: string | null;
};

type GenerateQuestionsRequest = {
  problemStatement: string;
  mentalModel: MentalModelInput;
  personas: { id: string; name: string }[];
  stories: { id: string; personaId: string; role: string; want: string; benefit: string }[];
  priorQuestions: PriorQuestionInput[];
  screenId: string;
  screenDescription: string;
  imageBase64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
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

const ALLOWED_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as GenerateQuestionsRequest;

  if (!ALLOWED_MEDIA_TYPES.has(body.mediaType)) {
    return Response.json(
      { error: `Unsupported image type: ${body.mediaType}` },
      { status: 400 }
    );
  }

  const contextPayload = {
    problem_statement: body.problemStatement,
    mental_model_notes: body.mentalModel.notes,
    personas: body.personas.map((p) => ({ persona_id: p.id, name: p.name })),
    user_stories: body.stories.map((s) => ({
      story_id: s.id,
      persona_id: s.personaId,
      role: s.role,
      want: s.want,
      benefit: s.benefit,
    })),
    prior_questions: body.priorQuestions.map((q) => ({
      screen_id: q.screenId,
      question_text: q.questionText,
      persona_id: q.personaId,
      source_story_id: q.sourceStoryId,
    })),
    current_screen: {
      screen_id: body.screenId,
      description: body.screenDescription,
    },
  };

  const anthropic = new Anthropic({ apiKey });

  let raw: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: JSON.stringify(contextPayload, null, 2) },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: body.mediaType,
                data: body.imageBase64,
              },
            },
          ],
        },
      ],
    });
    const textBlock = message.content.find((block) => block.type === "text");
    raw = textBlock && "text" in textBlock ? textBlock.text : "";
  } catch (err) {
    console.error("Anthropic call failed", err);
    return Response.json({ error: "Model call failed." }, { status: 502 });
  }

  let parsed: ModelResponse;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    console.error("Failed to parse model response as JSON:", raw);
    return Response.json(
      { error: "Model returned invalid JSON." },
      { status: 502 }
    );
  }

  if (!Array.isArray(parsed.questions)) {
    return Response.json(
      { error: "Model response is missing a questions array." },
      { status: 502 }
    );
  }

  console.log(
    `[generate-questions] screen ${body.screenId}: ${parsed.questions.length} question(s)` +
      (parsed.note ? `, note: ${parsed.note}` : "")
  );

  return Response.json(parsed);
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}
