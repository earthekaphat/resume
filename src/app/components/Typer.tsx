"use client";

import { useEffect, useState } from "react";

// Types each phrase, holds it, deletes it, then moves to the next one.
export function Typer({ phrases }: { phrases: string[] }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState(phrases[0]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const full = phrases[i];
    let delay = deleting ? 28 : 55;
    if (!deleting && text === full) delay = 1800;
    if (deleting && text === "") delay = 300;
    const t = setTimeout(() => {
      if (!deleting && text === full) setDeleting(true);
      else if (deleting && text === "") {
        setDeleting(false);
        setI((i + 1) % phrases.length);
      } else setText(deleting ? full.slice(0, text.length - 1) : full.slice(0, text.length + 1));
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, i, phrases]);

  return (
    <span className="typer">
      <span className="sr-only">{phrases[0]}</span>
      <span aria-hidden>{text}</span>
      <span className="typer__caret" aria-hidden />
    </span>
  );
}
