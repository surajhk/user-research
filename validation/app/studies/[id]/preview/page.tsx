"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { type Screen, useStudy } from "@/lib/studies";
import {
  requestInterviewTurn,
  type InterviewHistoryTurn,
} from "@/lib/interview";
import { ScreenImage } from "@/components/ScreenImage";

type CallParams = {
  screen: Screen;
  history: InterviewHistoryTurn[];
  currentQuestionId: string | null;
  followupTurnCount: number;
  customerMessage: string | null;
  isLastScreen: boolean;
};

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const study = useStudy(id);

  // Screens with nothing to ask never enter the customer-facing script.
  const screens = useMemo(
    () => (study ? study.screens.filter((s) => s.questions.length > 0) : []),
    [study]
  );

  const [screenIndex, setScreenIndex] = useState(0);
  const [history, setHistory] = useState<InterviewHistoryTurn[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [followupTurnCount, setFollowupTurnCount] = useState(0);
  const [screenComplete, setScreenComplete] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startedScreens = useRef<Set<number>>(new Set());
  const lastCall = useRef<CallParams | null>(null);

  const callTurn = useCallback(
    async (params: CallParams) => {
      lastCall.current = params;
      setLoading(true);
      setError(null);
      try {
        const result = await requestInterviewTurn({
          problemStatement: study?.problemStatement ?? "",
          screenId: params.screen.id,
          screenDescription: params.screen.description,
          questions: params.screen.questions.map((q) => ({
            question_id: q.id,
            question_text: q.text,
            tests_assumption: q.kind === "generated" ? q.testsAssumption : false,
          })),
          isLastScreen: params.isLastScreen,
          history: params.history,
          currentQuestionId: params.currentQuestionId,
          followupTurnCount: params.followupTurnCount,
          customerMessage: params.customerMessage,
        });

        setHistory((h) => [...h, { role: "bot", text: result.messageToCustomer }]);
        setCurrentQuestionId(result.questionId);
        setFollowupTurnCount(result.followupTurnCount);
        if (result.action === "screen_complete") setScreenComplete(true);
        if (result.action === "close_session" || result.sessionComplete) {
          setSessionComplete(true);
        }
      } catch (err) {
        console.error("Interview turn failed:", err);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [study]
  );

  // Fires the opening turn for a screen exactly once, even under React's
  // dev-mode double-invocation of effects — the ref guard is set
  // synchronously before the async call starts.
  useEffect(() => {
    if (!study || screens.length === 0) return;
    const screen = screens[screenIndex];
    if (!screen) return;
    if (startedScreens.current.has(screenIndex)) return;
    // The "started" guard is only set once the deferred call actually fires
    // (not here, synchronously) — so if dev-mode Strict Mode cleans this
    // effect up before the timer runs, the guard stays unset and the next
    // (real) effect run is free to fire it for real.
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      startedScreens.current.add(screenIndex);
      void callTurn({
        screen,
        history: [],
        currentQuestionId: null,
        followupTurnCount: 0,
        customerMessage: null,
        isLastScreen: screenIndex === screens.length - 1,
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [study, screens, screenIndex, callTurn]);

  if (!study) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-ink-soft">
          This study doesn&apos;t exist, or the draft was cleared from this
          browser.
        </p>
        <Link href="/" className="text-pine font-medium hover:text-pine-deep">
          Back to studies
        </Link>
      </div>
    );
  }

  if (!study.screensDone) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-ink-soft">
          Mark the screens done before previewing this study.
        </p>
        <Link
          href={`/studies/${id}/screens`}
          className="text-pine font-medium hover:text-pine-deep"
        >
          Back to screens
        </Link>
      </div>
    );
  }

  const screen = screens[screenIndex];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading || screenComplete || sessionComplete || !screen) return;
    const message = input.trim();
    const historyBefore = history;
    setInput("");
    setHistory((h) => [...h, { role: "customer", text: message }]);
    void callTurn({
      screen,
      history: historyBefore,
      currentQuestionId,
      followupTurnCount,
      customerMessage: message,
      isLastScreen: screenIndex === screens.length - 1,
    });
  }

  function goToNextScreen() {
    setScreenIndex((i) => i + 1);
    setHistory([]);
    setCurrentQuestionId(null);
    setFollowupTurnCount(0);
    setScreenComplete(false);
    setError(null);
  }

  function retry() {
    if (lastCall.current) void callTurn(lastCall.current);
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-line px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="text-sm text-ink-soft hover:text-ink shrink-0"
          >
            Studies
          </Link>
          <span className="text-ink-soft/50">/</span>
          <Link
            href={`/studies/${id}/screens`}
            className="text-sm text-ink-soft hover:text-ink shrink-0 truncate"
          >
            {study.title}
          </Link>
          <span className="text-ink-soft/50">/</span>
          <span className="font-serif text-lg truncate">Preview</span>
        </div>
        <Link
          href={`/studies/${id}/screens`}
          className="text-sm text-ink-soft hover:text-ink shrink-0"
        >
          Exit preview
        </Link>
      </header>

      {screens.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-ink-soft">
            None of the uploaded screens have any questions yet.
          </p>
          <Link
            href={`/studies/${id}/screens`}
            className="text-pine font-medium hover:text-pine-deep"
          >
            Back to screens
          </Link>
        </div>
      ) : (
        <main className="flex-1 flex flex-col lg:flex-row">
          <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-line px-6 sm:px-10 py-8 flex flex-col">
            <p className="text-sm text-ink-soft mb-3">
              Screen {screenIndex + 1} of {screens.length}
            </p>
            {screen && (
              <>
                <ScreenImage
                  imageId={screen.imageId}
                  className="w-full rounded-md max-h-[70vh] object-contain"
                />
                {screen.description && (
                  <p className="text-sm text-ink-soft mt-4 max-w-md">
                    {screen.description}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="lg:w-1/2 flex flex-col px-6 sm:px-10 py-8">
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pb-6">
              {history.map((turn, i) => (
                <ChatBubble key={i} from={turn.role}>
                  {turn.text}
                </ChatBubble>
              ))}
              {loading && (
                <p className="text-sm text-ink-soft flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pine animate-pulse" />
                  Thinking…
                </p>
              )}
              {error && (
                <div className="text-sm text-ochre italic flex items-center gap-3">
                  <span>{error}</span>
                  <button
                    onClick={retry}
                    className="text-pine font-medium hover:text-pine-deep not-italic"
                  >
                    Retry
                  </button>
                </div>
              )}
              {sessionComplete && (
                <p className="text-sm text-ink-soft italic mt-2">
                  Preview complete.
                </p>
              )}
            </div>

            {!sessionComplete && screenComplete && (
              <button
                onClick={goToNextScreen}
                className="self-start rounded-md bg-pine text-white px-4 py-2.5 text-sm font-medium hover:bg-pine-deep transition-colors"
              >
                Next screen
              </button>
            )}

            {!sessionComplete && !screenComplete && (
              <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-line">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Answer as the customer would…"
                  disabled={loading}
                  autoFocus
                  className="flex-1 rounded-md border border-line bg-paper-raised px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-pine focus:ring-1 focus:ring-pine disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-pine text-white px-4 py-2.5 text-sm font-medium hover:bg-pine-deep transition-colors disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

function ChatBubble({
  from,
  children,
}: {
  from: "bot" | "customer";
  children: React.ReactNode;
}) {
  return (
    <div className={`flex ${from === "customer" ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[85%] rounded-md px-4 py-2.5 text-[15px] leading-relaxed ${
          from === "bot"
            ? "bg-pine-tint text-pine-deep"
            : "bg-paper-raised border border-line text-ink"
        }`}
      >
        {children}
      </p>
    </div>
  );
}
