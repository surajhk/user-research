export type InterviewHistoryTurn = {
  role: "bot" | "customer";
  text: string;
};

export type InterviewQuestion = {
  question_id: string;
  question_text: string;
  tests_assumption: boolean;
};

export type InterviewAction =
  | "ask_question"
  | "ask_followup"
  | "answer_orientation"
  | "flag_for_pm"
  | "screen_complete"
  | "close_session";

export type InterviewTurnResult = {
  messageToCustomer: string;
  action: InterviewAction;
  questionId: string | null;
  followupTurnCount: number;
  sessionComplete: boolean;
};

// Calls the real interview bot for one turn. The app owns all state (which
// screen, which question, how many follow-ups so far) — this call only ever
// asks the model to decide what to do with the current turn. Throws on any
// failure; the caller decides how to surface that (e.g. an inline retry).
export async function requestInterviewTurn(params: {
  problemStatement: string;
  screenId: string;
  screenDescription: string;
  questions: InterviewQuestion[];
  isLastScreen: boolean;
  history: InterviewHistoryTurn[];
  currentQuestionId: string | null;
  followupTurnCount: number;
  customerMessage: string | null;
}): Promise<InterviewTurnResult> {
  const res = await fetch("/api/interview-turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Interview turn failed (${res.status}).`);
  }

  const data = await res.json();

  return {
    messageToCustomer: data.message_to_customer,
    action: data.action,
    questionId: data.question_id ?? null,
    followupTurnCount: data.followup_turn_count ?? 0,
    sessionComplete: !!data.session_complete,
  };
}
