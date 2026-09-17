"use client";

import { useEffect, useState } from "react";

export function SaveIndicator({ savedAt }: { savedAt: Date | null }) {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!savedAt) {
    return <span className="text-sm text-ink-soft shrink-0">Draft</span>;
  }
  const seconds = Math.max(0, Math.round((tick - savedAt.getTime()) / 1000));
  const label =
    seconds < 5
      ? "Saved just now"
      : seconds < 60
        ? `Saved ${seconds}s ago`
        : `Saved ${Math.round(seconds / 60)}m ago`;
  return (
    <span className="text-sm text-ink-soft shrink-0 flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-pine" />
      {label}
    </span>
  );
}
