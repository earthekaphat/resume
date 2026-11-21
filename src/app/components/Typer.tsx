"use client";

import { useEffect, useState } from "react";
import { useLang } from "../i18n";

// Picks the phrase list for the current language and restarts typing when it changes.
export function Typer({ phrases, phrasesTh }: { phrases: string[]; phrasesTh?: string[] }) {
  const { lang } = useLang();
  const list = lang === "th" && phrasesTh ? phrasesTh : phrases;
  return <TyperLoop key={lang} phrases={list} />;
}

// Types each phrase, holds it, deletes it, then moves to the next one.
function TyperLoop({ phrases }: { phrases: string[] }) {
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
