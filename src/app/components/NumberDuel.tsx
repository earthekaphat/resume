"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n";
import { HeadGuess } from "./HeadGuess";
import { ReactionDuel } from "./ReactionDuel";
import { StopTen } from "./StopTen";

type Mode = "duel" | "bomb" | "stop" | "react" | "head";
type Hint = "high" | "low" | "hit";
type Guess = { n: number; res: Hint };
type Result = { loser: 0 | 1 | null; mode: Mode; detail?: string };

const DUEL_MAX = 30;
const BOMB_MAX = 10;
const DUEL_NUMS = Array.from({ length: DUEL_MAX }, (_, i) => i + 1);
const BOMB_NUMS = Array.from({ length: BOMB_MAX }, (_, i) => i + 1);
const STORE = "earth-game-names";

// Unbiased random integer in [0, n) from the Web Crypto API.
function randomIndex(n: number) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

const other = (p: 0 | 1): 0 | 1 => (p === 0 ? 1 : 0);

// Numbers still possible for a secret after a player's higher/lower hints.
function rangeOf(gs: Guess[]) {
  let lo = 1,
    hi = DUEL_MAX;
  for (const g of gs) {
    if (g.res === "high") hi = Math.min(hi, g.n - 1);
    if (g.res === "low") lo = Math.max(lo, g.n + 1);
  }
  return [lo, hi] as const;
}

