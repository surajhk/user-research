"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  type Study,
  type Persona,
  type UserStory,
  useStudy,
  upsertStudy,
  newPersonaId,
  newStoryId,
} from "@/lib/studies";
import { SaveIndicator } from "@/components/SaveIndicator";

const SECTIONS = [
  { id: "problem", label: "Problem statement" },
  { id: "mental-model", label: "Mental model" },
  { id: "personas", label: "Personas & user stories" },
] as const;

const fieldClass =
  "w-full rounded-md border border-line bg-paper-raised px-3.5 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-pine focus:ring-1 focus:ring-pine resize-y";

export default function StudySetupPage() {
  const { id } = useParams<{ id: string }>();
  const persisted = useStudy(id);
  const [draft, setDraft] = useState<Study | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Seed the local, editable draft from the persisted study the first time it
  // becomes available for this id — the React-documented way to derive state
  // from an external value without an effect.
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
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft]);

  useEffect(() => {
    if (!draft) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
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

  function update(patch: Partial<Study>) {
    setDraft((s) => (s ? { ...s, ...patch } : s));
  }

  function updateMentalModel(patch: Partial<Study["mentalModel"]>) {
    setDraft((s) =>
      s ? { ...s, mentalModel: { ...s.mentalModel, ...patch } } : s
    );
  }

  function addPersona() {
    setDraft((s) => {
      if (!s) return s;
      const persona: Persona = {
        id: newPersonaId(),
        name: `Persona ${s.personas.length + 1}`,
      };
      return { ...s, personas: [...s.personas, persona] };
    });
  }

  function updatePersona(personaId: string, patch: Partial<Persona>) {
    setDraft((s) =>
      s
        ? {
            ...s,
            personas: s.personas.map((p) =>
              p.id === personaId ? { ...p, ...patch } : p
            ),
          }
        : s
    );
  }

  function removePersona(personaId: string) {
    setDraft((s) => {
      if (!s || s.personas.length <= 1) return s;
      return {
        ...s,
        personas: s.personas.filter((p) => p.id !== personaId),
        stories: s.stories.filter((story) => story.personaId !== personaId),
      };
    });
  }

  function addStory(personaId: string) {
    setDraft((s) => {
      if (!s) return s;
      const persona = s.personas.find((p) => p.id === personaId);
      const story: UserStory = {
        id: newStoryId(),
        personaId,
        role: persona?.name ?? "",
        want: "",
        benefit: "",
      };
      return { ...s, stories: [...s.stories, story] };
    });
  }

  function updateStory(storyId: string, patch: Partial<UserStory>) {
    setDraft((s) =>
      s
        ? {
            ...s,
            stories: s.stories.map((st) =>
              st.id === storyId ? { ...st, ...patch } : st
            ),
          }
        : s
    );
  }

  function removeStory(storyId: string) {
    setDraft((s) =>
      s ? { ...s, stories: s.stories.filter((st) => st.id !== storyId) } : s
    );
  }

  function scrollTo(sectionId: string) {
    sectionRefs.current[sectionId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
          <input
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            className="font-serif text-lg bg-transparent outline-none focus:underline decoration-line underline-offset-4 truncate"
            aria-label="Study title"
          />
        </div>
        <SaveIndicator savedAt={savedAt} />
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <nav className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-line px-6 sm:px-10 md:px-6 py-4 md:py-10">
          <ol className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => scrollTo(section.id)}
                  className={`whitespace-nowrap md:whitespace-normal text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    activeSection === section.id
                      ? "bg-pine-tint text-pine-deep font-medium"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                      activeSection === section.id ? "bg-pine" : "bg-line"
                    }`}
                  />
                  {section.label}
                </button>
              </li>
            ))}
            <li>
              <Link
                href={`/studies/${id}/screens`}
                className="whitespace-nowrap md:whitespace-normal px-3 py-2 rounded-md text-sm flex items-center gap-2 text-ink-soft hover:text-ink transition-colors"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-line" />
                Upload screens
                {draft.screens.length > 0 && (
                  <span className="text-xs rounded-full bg-pine-tint text-pine-deep px-1.5 py-0.5">
                    {draft.screens.length}
                  </span>
                )}
              </Link>
            </li>
          </ol>
        </nav>

        <main className="flex-1 px-6 sm:px-10 py-10 max-w-2xl">
          <Section
            id="problem"
            sectionRef={(el) => (sectionRefs.current["problem"] = el)}
            title="Problem statement"
            note="Why does this prototype or feature exist? This sets the lens the tool uses to judge whether a screen answers the question that matters."
          >
            <textarea
              value={draft.problemStatement}
              onChange={(e) => update({ problemStatement: e.target.value })}
              placeholder="We're testing whether a simplified checkout reduces drop-off for first-time buyers who currently abandon at payment."
              rows={5}
              className={fieldClass}
            />
          </Section>

          <Section
            id="mental-model"
            sectionRef={(el) => (sectionRefs.current["mental-model"] = el)}
            title="Mental model"
            note="Who is this person, and what do they already believe? Gaps here are usually where a PM's own assumptions turn out to be wrong."
          >
            <textarea
              value={draft.mentalModel.notes}
              onChange={(e) => updateMentalModel({ notes: e.target.value })}
              placeholder={`They currently track this in a shared spreadsheet, checking it each morning alongside a separate delivery app — it breaks down once more than two people edit at once. They describe it as "like a shared spreadsheet, but for shipping labels," and think in terms of orders, shipments, and labels. Still an assumption — not yet validated with a real interview.`}
              rows={8}
              className={fieldClass}
            />
          </Section>

          <Section
            id="personas"
            sectionRef={(el) => (sectionRefs.current["personas"] = el)}
            title="Personas & user stories"
            note="Add more than one persona if this study covers more than one type of user — each story belongs to exactly one."
          >
            <div className="flex flex-wrap gap-2 mb-6">
              {draft.personas.map((persona) => (
                <PersonaPill
                  key={persona.id}
                  persona={persona}
                  removable={draft.personas.length > 1}
                  onChange={(patch) => updatePersona(persona.id, patch)}
                  onRemove={() => removePersona(persona.id)}
                />
              ))}
              <button
                onClick={addPersona}
                className="text-sm px-3 py-1.5 rounded-full border border-dashed border-line text-ink-soft hover:text-pine hover:border-pine transition-colors"
              >
                + Add persona
              </button>
            </div>

            <div className="flex flex-col gap-8">
              {draft.personas.map((persona) => {
                const stories = draft.stories.filter(
                  (s) => s.personaId === persona.id
                );
                return (
                  <div key={persona.id}>
                    {draft.personas.length > 1 && (
                      <p className="text-sm font-medium text-ink-soft mb-3">
                        {persona.name || "Untitled persona"}
                      </p>
                    )}
                    <div className="flex flex-col gap-3">
                      {stories.map((story) => (
                        <StoryRow
                          key={story.id}
                          story={story}
                          onChange={(patch) => updateStory(story.id, patch)}
                          onRemove={() => removeStory(story.id)}
                        />
                      ))}
                      <button
                        onClick={() => addStory(persona.id)}
                        className="self-start text-sm text-pine hover:text-pine-deep font-medium"
                      >
                        + Add story
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <div className="mt-4 pt-8 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-ink-soft max-w-sm">
              Next, upload screens one at a time and the tool will draft
              candidate questions for each.
            </p>
            <Link
              href={`/studies/${id}/screens`}
              className="rounded-md bg-pine text-white px-4 py-2.5 text-sm font-medium hover:bg-pine-deep transition-colors shrink-0"
            >
              Upload screens
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  note,
  children,
  sectionRef,
}: {
  id: string;
  title: string;
  note: string;
  children: React.ReactNode;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  return (
    <section id={id} ref={sectionRef} className="mb-14 scroll-mt-10">
      <h2 className="font-serif text-2xl text-ink mb-2">{title}</h2>
      <p className="text-sm text-ochre italic mb-5 max-w-md">{note}</p>
      {children}
    </section>
  );
}


function PersonaPill({
  persona,
  removable,
  onChange,
  onRemove,
}: {
  persona: Persona;
  removable: boolean;
  onChange: (patch: Partial<Persona>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-paper-raised pl-3 pr-1.5 py-1">
      <input
        value={persona.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="bg-transparent text-sm font-medium outline-none"
        style={{ width: `${Math.max(persona.name.length, 6)}ch` }}
        aria-label="Persona name"
      />
      {removable && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${persona.name}`}
          className="w-5 h-5 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-line/60 transition-colors"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}

function StoryRow({
  story,
  onChange,
  onRemove,
}: {
  story: UserStory;
  onChange: (patch: Partial<UserStory>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex flex-wrap items-baseline gap-x-1.5 gap-y-2 rounded-md border border-line bg-paper-raised px-4 py-3 text-[15px] leading-loose">
      <span className="text-ink-soft">As a</span>
      <AutoInput
        value={story.role}
        onChange={(v) => onChange({ role: v })}
        placeholder="new customer"
      />
      <span className="text-ink-soft">, I want</span>
      <AutoInput
        value={story.want}
        onChange={(v) => onChange({ want: v })}
        placeholder="to see shipping cost before checkout"
        grow
      />
      <span className="text-ink-soft">, so that</span>
      <AutoInput
        value={story.benefit}
        onChange={(v) => onChange({ benefit: v })}
        placeholder="I don't get surprised at the last step"
        grow
      />
      <button
        onClick={onRemove}
        aria-label="Remove story"
        className="ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100 text-ink-soft hover:text-ink transition-opacity"
      >
        <XIcon />
      </button>
    </div>
  );
}

function AutoInput({
  value,
  onChange,
  placeholder,
  grow,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  grow?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-transparent border-b border-dashed border-line focus:border-pine outline-none px-0.5 placeholder:text-ink-soft/50 placeholder:italic ${
        grow ? "flex-1 min-w-[10ch]" : "min-w-[8ch]"
      }`}
    />
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
    </svg>
  );
}

