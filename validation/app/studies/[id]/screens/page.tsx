"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  type Study,
  type Screen,
  type Question,
  useStudy,
  upsertStudy,
  newScreenId,
  newQuestionId,
} from "@/lib/studies";
import { generateMockQuestions } from "@/lib/mockQuestions";
import { requestGeneratedQuestions } from "@/lib/generateQuestions";
import { putImage, getImage, deleteImage } from "@/lib/images";
import { SaveIndicator } from "@/components/SaveIndicator";
import { ScreenImage } from "@/components/ScreenImage";

const textFieldClass =
  "w-full bg-transparent outline-none resize-none text-[15px] leading-snug text-ink placeholder:text-ink-soft/50 placeholder:italic border-b border-dashed border-line focus:border-pine py-1";

const MIN_DESCRIPTION_LENGTH = 50;

export default function ScreensPage() {
  const { id } = useParams<{ id: string }>();
  const persisted = useStudy(id);
  const [draft, setDraft] = useState<Study | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [fallbackIds, setFallbackIds] = useState<Set<string>>(new Set());
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());
  const [sparseNotes, setSparseNotes] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (persisted && loadedId !== id) {
    setLoadedId(id);
    setDraft(persisted);
  }

  useEffect(() => {
    if (!draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      upsertStudy({ ...draft, updatedAt: new Date().toISOString() });
      setSavedAt(new Date());
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft]);

  if (!draft) {
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

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length === 0 || !draft) return;

    setUploading(true);
    const additions: Screen[] = [];
    for (const file of files) {
      const imageId = newScreenId();
      await putImage(imageId, file);
      additions.push({
        id: newScreenId(),
        imageId,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        description: "",
        questions: [],
      });
    }
    setDraft((s) => (s ? { ...s, screens: [...s.screens, ...additions] } : s));
    setUploading(false);
  }

  async function handleGenerateQuestions(screen: Screen) {
    if (!draft) return;
    const blob = await getImage(screen.imageId);
    if (!blob) return;

    setGeneratingIds((set) => new Set(set).add(screen.id));
    setFallbackIds((set) => {
      if (!set.has(screen.id)) return set;
      const next = new Set(set);
      next.delete(screen.id);
      return next;
    });
    setSparseNotes((notes) => {
      const rest = { ...notes };
      delete rest[screen.id];
      return rest;
    });

    const priorScreens = draft.screens.filter((s) => s.id !== screen.id);
    let questions;
    try {
      const result = await requestGeneratedQuestions(draft, screen, blob, priorScreens);
      questions = result.questions;
      if (result.note) {
        setSparseNotes((notes) => ({ ...notes, [screen.id]: result.note! }));
      }
    } catch (err) {
      console.error("Falling back to mock questions:", err);
      const index = draft.screens.findIndex((s) => s.id === screen.id);
      questions = generateMockQuestions(draft, index === -1 ? 0 : index);
      setFallbackIds((set) => new Set(set).add(screen.id));
    }

    updateScreenQuestions(screen.id, () => questions);
    setAttemptedIds((set) => new Set(set).add(screen.id));
    setGeneratingIds((set) => {
      const next = new Set(set);
      next.delete(screen.id);
      return next;
    });
  }

  async function removeScreen(screen: Screen) {
    await deleteImage(screen.imageId);
    setDraft((s) =>
      s ? { ...s, screens: s.screens.filter((sc) => sc.id !== screen.id) } : s
    );
  }

  function updateScreenDescription(screenId: string, description: string) {
    setDraft((s) =>
      s
        ? {
            ...s,
            screens: s.screens.map((sc) =>
              sc.id === screenId ? { ...sc, description } : sc
            ),
          }
        : s
    );
  }

  function updateScreenQuestions(
    screenId: string,
    updater: (qs: Question[]) => Question[]
  ) {
    setDraft((s) =>
      s
        ? {
            ...s,
            screens: s.screens.map((sc) =>
              sc.id === screenId
                ? { ...sc, questions: updater(sc.questions) }
                : sc
            ),
          }
        : s
    );
  }

  function updateQuestionText(screenId: string, questionId: string, text: string) {
    updateScreenQuestions(screenId, (qs) =>
      qs.map((q) => (q.id === questionId ? { ...q, text } : q))
    );
  }

  function removeQuestion(screenId: string, questionId: string) {
    updateScreenQuestions(screenId, (qs) => qs.filter((q) => q.id !== questionId));
  }

  function addCustomQuestion(screenId: string) {
    updateScreenQuestions(screenId, (qs) => [
      ...qs,
      { id: newQuestionId(), kind: "custom", text: "", subQuestions: [] },
    ]);
  }

  function addSubQuestion(screenId: string, questionId: string) {
    updateScreenQuestions(screenId, (qs) =>
      qs.map((q) =>
        q.id === questionId
          ? {
              ...q,
              subQuestions: [...q.subQuestions, { id: newQuestionId(), text: "" }],
            }
          : q
      )
    );
  }

  function updateSubQuestion(
    screenId: string,
    questionId: string,
    subId: string,
    text: string
  ) {
    updateScreenQuestions(screenId, (qs) =>
      qs.map((q) =>
        q.id === questionId
          ? {
              ...q,
              subQuestions: q.subQuestions.map((sq) =>
                sq.id === subId ? { ...sq, text } : sq
              ),
            }
          : q
      )
    );
  }

  function removeSubQuestion(screenId: string, questionId: string, subId: string) {
    updateScreenQuestions(screenId, (qs) =>
      qs.map((q) =>
        q.id === questionId
          ? { ...q, subQuestions: q.subQuestions.filter((sq) => sq.id !== subId) }
          : q
      )
    );
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
            href={`/studies/${id}/setup`}
            className="text-sm text-ink-soft hover:text-ink shrink-0 truncate"
          >
            {draft.title}
          </Link>
          <span className="text-ink-soft/50">/</span>
          <span className="font-serif text-lg truncate">Screens</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <SaveIndicator savedAt={savedAt} />
          <Link
            href={`/studies/${id}/setup`}
            className="text-sm text-ink-soft hover:text-ink"
          >
            Back to setup
          </Link>
        </div>
      </header>

      <main className="flex-1 flex justify-center px-6 sm:px-10 py-10">
        <div className="w-full max-w-3xl">
          <h1 className="font-serif text-2xl text-ink mb-2">
            Upload your flow&apos;s screens
          </h1>
          <p className="text-sm text-ochre italic mb-8 max-w-md">
            Add them in the order a user would move through them. Upload
            order is final — there&apos;s no reordering once a screen is in,
            so double-check the sequence before adding the next one.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              void handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-md border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-pine bg-pine-tint"
                : "border-line hover:border-pine/60"
            }`}
          >
            <UploadIcon />
            <p className="mt-3 text-sm text-ink">
              <span className="text-pine font-medium">Click to browse</span>{" "}
              or drop screenshots here
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              PNG or JPG, one screen at a time or several at once
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {uploading && (
            <p className="mt-3 text-sm text-ink-soft">Adding screens…</p>
          )}

          {draft.screens.length > 0 && (
            <ol className="mt-10 flex flex-col gap-6">
              {draft.screens.map((screen, i) => (
                <li
                  key={screen.id}
                  className="rounded-md border border-line bg-paper-raised p-5"
                >
                  <div className="flex items-start gap-4 mb-5">
                    <span className="text-sm text-ink-soft w-5 shrink-0 text-right mt-1">
                      {i + 1}.
                    </span>
                    <div className="w-40 shrink-0">
                      <ScreenImage imageId={screen.imageId} className="aspect-video w-full rounded" />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm text-ink mt-1">
                      {screen.fileName}
                    </p>
                    <button
                      onClick={() => removeScreen(screen)}
                      aria-label={`Remove ${screen.fileName}`}
                      className="shrink-0 text-ink-soft hover:text-ink transition-colors"
                    >
                      <XIcon />
                    </button>
                  </div>

                  <div className="pl-9 mb-5">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-ink-soft">
                        What is this screen?
                      </span>
                      <textarea
                        value={screen.description}
                        onChange={(e) =>
                          updateScreenDescription(screen.id, e.target.value)
                        }
                        placeholder={`The checkout confirmation page shown right after payment succeeds.`}
                        rows={2}
                        className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-soft/60 placeholder:italic focus:outline-none focus:border-pine focus:ring-1 focus:ring-pine resize-y"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-ink-soft">
                          Shown to the customer alongside this screenshot so
                          they&apos;re not guessing at context.
                        </span>
                        <span className="text-xs text-ink-soft shrink-0">
                          {Math.min(screen.description.trim().length, MIN_DESCRIPTION_LENGTH)}/
                          {MIN_DESCRIPTION_LENGTH}
                        </span>
                      </div>
                    </label>
                    <button
                      onClick={() => handleGenerateQuestions(screen)}
                      disabled={
                        screen.description.trim().length < MIN_DESCRIPTION_LENGTH ||
                        generatingIds.has(screen.id)
                      }
                      className={`mt-3 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        screen.description.trim().length >= MIN_DESCRIPTION_LENGTH &&
                        !generatingIds.has(screen.id)
                          ? "bg-pine text-white hover:bg-pine-deep"
                          : "bg-line text-ink-soft/70 cursor-not-allowed"
                      }`}
                    >
                      {generatingIds.has(screen.id)
                        ? "Generating…"
                        : attemptedIds.has(screen.id)
                          ? "Regenerate questions"
                          : "Generate questions"}
                    </button>
                  </div>

                  <div className="pl-9 flex flex-col gap-3">
                    {generatingIds.has(screen.id) ? (
                      <p className="text-sm text-ink-soft flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-pine animate-pulse" />
                        Generating candidate questions…
                      </p>
                    ) : (
                      <>
                        {fallbackIds.has(screen.id) && (
                          <p className="text-xs text-ochre italic">
                            The model call didn&apos;t come back cleanly, so
                            these are placeholder questions — edit freely.
                          </p>
                        )}
                        {sparseNotes[screen.id] && (
                          <p className="text-xs text-ink-soft italic">
                            {sparseNotes[screen.id]}
                          </p>
                        )}
                        {screen.questions.length === 0 &&
                          !fallbackIds.has(screen.id) &&
                          attemptedIds.has(screen.id) && (
                            <p className="text-sm text-ink-soft">
                              No questions yet — add your own below, or add
                              user stories in setup to get generated ones.
                            </p>
                          )}
                        {screen.questions.map((question) => (
                          <QuestionCard
                            key={question.id}
                            question={question}
                            personas={draft.personas}
                            multiplePersonas={draft.personas.length > 1}
                            onUpdateText={(text) =>
                              updateQuestionText(screen.id, question.id, text)
                            }
                            onRemove={() => removeQuestion(screen.id, question.id)}
                            onAddSub={() => addSubQuestion(screen.id, question.id)}
                            onUpdateSub={(subId, text) =>
                              updateSubQuestion(screen.id, question.id, subId, text)
                            }
                            onRemoveSub={(subId) =>
                              removeSubQuestion(screen.id, question.id, subId)
                            }
                          />
                        ))}
                        <button
                          onClick={() => addCustomQuestion(screen.id)}
                          className="self-start text-sm text-pine hover:text-pine-deep font-medium"
                        >
                          + Add question
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-10 pt-8 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-ink-soft max-w-sm">
              Mark this done once you&apos;re happy with the screens and
              questions, then preview the script yourself before it goes
              anywhere near a real customer.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setDraft((s) => (s ? { ...s, screensDone: true } : s))}
                disabled={draft.screens.length === 0}
                className={`rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  draft.screensDone
                    ? "bg-pine-tint text-pine-deep"
                    : draft.screens.length === 0
                      ? "bg-line text-ink-soft/70 cursor-not-allowed"
                      : "bg-pine text-white hover:bg-pine-deep"
                }`}
              >
                {draft.screensDone ? "Done ✓" : "Done"}
              </button>
              {draft.screensDone ? (
                <Link
                  href={`/studies/${id}/preview`}
                  className="rounded-md px-4 py-2.5 text-sm font-medium bg-pine text-white hover:bg-pine-deep transition-colors"
                >
                  Preview
                </Link>
              ) : (
                <button
                  disabled
                  className="rounded-md px-4 py-2.5 text-sm font-medium bg-line text-ink-soft/70 cursor-not-allowed"
                >
                  Preview
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function QuestionCard({
  question,
  personas,
  multiplePersonas,
  onUpdateText,
  onRemove,
  onAddSub,
  onUpdateSub,
  onRemoveSub,
}: {
  question: Question;
  personas: Study["personas"];
  multiplePersonas: boolean;
  onUpdateText: (text: string) => void;
  onRemove: () => void;
  onAddSub: () => void;
  onUpdateSub: (subId: string, text: string) => void;
  onRemoveSub: (subId: string) => void;
}) {
  const persona =
    question.kind === "generated" && question.personaId
      ? personas.find((p) => p.id === question.personaId)
      : undefined;

  return (
    <div className="rounded-md border border-line bg-paper px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {question.kind === "generated" && multiplePersonas && persona && (
            <span className="self-start text-xs rounded-full bg-pine-tint text-pine-deep px-2 py-0.5">
              {persona.name}
            </span>
          )}
          <textarea
            value={question.text}
            onChange={(e) => onUpdateText(e.target.value)}
            placeholder={question.kind === "custom" ? "Add your own question" : undefined}
            rows={2}
            className={textFieldClass}
          />
        </div>
        <button
          onClick={onRemove}
          aria-label="Remove question"
          className="shrink-0 text-ink-soft hover:text-ink transition-colors"
        >
          <XIcon />
        </button>
      </div>

      {question.kind === "generated" && (
        <div className="mt-2 flex items-start gap-2">
          {question.testsAssumption && (
            <span className="shrink-0 text-xs rounded-full bg-ochre-tint text-ochre px-2 py-0.5">
              Tests an assumption
            </span>
          )}
          <p className="text-xs text-ochre italic">{question.note}</p>
        </div>
      )}

      {question.subQuestions.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-line flex flex-col gap-2">
          {question.subQuestions.map((sub) => (
            <div key={sub.id} className="flex items-center gap-2">
              <textarea
                value={sub.text}
                onChange={(e) => onUpdateSub(sub.id, e.target.value)}
                placeholder="Follow-up question"
                rows={1}
                className={`flex-1 text-sm ${textFieldClass}`}
              />
              <button
                onClick={() => onRemoveSub(sub.id)}
                aria-label="Remove follow-up question"
                className="shrink-0 text-ink-soft hover:text-ink transition-colors"
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAddSub}
        className="mt-2 pl-4 text-sm text-pine hover:text-pine-deep font-medium"
      >
        + Add follow-up question
      </button>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="mx-auto text-ink-soft"
    >
      <path d="M11 14V3M11 3L7 7M11 3l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
    </svg>
  );
}
