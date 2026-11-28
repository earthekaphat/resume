"use client";

import { useEffect, useRef, useState } from "react";
import { HEAD_CATEGORIES } from "../data/headWords";
import { useLang } from "../i18n";

// "Head Rush" — one player holds the phone on their forehead, everyone else
// gives clues, and the player guesses as many words as they can before time runs out.

type Settings = { players: string[]; cats: string[]; seconds: number; tilt: boolean };
type Card = { cat: string; th: string; en: string };
type Log = { card: Card; ok: boolean };
type Phase = "setup" | "handoff" | "countdown" | "play" | "turnEnd" | "final";

const STORE = "earth-head-settings";
const MAX_PLAYERS = 10;
const DEFAULT: Settings = { players: ["", ""], cats: ["animals"], seconds: 60, tilt: false };
const CAT = new Map(HEAD_CATEGORIES.map((c) => [c.id, c]));

function randomIndex(n: number) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// Tiny beeps without any audio files.
let audio: AudioContext | null = null;
function beep(freq: number, ms: number, type: OscillatorType = "sine", gain = 0.15) {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + ms / 1000);
  } catch {}
}
const sound = {
  ok: () => (beep(880, 120, "triangle"), setTimeout(() => beep(1320, 180, "triangle"), 110)),
  pass: () => beep(220, 220, "sawtooth", 0.08),
  tick: () => beep(1000, 60, "square", 0.05),
  go: () => beep(660, 250, "triangle"),
  end: () => (beep(300, 300, "sawtooth", 0.1), setTimeout(() => beep(200, 500, "sawtooth", 0.1), 280)),
};
const buzz = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {}
};

// Which way the screen faces: +1 up at the ceiling, -1 down at the floor, ~0 upright.
function screenUp(beta: number, gamma: number) {
  const r = Math.PI / 180;
  return Math.cos(beta * r) * Math.cos(gamma * r);
}

