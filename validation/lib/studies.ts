import { useSyncExternalStore } from "react";

export type Persona = {
  id: string;
  name: string;
};

export type UserStory = {
  id: string;
  personaId: string;
  role: string;
  want: string;
  benefit: string;
};

export type SubQuestion = {
  id: string;
  text: string;
};

// One question per story/persona pairing the generator judged relevant to
// this screen — when two personas both have a relevant story, that's two
// separate GeneratedQuestion entries, each phrased in its own persona's voice.
export type GeneratedQuestion = {
  id: string;
  kind: "generated";
  text: string;
  personaId: string | null;
  storyId: string | null;
  testsAssumption: boolean;
  note: string;
  subQuestions: SubQuestion[];
};

export type CustomQuestion = {
  id: string;
  kind: "custom";
  text: string;
  subQuestions: SubQuestion[];
};

export type Question = GeneratedQuestion | CustomQuestion;

export type Screen = {
  id: string;
  imageId: string;
  fileName: string;
  createdAt: string;
  // PM-written context on what this screen is/does — shown to the customer
  // during preview/interview alongside the screenshot, since the image and
  // questions alone often aren't enough to orient them.
  description: string;
  questions: Question[];
};

export type MentalModel = {
  notes: string;
};

export type Study = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  problemStatement: string;
  mentalModel: MentalModel;
  personas: Persona[];
  stories: UserStory[];
  screens: Screen[];
  // Set once the PM marks screen upload/review finished — gates entry to
  // preview mode (Block 3).
  screensDone: boolean;
};

const STORAGE_KEY = "ur_studies_v1";

function newId(): string {
  return crypto.randomUUID();
}

export function newPersonaId(): string {
  return newId();
}

export function newStoryId(): string {
  return newId();
}

export function newScreenId(): string {
  return newId();
}

export function newQuestionId(): string {
  return newId();
}

// Studies live in localStorage, an external system React doesn't know about.
// useSyncExternalStore (via useStudies/useStudy below) is what lets components
// read it reactively without a load-on-mount effect.
type Listener = () => void;
let listeners: Listener[] = [];
let cachedRaw: string | null = null;
let cachedStudies: Study[] = [];
const EMPTY_STUDIES: Study[] = [];

// Backfills studies saved under an older, more structured mental-model shape
// (Behavior/Framing/Evidence fields, or the even older who/beliefs fields)
// by flattening whatever was filled in into readable prose, so switching to
// a single free-text field doesn't silently drop existing drafts' content.
type LegacyMentalModel = {
  notes?: string;
  workflowSteps?: string[];
  tools?: string[];
  friction?: string;
  analogy?: string;
  vocabulary?: string[];
  mentalObjects?: string;
  confidence?: "validated" | "assumption";
  source?: string;
  who?: string;
  beliefs?: string;
};

function normalizeMentalModel(raw: unknown): MentalModel {
  const mm = (raw ?? {}) as LegacyMentalModel;
  if (typeof mm.notes === "string") {
    return { notes: mm.notes };
  }

  const lines: string[] = [];
  if (mm.who) lines.push(mm.who);
  if (mm.workflowSteps?.length) lines.push(`Workflow: ${mm.workflowSteps.join(" → ")}.`);
  if (mm.tools?.length) lines.push(`Tools/artifacts: ${mm.tools.join(", ")}.`);
  if (mm.friction) lines.push(`Friction: ${mm.friction}`);
  if (mm.beliefs) lines.push(mm.beliefs);
  if (mm.analogy) lines.push(`Analogy: ${mm.analogy}`);
  if (mm.vocabulary?.length) lines.push(`Vocabulary: ${mm.vocabulary.join(", ")}.`);
  if (mm.mentalObjects) lines.push(`Mental objects: ${mm.mentalObjects}`);
  if (mm.confidence) {
    lines.push(
      mm.confidence === "validated"
        ? `Validated${mm.source ? ` (${mm.source})` : ""}.`
        : "Still an assumption — needs research."
    );
  }
  return { notes: lines.join("\n") };
}

function normalizeScreen(raw: Screen): Screen {
  return {
    ...raw,
    description: typeof raw.description === "string" ? raw.description : "",
    questions: Array.isArray(raw.questions) ? raw.questions : [],
  };
}

function normalizeStudy(raw: Study): Study {
  return {
    ...raw,
    mentalModel: normalizeMentalModel(raw.mentalModel),
    screens: (Array.isArray(raw.screens) ? raw.screens : []).map(normalizeScreen),
    screensDone: raw.screensDone === true,
  };
}

function readSnapshot(): Study[] {
  if (typeof window === "undefined") return cachedStudies;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? (JSON.parse(raw) as Study[]) : [];
      cachedStudies = parsed.map(normalizeStudy);
    } catch {
      cachedStudies = [];
    }
  }
  return cachedStudies;
}

function getServerSnapshot(): Study[] {
  return EMPTY_STUDIES;
}

function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener("storage", listener);
  };
}

function emitChange(): void {
  for (const listener of listeners) listener();
}

export function loadStudies(): Study[] {
  return readSnapshot();
}

function saveStudies(studies: Study[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(studies));
  cachedRaw = null;
  emitChange();
}

export function getStudy(id: string): Study | undefined {
  return loadStudies().find((s) => s.id === id);
}

export function upsertStudy(study: Study): void {
  const studies = loadStudies();
  const idx = studies.findIndex((s) => s.id === study.id);
  const next = idx === -1 ? [...studies, study] : studies.map((s, i) => (i === idx ? study : s));
  saveStudies(next);
}

export function useStudies(): Study[] {
  return useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
}

export function useStudy(id: string): Study | undefined {
  const studies = useStudies();
  return studies.find((s) => s.id === id);
}

export function createStudy(title: string): Study {
  const now = new Date().toISOString();
  const study: Study = {
    id: newId(),
    title: title.trim() || "Untitled study",
    createdAt: now,
    updatedAt: now,
    problemStatement: "",
    mentalModel: { notes: "" },
    personas: [{ id: newPersonaId(), name: "Primary user" }],
    stories: [],
    screens: [],
    screensDone: false,
  };
  upsertStudy(study);
  return study;
}
