"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n";

type Props = {
  names: [string, string];
  onDone: (loser: 0 | 1 | null, detail: string) => void;
};

type Phase = "ready" | "wait" | "go" | "done";

// Kept outside the component so the React compiler treats them as event-time helpers.
const now = () => performance.now();
const randomWait = () => 1500 + Math.random() * 3500;

// Phone lies flat between two players, one half each. The screen turns from
// red to green at a random moment: first tap after green wins, any tap before
// green loses on the spot.
export function ReactionDuel({ names, onDone }: Props) {
  const { t } = useLang();
  const [phase, setPhase] = useState<Phase>("ready");
  const [note, setNote] = useState<{ who: 0 | 1; text: string } | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const goAt = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function set(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  function start() {
    set("wait");
    setNote(null);
    const delay = randomWait();
    timers.current.push(
      window.setTimeout(() => {
        goAt.current = now();
        set("go");
      }, delay),
    );
  }

  function tap(p: 0 | 1) {
    const current = phaseRef.current;
    if (current === "ready") {
      start();
    } else if (current === "wait") {
      timers.current.forEach(clearTimeout);
      set("done");
      setNote({ who: p, text: t("Too early!", "เร็วไป!") });
      timers.current.push(window.setTimeout(() => onDone(p, t(`${names[p]} tapped before green`, `${names[p]} แตะก่อนจอเขียว`)), 1100));
    } else if (current === "go") {
      const ms = Math.round(now() - goAt.current);
      set("done");
      setNote({ who: p, text: `${ms} ms` });
      const loser: 0 | 1 = p === 0 ? 1 : 0;
      timers.current.push(window.setTimeout(() => onDone(loser, t(`${names[p]} tapped first in ${ms} ms`, `${names[p]} แตะก่อนใน ${ms} มิลลิวินาที`)), 1100));
    }
  }

  const label = phase === "wait" ? t("Wait for green…", "รอจอเขียว…") : phase === "go" ? t("TAP!", "แตะ!") : phase === "done" ? "" : t("Tap to start", "แตะเพื่อเริ่ม");

  const half = (p: 0 | 1) => (
    <button
      type="button"
      className={`rd-half rd-half--${p}`}
      onPointerDown={(e) => {
        e.preventDefault();
        tap(p);
      }}
      aria-label={`${names[p]} tap area`}
    >
      <span className="rd-name">{names[p]}</span>
      <span className="rd-label">{note?.who === p ? note.text : label}</span>
    </button>
  );

  return (
    <div className="game-card rd-card">
      <div className={`rd-arena is-${phase}`}>
        {half(1)}
        {half(0)}
        {phase === "ready" && (
          <button type="button" className="btn btn--primary rd-start" onClick={start}>
            {t("Start round", "เริ่มรอบ")}
          </button>
        )}
      </div>
      <p className="muted rd-tip">{t(`Lay the phone flat between you. ${names[1]} takes the top half, ${names[0]} the bottom.`, `วางมือถือราบไว้ตรงกลาง ${names[1]} ใช้ครึ่งบน ${names[0]} ใช้ครึ่งล่าง`)}</p>
    </div>
  );
}
