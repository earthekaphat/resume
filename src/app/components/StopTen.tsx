"use client";

import { useEffect, useRef, useState } from "react";

const TARGET = 10;
const VISIBLE_FOR = 3; // seconds the clock is shown before it hides

type Props = {
  names: [string, string];
  onDone: (loser: 0 | 1 | null, detail: string) => void;
};

const fmt = (t: number) => t.toFixed(2);
const signed = (d: number) => `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(2)}`;

// Each player starts a stopwatch, the digits vanish after 3 s, and they stop it
// as close to 10.00 s as they can. Farthest from 10.00 loses.
export function StopTen({ names, onDone }: Props) {
  const [player, setPlayer] = useState<0 | 1>(0);
  const [phase, setPhase] = useState<"intro" | "running" | "stopped">("intro");
  const [shown, setShown] = useState("0.00");
  const [times, setTimes] = useState<[number | null, number | null]>([null, null]);
  const t0 = useRef(0);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function start() {
    t0.current = performance.now();
    setShown("0.00");
    setPhase("running");
    const tick = () => {
      const s = (performance.now() - t0.current) / 1000;
      if (s >= VISIBLE_FOR) {
        setShown("??.??");
        return;
      }
      setShown(fmt(s));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(raf.current);
    const s = (performance.now() - t0.current) / 1000;
    const next: [number | null, number | null] = [times[0], times[1]];
    next[player] = s;
    setTimes(next);
    setPhase("stopped");
  }

  function nextPlayer() {
    setPlayer(1);
    setPhase("intro");
  }

  function reveal() {
    const [a, b] = times as [number, number];
    const da = Math.abs(a - TARGET);
    const db = Math.abs(b - TARGET);
    const loser = Math.abs(da - db) < 0.005 ? null : da > db ? 0 : 1;
    onDone(loser, `${names[0]} ${fmt(a)} s (${signed(a - TARGET)}) · ${names[1]} ${fmt(b)} s (${signed(b - TARGET)})`);
  }

  if (phase === "intro") {
    return (
      <div className="game-card handoff">
        <span className="handoff-phone" aria-hidden>
          ⏱️
        </span>
        <p className="turn-banner">
          <b>{names[player]}</b>, stop the clock at exactly 10.00
        </p>
        <p className="muted">The digits disappear after 3 seconds. Count the rest in your head.</p>
        <button type="button" className="btn btn--primary" onClick={start}>
          Start
        </button>
      </div>
    );
  }

  if (phase === "running") {
    return (
      <div className="game-card stopten">
        <p className="turn-banner">
          <b>{names[player]}</b>
        </p>
        <p className={`stopten__clock mono${shown === "??.??" ? " is-hidden" : ""}`} aria-live="off">
          {shown}
        </p>
        <button type="button" className="stopten__btn" onClick={stop}>
          STOP
        </button>
      </div>
    );
  }

  return (
    <div className="game-card handoff">
      <span className="handoff-phone" aria-hidden>
        🔒
      </span>
      <p className="turn-banner">Locked in. No peeking at the time yet.</p>
      {player === 0 ? (
        <>
          <p className="muted">Pass the phone to {names[1]}.</p>
          <button type="button" className="btn btn--primary" onClick={nextPlayer}>
            I’m {names[1]}, ready
          </button>
        </>
      ) : (
        <button type="button" className="btn btn--primary" onClick={reveal}>
          Reveal both times
        </button>
      )}
    </div>
  );
}