export function HeadGuess({ onExit, initialNames = [] }: { onExit: () => void; initialNames?: string[] }) {
  const { t, lang } = useLang();
  const [s, setS] = useState<Settings>(DEFAULT);
  const [phase, setPhase] = useState<Phase>("setup");
  const [deck, setDeck] = useState<Card[]>([]);
  const [pos, setPos] = useState(0);
  const [turn, setTurn] = useState(0); // one turn per player
  const [scores, setScores] = useState<number[]>([]);
  const [log, setLog] = useState<Log[]>([]);
  const [left, setLeft] = useState(0);
  const [count, setCount] = useState(3);
  const [flash, setFlash] = useState<"ok" | "pass" | null>(null);
  const [rules, setRules] = useState(false);
  const loaded = useRef(false);
  const endAt = useRef(0);
  const locked = useRef(false);
  const tiltArmed = useRef(true);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const firstNames = useRef(initialNames);
  const topRef = useRef<HTMLDivElement>(null);

  // Bring the next screen into view after the full-screen stage closes.
  useEffect(() => {
    if (phase === "handoff" || phase === "turnEnd" || phase === "final") topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [phase]);

  // Restore the last setup; fill names from the two-player games if empty.
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORE) || "null") as Settings | null;
        if (saved && Array.isArray(saved.players)) {
          setS({ players: saved.players, seconds: saved.seconds ?? DEFAULT.seconds, tilt: !!saved.tilt, cats: saved.cats.filter((c) => CAT.has(c)).slice(0, 1) });
        } else if (firstNames.current.some((n) => n.trim())) setS((v) => ({ ...v, players: firstNames.current.slice(0, 2) }));
      } catch {}
      loaded.current = true;
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(s));
    } catch {}
  }, [s]);

  const players = s.players.map((n, i) => n.trim() || t(`Player ${i + 1}`, `ผู้เล่น ${i + 1}`));
  const n = players.length;
  const who = turn % n;
  const totalTurns = n;
  const pool = s.cats.reduce((a, c) => a + (CAT.get(c)?.words.length ?? 0), 0);
  const card = deck[pos];

  /* ---------- game flow ---------- */

  function startGame() {
    const cards: Card[] = [];
    for (const id of s.cats) for (const [th, en] of CAT.get(id)?.words ?? []) cards.push({ cat: id, th, en });
    setDeck(shuffle(cards));
    setPos(0);
    setTurn(0);
    setScores(players.map(() => 0));
    nextTurnSetup();
  }

  function nextTurnSetup() {
    setLog([]);
    setPhase("handoff");
  }

  async function begin() {
    // Must happen inside the tap: sound unlock, motion permission on iPhone, keep the screen on.
    beep(1, 1, "sine", 0.0001);
    if (s.tilt) {
      const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
      try {
        if (DOE?.requestPermission && (await DOE.requestPermission()) !== "granted") setS((v) => ({ ...v, tilt: false }));
      } catch {
        setS((v) => ({ ...v, tilt: false }));
      }
    }
    try {
      wake.current = await (navigator as unknown as { wakeLock?: { request: (k: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null;
    } catch {}
    setCount(3);
    setPhase("countdown");
  }

  // 3-2-1 then go.
  useEffect(() => {
    if (phase !== "countdown") return;
    const id = window.setTimeout(() => {
      if (count > 1) {
        sound.tick();
        setCount(count - 1);
      } else {
        sound.go();
        endAt.current = Date.now() + s.seconds * 1000;
        setLeft(s.seconds);
        locked.current = false;
        tiltArmed.current = false;
        setPhase("play");
      }
    }, 800);
    return () => clearTimeout(id);
  }, [phase, count, s.seconds]);

  // The turn clock.
  useEffect(() => {
    if (phase !== "play") return;
    let last = -1;
    const id = window.setInterval(() => {
      const sec = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      if (sec !== last) {
        last = sec;
        setLeft(sec);
        if (sec > 0 && sec <= 5) sound.tick();
      }
      if (sec <= 0) {
        clearInterval(id);
        sound.end();
        buzz([200, 100, 400]);
        wake.current?.release().catch(() => {});
        wake.current = null;
        setPhase("turnEnd");
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  function answer(ok: boolean) {
    if (phase !== "play" || locked.current || !card) return;
    locked.current = true;
    if (ok) {
      sound.ok();
      buzz(60);
    } else {
      sound.pass();
      buzz([30, 40, 30]);
    }
    setLog((l) => [...l, { card, ok }]);
    setFlash(ok ? "ok" : "pass");
    window.setTimeout(() => {
      setFlash(null);
      // Reshuffle if a small deck ever runs out.
      if (pos + 1 < deck.length) setPos(pos + 1);
      else {
        setDeck(shuffle(deck));
        setPos(0);
      }
      locked.current = false;
    }, 650);
  }

  // Tilt: screen to the floor = got it, screen to the ceiling = pass. Must come back upright in between.
  const answerRef = useRef(answer);
  useEffect(() => {
    answerRef.current = answer;
  });
  useEffect(() => {
    if (phase !== "play" || !s.tilt) return;
    const on = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const up = screenUp(e.beta, e.gamma);
      if (Math.abs(up) < 0.35) tiltArmed.current = true;
      else if (tiltArmed.current && Math.abs(up) > 0.7) {
        tiltArmed.current = false;
        answerRef.current(up < 0);
      }
    };
    window.addEventListener("deviceorientation", on);
    return () => window.removeEventListener("deviceorientation", on);
  }, [phase, s.tilt]);

  function confirmTurn() {
    const got = log.filter((x) => x.ok).length;
    const next = [...scores];
    next[who] += got;
    setScores(next);
    if (turn + 1 >= totalTurns) {
      setPhase("final");
      return;
    }
    setTurn(turn + 1);
    nextTurnSetup();
  }

  function quit() {
    wake.current?.release().catch(() => {});
    wake.current = null;
    setPhase("setup");
  }

  /* ---------- setup helpers ---------- */

  const setPlayer = (i: number, v: string) => setS((x) => ({ ...x, players: x.players.map((p, j) => (j === i ? v : p)) }));
  // One category per game.
  const pickCat = (id: string) => setS((x) => ({ ...x, cats: [id] }));
  const word = (c: Card) => (lang === "th" ? c.th : c.en);
  const otherWord = (c: Card) => (lang === "th" ? c.en : c.th);
  const catName = (id: string) => {
    const c = CAT.get(id);
    return c ? `${c.icon} ${t(c.en, c.th)}` : "";
  };

  /* ---------- views ---------- */

  if (phase === "play" || phase === "countdown") {
    return (
      <div className={`hg-stage${flash ? ` is-${flash}` : ""}`} role="application" aria-label={t("Guessing screen", "หน้าจอเกม")}>
        {phase === "countdown" ? (
          <div className="hg-count" key={count}>
            {count}
          </div>
        ) : (
          <>
            <div className="hg-top">
              <span className="hg-cat">{card && catName(card.cat)}</span>
              <span className={`hg-time mono${left <= 5 ? " is-low" : ""}`}>{left}</span>
              <span className="hg-score mono">✓ {log.filter((x) => x.ok).length}</span>
            </div>
            <i className="hg-bar" style={{ transform: `scaleX(${left / s.seconds})` }} aria-hidden />
            <div className="hg-word" aria-live="assertive">
              {flash === "ok" ? (
                <b>{t("Got it!", "ถูก!")}</b>
              ) : flash === "pass" ? (
                <b>{t("Pass", "ผ่าน")}</b>
              ) : card ? (
                <>
                  <b key={pos}>{word(card)}</b>
                  <span>{otherWord(card)}</span>
                </>
              ) : null}
            </div>
            <button type="button" className="hg-tap hg-tap--pass" onClick={() => answer(false)} aria-label={t("Pass", "ผ่าน")}>
              <span>✗ {t("Pass", "ผ่าน")}</span>
            </button>
            <button type="button" className="hg-tap hg-tap--ok" onClick={() => answer(true)} aria-label={t("Got it", "ถูก")}>
              <span>✓ {t("Got it", "ถูก")}</span>
            </button>
            <p className="hg-help mono">{s.tilt ? t("Tilt down = got it · tilt up = pass · or tap", "ก้มลง = ถูก · เงยขึ้น = ผ่าน · หรือแตะจอ") : t("Tap right = got it · tap left = pass", "แตะขวา = ถูก · แตะซ้าย = ผ่าน")}</p>
            <button type="button" className="hg-quit" onClick={quit} aria-label={t("Stop the game", "หยุดเกม")}>
              ✕
            </button>
          </>
        )}
      </div>
    );
  }

  if (phase === "handoff") {
    return (
      <div className="game hg-screen" ref={topRef}>
        <Scores players={players} scores={scores} current={who} t={t} />
        <div className="game-card handoff hg-handoff">
          <span className="handoff-phone" aria-hidden>
            🤳
          </span>
          <p className="mono muted">
            {t(`Turn ${turn + 1} of ${totalTurns}`, `ตาที่ ${turn + 1} จาก ${totalTurns}`)}
          </p>
          <p className="turn-banner">
            {t("Pass the phone to ", "ส่งมือถือให้ ")}
            <b>{players[who]}</b>
          </p>
          <ol className="hg-steps">
            <li>{t("Hold it on your forehead, screen facing your friends. Don’t peek!", "ยกมือถือแปะหน้าผาก หันจอให้เพื่อนเห็น ห้ามแอบดู!")}</li>
            <li>{t("Friends: give clues any way you like, just never say the word itself.", "เพื่อน: ใบ้ยังไงก็ได้ แต่ห้ามพูดคำนั้นตรงๆ")}</li>
            <li>{s.tilt ? t("Got it? Tip your head down. Stuck? Tip it up to pass.", "ทายถูก ก้มหัวลง · ไม่รู้ เงยหัวขึ้นเพื่อผ่าน") : t("Friends tap: right side = got it, left side = pass.", "เพื่อนช่วยแตะ: ขวา = ถูก · ซ้าย = ผ่าน")}</li>
          </ol>
          <div className="game-actions">
            <button type="button" className="btn btn--primary" onClick={begin}>
              {t(`I’m ${players[who]}, start ${s.seconds}s`, `ฉันคือ ${players[who]} เริ่ม ${s.seconds} วิ`)}
            </button>
            <button type="button" className="btn btn--text" onClick={quit}>
              {t("Back to setup", "กลับไปตั้งค่า")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "turnEnd") {
    const got = log.filter((x) => x.ok).length;
    return (
      <div className="game hg-screen" ref={topRef}>
        <div className="game-card result-card hg-end">
          <p className="mono muted">{t("Time’s up!", "หมดเวลา!")}</p>
          <p className="result-big hg-got">
            {players[who]} +{got}
          </p>
          <p className="muted hg-fixhint">{t("Tap a word to fix a mistake.", "แตะคำเพื่อแก้ ถ้ากดผิด")}</p>
          <ul className="hg-log">
            {log.map((x, i) => (
              <li key={i}>
                <button type="button" className={x.ok ? "is-ok" : "is-pass"} onClick={() => setLog((l) => l.map((y, j) => (j === i ? { ...y, ok: !y.ok } : y)))}>
                  <span aria-hidden>{x.ok ? "✓" : "✗"}</span> {word(x.card)}
                </button>
              </li>
            ))}
            {log.length === 0 && <li className="muted">{t("No words this turn.", "ตานี้ไม่ได้สักคำ")}</li>}
          </ul>
          <div className="game-actions">
            <button type="button" className="btn btn--primary" onClick={confirmTurn}>
              {turn + 1 >= totalTurns ? t("See the results", "ดูผลรวม") : t(`Next: ${players[(turn + 1) % n]}`, `ต่อไป: ${players[(turn + 1) % n]}`)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "final") {
    const rank = players.map((p, i) => ({ p, sc: scores[i] })).sort((a, b) => b.sc - a.sc);
    const top = rank[0].sc;
    const bottom = rank[rank.length - 1].sc;
    const losers = rank.filter((r) => r.sc === bottom && bottom !== top);
    return (
      <div className="game hg-screen" ref={topRef}>
        <div className="game-card result-card">
          <p className="mono muted">{t("Final scores", "สรุปคะแนน")}</p>
          {losers.length > 0 ? (
            <p className="result-big">{t(`${losers.map((l) => l.p).join(" & ")} lose${losers.length === 1 ? "s" : ""}!`, `${losers.map((l) => l.p).join(" กับ ")} แพ้!`)}</p>
          ) : (
            <p className="result-big">{t("Everyone tied!", "เสมอกันหมด!")}</p>
          )}
          <ol className="hg-rank">
            {rank.map((r, i) => (
              <li key={r.p + i} className={r.sc === top ? "is-top" : r.sc === bottom && bottom !== top ? "is-bottom" : undefined}>
                <span>{r.sc === top ? "👑" : r.sc === bottom && bottom !== top ? "💀" : `${i + 1}.`}</span>
                <b>{r.p}</b>
                <span className="mono">{r.sc}</span>
              </li>
            ))}
          </ol>
          <div className="game-actions">
            <button type="button" className="btn btn--primary" onClick={startGame}>
              {t("Play again", "เล่นอีกรอบ")}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setPhase("setup")}>
              {t("Change setup", "เปลี่ยนการตั้งค่า")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // setup
  const canStart = n >= 2 && s.cats.length > 0;
  return (
    <div className="game hg">
      <div className="hg-hero">
        <span className="hg-hero__phone" aria-hidden>
          <i>🐘</i>
        </span>
        <div>
          <p className="tile__kicker mono">{t("party · 2–10 players", "ปาร์ตี้ · 2–10 คน")}</p>
          <h2>{t("Head Rush", "ทายไวบนหัว")}</h2>
          <p className="muted">{t("Phone on your forehead, friends give clues, guess as many as you can.", "แปะมือถือบนหน้าผาก ให้เพื่อนใบ้ แล้วทายให้ได้มากที่สุด")}</p>
        </div>
      </div>

      <button type="button" className={`hg-rules-toggle${rules ? " is-open" : ""}`} onClick={() => setRules(!rules)} aria-expanded={rules}>
        {t("How to play", "วิธีเล่น")} <span aria-hidden>{rules ? "−" : "+"}</span>
      </button>
      {rules && (
        <div className="game-card hg-rules">
          <ol>
            <li>{t("Add everyone’s name and pick one category.", "ใส่ชื่อทุกคน แล้วเลือกหมวดคำ 1 หมวด")}</li>
            <li>{t("On your turn, hold the phone on your forehead with the screen facing out. You can’t see the word, everyone else can.", "ถึงตาใคร ให้แปะมือถือบนหน้าผาก หันจอออก ตัวเองมองไม่เห็นคำ แต่คนอื่นเห็น")}</li>
            <li>{t("Friends give clues any way they like, but never say the word itself.", "เพื่อนช่วยใบ้ยังไงก็ได้ แต่ห้ามพูดคำนั้นตรงๆ")}</li>
            <li>{t("Guess right → tilt down or tap right. Stuck → tilt up or tap left to skip.", "ทายถูก → ก้มลงหรือแตะขวา · ไม่รู้ → เงยขึ้นหรือแตะซ้ายเพื่อข้าม")}</li>
            <li>{t("Each right guess is 1 point. When time runs out, pass the phone on.", "ทายถูกได้ 1 คะแนน หมดเวลาแล้วส่งมือถือให้คนต่อไป")}</li>
            <li>{t("Most points wins 👑, fewest points loses 💀 and gets the punishment.", "คะแนนมากสุดชนะ 👑 น้อยสุดแพ้ 💀 โดนทำโทษ")}</li>
          </ol>
          <p className="muted">{t("Silly categories are things like “things with holes”: sponge, Swiss cheese, your nose… Good luck.", "หมวดฮาๆ เช่น “อะไรมีรู” ฟองน้ำ ชีส จมูก… ใบ้กันให้รอด")}</p>
        </div>
      )}

      <div className="game-card">
        <div className="hg-head">
          <span className="mono muted">{t(`Players (${n})`, `ผู้เล่น (${n})`)}</span>
        </div>
        <div className="hg-players">
          {s.players.map((p, i) => (
            <div key={i} className="hg-player">
              <span className="hg-player__no mono">{i + 1}</span>
              <input id={`hg-player-${i}`} value={p} maxLength={16} placeholder={t(`Player ${i + 1}`, `ผู้เล่น ${i + 1}`)} onChange={(e) => setPlayer(i, e.target.value)} />
              {n > 2 && (
                <button type="button" onClick={() => setS((x) => ({ ...x, players: x.players.filter((_, j) => j !== i) }))} aria-label={t(`Remove player ${i + 1}`, `ลบผู้เล่น ${i + 1}`)}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {n < MAX_PLAYERS && (
          <button type="button" className="btn btn--ghost hg-add" onClick={() => setS((x) => ({ ...x, players: [...x.players, ""] }))}>
            {t("＋ Add player", "＋ เพิ่มผู้เล่น")}
          </button>
        )}
      </div>

      {(["basic", "silly"] as const).map((g) => (
        <div key={g} className="game-card">
          <div className="hg-head">
            <span className="mono muted">{g === "basic" ? t("Basic categories · pick one", "หมวดเบสิก · เลือก 1 หมวด") : t("Silly categories · pick one", "หมวดฮาๆ กวนๆ · เลือก 1 หมวด")}</span>
          </div>
          <div className="hg-cats">
            {HEAD_CATEGORIES.filter((c) => c.group === g).map((c) => {
              const on = s.cats.includes(c.id);
              return (
                <button key={c.id} type="button" className={`hg-catbtn${on ? " is-on" : ""}${g === "silly" ? " is-silly" : ""}`} role="radio" aria-checked={on} onClick={() => pickCat(c.id)}>
                  <span className="hg-catbtn__icon" aria-hidden>
                    {c.icon}
                  </span>
                  <b>{t(c.en, c.th)}</b>
                  <span className="mono">{t(`${c.words.length} words`, `${c.words.length} คำ`)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="game-card hg-opts">
        <Opt label={t("Time per turn", "เวลาต่อตา")} value={s.seconds} options={[45, 60, 90, 120].map((v) => ({ v, label: t(`${v}s`, `${v} วิ`) }))} onChange={(v) => setS((x) => ({ ...x, seconds: v }))} />
        <Opt
          label={t("Controls", "การควบคุม")}
          value={s.tilt}
          options={[
            { v: false, label: t("👆 Tap", "👆 แตะจอ") },
            { v: true, label: t("📱 Tilt + tap", "📱 เอียง + แตะ") },
          ]}
          onChange={(v) => setS((x) => ({ ...x, tilt: v }))}
        />
      </div>

      <div className="game-actions hg-start">
        <button type="button" className="btn btn--primary" disabled={!canStart} onClick={startGame}>
          {canStart ? t(`Start · ${pool} words`, `เริ่มเล่น · ${pool} คำ`) : t("Pick a category", "เลือกหมวดก่อน")}
        </button>
        <button type="button" className="btn btn--text" onClick={onExit}>
          {t("Other games", "เกมอื่น")}
        </button>
      </div>
    </div>
  );
}

function Opt<V extends string | number | boolean>({ label, value, options, onChange }: { label: string; value: V; options: { v: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <div className="hg-opt">
      <span className="mono muted">{label}</span>
      <div className="hg-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? "is-on" : undefined} onClick={() => onChange(o.v)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Scores({ players, scores, current, t }: { players: string[]; scores: number[]; current: number; t: (en: string, th: string) => string }) {
  return (
    <ul className="hg-scores" aria-label={t("Scores", "คะแนน")}>
      {players.map((p, i) => (
        <li key={i} className={i === current ? "is-turn" : undefined}>
          <span>{p}</span>
          <b className="mono">{scores[i] ?? 0}</b>
        </li>
      ))}
    </ul>
  );
}