export function NumberDuel() {
  const { t } = useLang();
  const [names, setNames] = useState<[string, string]>(["", ""]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [wins, setWins] = useState<[number, number]>([0, 0]);

  // duel state
  const [step, setStep] = useState<"handoff" | "secret" | "guess" | "result">("handoff");
  const [picker, setPicker] = useState<0 | 1>(0);
  const [draft, setDraft] = useState<number | null>(null);
  const [secrets, setSecrets] = useState<[number | null, number | null]>([null, null]);
  const [guesses, setGuesses] = useState<[Guess[], Guess[]]>([[], []]);
  const [starter, setStarter] = useState<0 | 1>(0);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [finalChance, setFinalChance] = useState(false);
  const [flash, setFlash] = useState<{ who: 0 | 1; g: Guess } | null>(null);

  // bomb state
  const [bomb, setBomb] = useState(0);
  const [picked, setPicked] = useState<{ who: 0 | 1; n: number }[]>([]);
  const [boom, setBoom] = useState(false);

  const [result, setResult] = useState<Result | null>(null);
  const [round, setRound] = useState(0);
  const loaded = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORE) || "null");
        // Old saves stored the default labels; treat those as empty so they follow the language.
        const clean = (v: unknown) => (/^(Player|ผู้เล่น) [12]$/.test(String(v)) ? "" : String(v));
        if (Array.isArray(saved) && saved.length === 2) setNames([clean(saved[0]), clean(saved[1])]);
      } catch {}
      loaded.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(names));
    } catch {}
  }, [names]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const nameOf = (p: 0 | 1) => names[p].trim() || t(`Player ${p + 1}`, `ผู้เล่น ${p + 1}`);

  function finish(loser: 0 | 1 | null, m: Mode, detail?: string) {
    setResult({ loser, mode: m, detail });
    if (loser !== null) {
      setWins((w) => {
        const next: [number, number] = [w[0], w[1]];
        next[other(loser)] += 1;
        return next;
      });
    }
  }

  function startDuel() {
    const first = randomIndex(2) as 0 | 1;
    setMode("duel");
    setStep("handoff");
    setPicker(0);
    setDraft(null);
    setSecrets([null, null]);
    setGuesses([[], []]);
    setStarter(first);
    setTurn(first);
    setFinalChance(false);
    setFlash(null);
    setResult(null);
  }

  function startBomb() {
    setMode("bomb");
    setBomb(randomIndex(BOMB_MAX) + 1);
    setPicked([]);
    setBoom(false);
    setTurn(randomIndex(2) as 0 | 1);
    setResult(null);
  }

  function lockSecret() {
    if (draft === null) return;
    const next: [number | null, number | null] = [secrets[0], secrets[1]];
    next[picker] = draft;
    setSecrets(next);
    setDraft(null);
    if (picker === 0) {
      setPicker(1);
      setStep("handoff");
    } else setStep("guess");
  }

  // Player `turn` guesses the other player's secret. Rounds are fair: if the
  // starter hits, the second player still gets that round's turn.
  function guess(n: number) {
    if (flash) return;
    const target = secrets[other(turn)];
    if (target === null) return;
    const res: Hint = n === target ? "hit" : n > target ? "high" : "low";
    const g = { n, res };
    const next: [Guess[], Guess[]] = [guesses[0], guesses[1]];
    next[turn] = [...next[turn], g];
    setGuesses(next);
    setFlash({ who: turn, g });
    timers.current.push(
      window.setTimeout(() => {
        setFlash(null);
        const isStarter = turn === starter;
        if (res === "hit") {
          if (isStarter) {
            setFinalChance(true);
            setTurn(other(turn));
          } else if (finalChance) {
            setStep("result");
            finish(null, "duel");
          } else {
            setStep("result");
            finish(other(turn), "duel");
          }
        } else if (finalChance) {
          setStep("result");
          finish(turn, "duel");
        } else setTurn(other(turn));
      }, 1100),
    );
  }

  function pickBomb(n: number) {
    if (boom || result) return;
    setPicked((p) => [...p, { who: turn, n }]);
    if (n === bomb) {
      setBoom(true);
      timers.current.push(window.setTimeout(() => finish(turn, "bomb"), 900));
      return;
    }
    setTurn(other(turn));
  }

  // Stop at 10.00 and Reaction Duel keep their own state; a new key remounts them.
  function startQuick(m: "stop" | "react") {
    setMode(m);
    setRound((r) => r + 1);
    setResult(null);
  }

  function rematch() {
    if (result?.mode === "bomb") startBomb();
    else if (result?.mode === "stop" || result?.mode === "react") startQuick(result.mode);
    else startDuel();
  }

  /* ---------- views ---------- */

  const scoreboard = (
    <div className="duel-score mono" aria-label="Score">
      <span>{nameOf(0)}</span>
      <b>
        {wins[0]} : {wins[1]}
      </b>
      <span>{nameOf(1)}</span>
    </div>
  );

  if (!mode) {
    return (
      <div className="game">
        <div className="game-card game-setup">
          <div className="name-row">
            {[0, 1].map((i) => (
              <label key={i} className="name-field">
                <span className="mono muted">{t(`Player ${i + 1}`, `ผู้เล่น ${i + 1}`)}</span>
                <input
                  id={`player-${i}`}
                  value={names[i]}
                  placeholder={t(`Player ${i + 1}`, `ผู้เล่น ${i + 1}`)}
                  maxLength={16}
                  onChange={(e) => {
                    const v: [string, string] = [names[0], names[1]];
                    v[i] = e.target.value;
                    setNames(v);
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="modes">
          <button type="button" className="mode-card mode-card--head" onClick={() => setMode("head")}>
            <span className="tile__kicker mono">{t("party · 2–10 players · new", "ปาร์ตี้ · 2–10 คน · ใหม่")}</span>
            <b>{t("What’s on my head?", "อะไรอยู่บนหัว?")}</b>
            <span className="muted">{t("Phone on your forehead, friends give clues. Over 1,200 words in 26 categories, from animals to “things with holes”.", "แปะมือถือบนหน้าผาก ให้เพื่อนใบ้ มีมากกว่า 1,200 คำใน 26 หมวด ตั้งแต่สัตว์ไปจนถึง “อะไรมีรู”")}</span>
            <span className="mode-art mono" aria-hidden>
              <i>🤳</i>
              <i>🧀</i>
              <i>🦨</i>
            </span>
          </button>
          <button type="button" className="mode-card mode-card--stop" onClick={() => startQuick("stop")}>
            <span className="tile__kicker mono">{t("quick · new", "เกมสั้น · ใหม่")}</span>
            <b>{t("Stop at 10.00", "หยุดเวลา 10.00")}</b>
            <span className="muted">{t("Start the clock, the digits vanish after 3 seconds, and you stop it by feel. Farthest from 10.00 loses.", "กดเริ่มนาฬิกา ตัวเลขจะหายไปหลัง 3 วินาที แล้วนับในใจกดหยุดให้ตรงที่สุด ใครห่างจาก 10.00 มากสุดแพ้")}</span>
            <span className="mode-art mono" aria-hidden>
              <i>9.</i>
              <i>??</i>
              <i>⏱</i>
            </span>
          </button>
          <button type="button" className="mode-card mode-card--react" onClick={() => startQuick("react")}>
            <span className="tile__kicker mono">{t("quick · new", "เกมสั้น · ใหม่")}</span>
            <b>{t("Reaction Duel", "ดวลความไว")}</b>
            <span className="muted">{t("Phone flat between you, one half each. Tap your side the moment it turns green. Tap early and you lose.", "วางมือถือไว้ตรงกลาง คนละครึ่งจอ จอเขียวเมื่อไหร่ให้แตะฝั่งตัวเองให้ไวที่สุด แตะก่อนจอเขียวแพ้ทันที")}</span>
            <span className="mode-art mono" aria-hidden>
              <i className="art-red" />
              <i className="art-green" />
              <i>⚡</i>
            </span>
          </button>
          <button type="button" className="mode-card" onClick={startDuel}>
            <span className="tile__kicker mono">{t("mode 1", "โหมด 1")}</span>
            <b>{t("Mind Duel", "ทายใจ")}</b>
            <span className="muted">
              {t("Each player secretly locks in a number from 1 to 30, then you take turns guessing the other’s. The app says too high or too low. First to guess right wins.", "ต่างคนต่างแอบล็อกเลข 1–30 แล้วผลัดกันทายเลขของอีกฝ่าย แอปบอกว่าสูงไปหรือต่ำไป ใครทายถูกก่อนชนะ")}
            </span>
            <span className="mode-art mono" aria-hidden>
              <i>?</i>
              <i>↑</i>
              <i>↓</i>
            </span>
          </button>
          <button type="button" className="mode-card mode-card--bomb" onClick={startBomb}>
            <span className="tile__kicker mono">{t("mode 2", "โหมด 2")}</span>
            <b>{t("Number Bomb", "เลขระเบิด")}</b>
            <span className="muted">{t("The app hides a bomb under one number. Take turns picking; each number can be picked once. Whoever hits the bomb loses.", "แอปซ่อนระเบิดไว้ใต้เลข 1 ตัว ผลัดกันเลือกเลข เลขละครั้ง ใครเปิดโดนระเบิดแพ้")}</span>
            <span className="mode-art mono" aria-hidden>
              <i>4</i>
              <i>💣</i>
              <i>8</i>
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    const tie = result.loser === null;
    return (
      <div className="game">
        <div className="game-card result-card">
          {tie ? (
            <>
              <p className="result-big">{t("It’s a tie!", "เสมอ!")}</p>
              <p className="muted">
                {result.mode === "duel" ? t("You both guessed right in the same round. Settle it with Number Bomb.", "ทายถูกในตาเดียวกันทั้งคู่ ตัดสินกันต่อด้วยเลขระเบิด") : t("Dead even. Go again.", "สูสีกันพอดี เล่นใหม่อีกตา")}
              </p>
            </>
          ) : (
            <>
              <p className="result-sub mono">🏆 {nameOf(other(result.loser as 0 | 1))} {t("wins", "ชนะ")}</p>
              <p className="result-big">{nameOf(result.loser as 0 | 1)} {t("loses", "แพ้")}</p>
            </>
          )}
          {result.mode === "duel" && secrets[0] !== null && secrets[1] !== null && (
            <p className="muted mono reveal">
              {t("Secret numbers", "เลขลับ")}: {nameOf(0)} = {secrets[0]} · {nameOf(1)} = {secrets[1]}
            </p>
          )}
          {result.mode === "bomb" && <p className="muted mono reveal">{t(`The bomb was under ${bomb}`, `ระเบิดอยู่ที่เลข ${bomb}`)}</p>}
          {result.detail && <p className="muted mono reveal">{result.detail}</p>}
          {scoreboard}
          <div className="game-actions">
            {tie && result.mode === "duel" ? (
              <button type="button" className="btn btn--primary" onClick={startBomb}>
                {t("Play Number Bomb", "ตัดสินด้วยเลขระเบิด")}
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={rematch}>
                {t("Play again", "เล่นอีกตา")}
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={() => setMode(null)}>
              {t("Change mode", "เปลี่ยนเกม")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "head") return <HeadGuess onExit={() => setMode(null)} initialNames={names} />;

  if (mode === "stop" || mode === "react") {
    const both: [string, string] = [nameOf(0), nameOf(1)];
    const done = (loser: 0 | 1 | null, detail: string) => finish(loser, mode, detail);
    return (
      <div className="game">
        {scoreboard}
        {mode === "stop" ? <StopTen key={round} names={both} onDone={done} /> : <ReactionDuel key={round} names={both} onDone={done} />}
      </div>
    );
  }

  if (mode === "bomb") {
    const used = new Set(picked.map((p) => p.n));
    return (
      <div className="game">
        {scoreboard}
        <div className={`game-card bomb-card${boom ? " is-boom" : ""}`}>
          <p className="turn-banner">
            {t("", "ตา ")}<b>{nameOf(turn)}</b>{t(", pick a number", " เลือกเลข")}
          </p>
          <p className="muted mono">
            {t(`The bomb is under one of the ${10 - used.size} numbers left`, `ระเบิดซ่อนอยู่ใต้เลขที่เหลือ ${10 - used.size} ตัว`)}
          </p>
          <div className="pad pad--bomb">
            {BOMB_NUMS.map((d) => {
              const out = used.has(d) && !(boom && d === bomb);
              const hit = boom && d === bomb;
              return (
                <button
                  key={d}
                  type="button"
                  className={`pad-key${out ? " is-out" : ""}${hit ? " is-bomb" : ""}`}
                  disabled={out || boom}
                  onClick={() => pickBomb(d)}
                  aria-label={t(`Number ${d}`, `เลข ${d}`)}
                >
                  {hit ? "💥" : d}
                </button>
              );
            })}
          </div>
          {picked.length > 0 && (
            <ol className="bomb-log mono">
              {picked.map((p, i) => (
                <li key={i}>
                  {nameOf(p.who)} → {p.n}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    );
  }

  // duel
  if (step === "handoff") {
    return (
      <div className="game">
        {scoreboard}
        <div className="game-card handoff">
          <span className="handoff-phone" aria-hidden>
            📱
          </span>
          <p className="turn-banner">
            {t("Pass the phone to ", "ส่งเครื่องให้ ")}<b>{nameOf(picker)}</b>
          </p>
          <p className="muted">{nameOf(other(picker))}{t(", look away. No peeking.", " หันไปทางอื่นก่อน ห้ามแอบดู")}</p>
          <button type="button" className="btn btn--primary" onClick={() => setStep("secret")}>
            {t(`I’m ${nameOf(picker)}, ready`, `ฉันคือ ${nameOf(picker)} พร้อมแล้ว`)}
          </button>
        </div>
      </div>
    );
  }

  if (step === "secret") {
    return (
      <div className="game">
        <div className="game-card">
          <p className="turn-banner">
            <b>{nameOf(picker)}</b>{t(", pick your secret number (1–30)", " แอบเลือกเลขลับ (1–30)")}
          </p>
          <div className="pad pad--30">
            {DUEL_NUMS.map((d) => (
              <button
                key={d}
                type="button"
                className={`pad-key${draft === d ? " is-picked" : ""}`}
                onClick={() => setDraft(d)}
                aria-pressed={draft === d}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="game-actions">
            <button type="button" className="btn btn--primary" disabled={draft === null} onClick={lockSecret}>
              {t("Lock it in and hide", "ล็อกเลขแล้วซ่อนจอ")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [lo, hi] = rangeOf(guesses[turn]);
  const tried = new Set(guesses[turn].map((g) => g.n));
  const hintText = (g: Guess) => (g.res === "hit" ? t("Correct!", "ถูก!") : g.res === "high" ? t("Too high ↓", "สูงไป ↓") : t("Too low ↑", "ต่ำไป ↑"));

  return (
    <div className="game">
      {scoreboard}
      <div className="game-card">
        <p className="turn-banner">
          {t("", "ตา ")}<b>{nameOf(turn)}</b>{t(`, guess ${nameOf(other(turn))}’s number`, ` ทายเลขของ ${nameOf(other(turn))}`)}
        </p>
        {finalChance && <p className="final-note">{t(`${nameOf(other(turn))} got it right. This is your last chance to tie!`, `${nameOf(other(turn))} ทายถูกแล้ว นี่คือโอกาสสุดท้ายที่จะเสมอ!`)}</p>}
        <div className="pad pad--30">
          {DUEL_NUMS.map((d) => {
            const out = d < lo || d > hi || tried.has(d);
            return (
              <button
                key={d}
                type="button"
                className={`pad-key${out ? " is-out" : ""}`}
                disabled={out || !!flash}
                onClick={() => guess(d)}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className={`flash${flash ? ` is-${flash.g.res}` : ""}`} role="status" aria-live="polite">
          {flash ? `${flash.g.n} · ${hintText(flash.g)}` : " "}
        </div>
        <div className="duel-logs">
          {[0, 1].map((p) => (
            <div key={p} className={`duel-log${turn === p ? " is-turn" : ""}`}>
              <span className="mono muted">{t(`${nameOf(p as 0 | 1)}’s guesses`, `${nameOf(p as 0 | 1)} ทาย`)}</span>
              <ol>
                {guesses[p].map((g, i) => (
                  <li key={i} className={`hint-${g.res}`}>
                    <b>{g.n}</b> {hintText(g)}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
