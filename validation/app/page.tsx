"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type Study, createStudy, useStudies } from "@/lib/studies";

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const studies = [...useStudies()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const study = createStudy(title);
    router.push(`/studies/${study.id}/setup`);
  }

  return (
    <div className="flex-1 flex justify-center">
      <div className="w-full max-w-2xl px-6 sm:px-8 py-16 sm:py-24">
        <h1 className="font-serif text-[2.1rem] sm:text-4xl leading-tight text-ink max-w-lg">
          What are you building research around today?
        </h1>
        <p className="text-ink-soft mt-4 max-w-md leading-relaxed">
          Give the study a short name to start. You&apos;ll add the problem
          statement, who it&apos;s for, and the user stories next — enough
          for the tool to draft good discovery questions once you upload
          screens.
        </p>

        <form
          onSubmit={handleStart}
          className="mt-8 flex flex-col sm:flex-row gap-3"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Redesigned onboarding checklist"
            className="flex-1 rounded-md border border-line bg-paper-raised px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-pine focus:ring-1 focus:ring-pine"
            autoFocus
          />
          <button
            type="submit"
            className="rounded-md bg-pine text-white px-5 py-3 text-sm font-medium hover:bg-pine-deep transition-colors"
          >
            Start study
          </button>
        </form>

        {studies.length > 0 && (
          <div className="mt-20">
            <h2 className="font-serif text-lg text-ink mb-4">
              Studies in progress
            </h2>
            <ul className="border-t border-line">
              {studies.map((s) => (
                <li key={s.id} className="border-b border-line">
                  <Link
                    href={`/studies/${s.id}/setup`}
                    className="group flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink group-hover:text-pine truncate transition-colors">
                        {s.title}
                      </p>
                      <p className="text-sm text-ink-soft mt-0.5">
                        {summarize(s)}
                      </p>
                    </div>
                    <span className="text-sm text-ink-soft shrink-0">
                      {formatDate(s.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function summarize(study: Study): string {
  const parts: string[] = [];
  if (study.problemStatement.trim()) parts.push("problem statement");
  if (study.mentalModel.notes.trim()) parts.push("mental model");
  if (study.stories.length > 0) {
    parts.push(
      `${study.stories.length} ${study.stories.length === 1 ? "story" : "stories"}`
    );
  }
  if (study.screens.length > 0) {
    parts.push(
      `${study.screens.length} ${study.screens.length === 1 ? "screen" : "screens"}`
    );
  }
  return parts.length ? `Drafted: ${parts.join(", ")}` : "Not started yet";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
