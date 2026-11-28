"use client";

import { useEffect, useRef, useState } from "react";
import { HEAD_CATEGORIES } from "../data/headWords";
import { useLang } from "../i18n";

// "What am I?" — everyone has one secret word on their head for the whole game.
// Take turns asking one yes/no question about your own word; first to guess it wins.

type Device = "own" | "shared";
type Win = "first" | "last";
type Settings = { players: string[]; cats: string[]; device: Device; win: Win };
type Card = { cat: string; th: string; en: string };
type Phase = "setup" | "deal" | "play" | "guess" | "board" | "final" | "solo";

const STORE = "earth-ask-settings";
const MAX_PLAYERS = 10;
const DEFAULT: Settings = { players: ["", "", ""], cats: ["animals", "jobs", "fantasy"], device: "shared", win: "first" };
const CAT = new Map(HEAD_CATEGORIES.map((c) => [c.id, c]));

function randomIndex(n: number) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

function drawCards(cats: string[], n: number): Card[] {
  const all: Card[] = [];
  for (const id of cats) for (const [th, en] of CAT.get(id)?.words ?? []) all.push({ cat: id, th, en });
  const out: Card[] = [];
  while (out.length < n && all.length) out.push(all.splice(randomIndex(all.length), 1)[0]);
  return out;
}

export function HeadAsk({ onExit }: { onExit: () => void }) {
  const { t, lang } = useLang();
  const [s, setS] = useState<Settings>(DEFAULT);
  const [phase, setPhase] = useState<Phase>("setup");
  const [cards, setCards] = useState<Card[]>([]);
  const [dealIdx, setDealIdx] = useState(0);
  const [dealShown, setDealShown] = useState(false);
  const [turn, setTurn] = useState(0);
  const [asked, setAsked] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]); // player indexes in the order they got it
  const [peek, setPeek] = useState(false);
  const [boardFor, setBoardFor] = useState<number | null>(null);
  const [soloCard, setSoloCard] = useState<Card | null>(null);
  const [soloQ, setSoloQ] = useState(0);
  const [soloDone, setSoloDone] = useState(false);
  const loaded = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORE) || "null") as Settings | null;
        if (saved && Array.isArray(saved.players)) setS({ ...DEFAULT, ...saved, cats: saved.cats.filter((c) => CAT.has(c)) });
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

  useEffect(() => {
    if (phase !== "setup" && phase !== "solo") topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [phase, dealIdx, turn]);

  const players = s.players.map((n, i) => n.trim() || t(`Player ${i + 1}`, `ผู้เล่น ${i + 1}`));
  const n = players.length;
  const word = (c?: Card) => (c ? (lang === "th" ? c.th : c.en) : "");
  const otherWord = (c?: Card) => (c ? (lang === "th" ? c.en : c.th) : "");
  const catName = (id?: string) => {
    const c = id ? CAT.get(id) : undefined;
    return c ? `${c.icon} ${t(c.en, c.th)}` : "";
  };
  const isOut = (i: number) => solved.includes(i);

  async function keepAwake() {
    try {
      wake.current = (await (navigator as unknown as { wakeLock?: { request: (k: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen")) ?? null;
    } catch {}
  }
  function letSleep() {
    wake.current?.release().catch(() => {});
    wake.current = null;
  }

  /* ---------- flow ---------- */

  function start() {
    if (s.device === "own") {
      newSolo();
      keepAwake();
      setPhase("solo");
      return;
    }
    setCards(drawCards(s.cats, n));
    setDealIdx(0);
    setDealShown(false);
    setTurn(randomIndex(n));
    setAsked(players.map(() => 0));
    setSolved([]);
    setPhase("deal");
  }

  function nextDeal() {
    setDealShown(false);
    if (dealIdx + 1 < n) setDealIdx(dealIdx + 1);
    else setPhase("play");
  }

  function nextTurn(from = turn, out = solved) {
    for (let k = 1; k <= n; k++) {
      const j = (from + k) % n;
      if (!out.includes(j)) return j;
    }
    return from;
  }

  function askedOne() {
    setAsked((a) => a.map((v, i) => (i === turn ? v + 1 : v)));
    setTurn(nextTurn());
  }

  function judge(ok: boolean) {
    setPeek(false);
    if (!ok) {
      setAsked((a) => a.map((v, i) => (i === turn ? v + 1 : v)));
      setTurn(nextTurn());
      setPhase("play");
      return;
    }
    const out = [...solved, turn];
    setSolved(out);
    const left = n - out.length;
    if (s.win === "first" || left <= 1) setPhase("final");
    else {
      setTurn(nextTurn(turn, out));
      setPhase("play");
    }
  }

  function newSolo() {
    setSoloCard(drawCards(s.cats, 1)[0] ?? null);
    setSoloQ(0);
    setSoloDone(false);
  }

  /* ---------- setup helpers ---------- */

  const setPlayer = (i: number, v: string) => setS((x) => ({ ...x, players: x.players.map((p, j) => (j === i ? v : p)) }));
  const toggleCat = (id: string) => setS((x) => ({ ...x, cats: x.cats.includes(id) ? x.cats.filter((c) => c !== id) : [...x.cats, id] }));

  /* ---------- views ---------- */

  // One phone per person: the phone is the card on your forehead.
  if (phase === "solo") {
    return (
      <div className={`hg-stage ha-solo${soloDone ? " is-ok" : ""}`}>
        <div className="hg-top">
          <span className="hg-cat">{catName(soloCard?.cat)}</span>
          <span />
          <span className="hg-score mono">{t(`${soloQ} ${soloQ === 1 ? "question" : "questions"}`, `ถามไป ${soloQ} ข้อ`)}</span>
        </div>
        <div className="hg-word" aria-live="polite">
          {soloDone && <span>{t("🎉 You got it!", "🎉 ทายถูกแล้ว!")}</span>}
          <b key={word(soloCard ?? undefined)}>{word(soloCard ?? undefined)}</b>
          <span>{otherWord(soloCard ?? undefined)}</span>
        </div>
        <div className="ha-solo__bar">
          {soloDone ? (
            <button type="button" className="ha-pill" onClick={newSolo}>
              ↻ {t("New word", "คำใหม่")}
            </button>
          ) : (
            <>
              <button type="button" className="ha-pill" onClick={() => setSoloQ((q) => q + 1)}>
                ＋ {t("Asked one", "ถามแล้ว 1 ข้อ")}
              </button>
              <button type="button" className="ha-pill is-ok" onClick={() => setSoloDone(true)}>
                ✓ {t("Guessed it", "ทายถูก")}
              </button>
            </>
          )}
        </div>
        <p className="hg-help mono">{t("Hold it on your forehead. Friends tap ＋ after each question.", "แปะไว้บนหน้าผาก เพื่อนกด ＋ ทุกครั้งที่ถาม")}</p>
        <button
          type="button"
          className="hg-quit"
          onClick={() => {
            letSleep();
            setPhase("setup");
          }}
          aria-label={t("Stop", "หยุด")}
        >
          ✕
        </button>
      </div>
    );
  }

  const chips = (
    <ul className="hg-scores" aria-label={t("Players", "ผู้เล่น")}>
      {players.map((p, i) => (
        <li key={i} className={`${phase === "play" && i === turn ? "is-turn" : ""}${isOut(i) ? " is-done" : ""}`}>
          <span>
            {isOut(i) ? (solved.indexOf(i) === 0 ? "👑 " : "✓ ") : ""}
            {p}
          </span>
          <b className="mono">{t(`${asked[i] ?? 0} asked`, `ถาม ${asked[i] ?? 0}`)}</b>
        </li>
      ))}
    </ul>
  );

  if (phase === "deal") {
    const c = cards[dealIdx];
    return (
      <div className="game hg-screen" ref={topRef}>
        <p className="mono muted ha-step">{t(`Dealing words · ${dealIdx + 1} of ${n}`, `แจกคำ · ${dealIdx + 1} จาก ${n}`)}</p>
        {!dealShown ? (
          <div className="game-card handoff">
            <span className="handoff-phone" aria-hidden>
              🙈
            </span>
            <p className="turn-banner">
              <b>{players[dealIdx]}</b>
              {t(", look away!", " หันหน้าไปทางอื่น!")}
            </p>
            <p className="muted">{t(`Everyone else: tap to see ${players[dealIdx]}’s word.`, `คนอื่นแตะเพื่อดูคำบนหัวของ ${players[dealIdx]}`)}</p>
            <button type="button" className="btn btn--primary" onClick={() => setDealShown(true)}>
              {t(`Show ${players[dealIdx]}’s word`, `ดูคำของ ${players[dealIdx]}`)}
            </button>
          </div>
        ) : (
          <div className="game-card ha-reveal">
            <p className="mono muted">{t(`On ${players[dealIdx]}’s head`, `บนหัวของ ${players[dealIdx]}`)}</p>
            <p className="ha-big">{word(c)}</p>
            <p className="muted">
              {otherWord(c)} · {catName(c?.cat)}
            </p>
            <p className="ha-tip">{t("Remember it, or write it on a sticky note and stick it on their forehead.", "จำไว้ หรือเขียนลงโพสต์อิทแปะหน้าผากเขาเลย")}</p>
            <button type="button" className="btn btn--primary" onClick={nextDeal}>
              {dealIdx + 1 < n ? t("Hide & next", "ซ่อนแล้วไปคนถัดไป") : t("Hide & start asking", "ซ่อนแล้วเริ่มถาม")}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "guess") {
    return (
      <div className="game hg-screen" ref={topRef}>
        <div className="game-card result-card">
          <p className="mono muted">{t("Final answer?", "ตอบเลยไหม?")}</p>
          <p className="turn-banner">
            <b>{players[turn]}</b>
            {t(", say your guess out loud!", " พูดคำที่คิดว่าอยู่บนหัวออกมาเลย!")}
          </p>
          {!peek ? (
            <button type="button" className="btn btn--ghost" onClick={() => setPeek(true)}>
              {t(`Friends: show the word (don’t look, ${players[turn]}!)`, `เพื่อน: แตะดูคำ (${players[turn]} ห้ามดู!)`)}
            </button>
          ) : (
            <>
              <p className="ha-big">{word(cards[turn])}</p>
              <div className="game-actions">
                <button type="button" className="btn btn--primary" onClick={() => judge(true)}>
                  ✓ {t("Correct!", "ถูก!")}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => judge(false)}>
                  ✗ {t("Wrong, next turn", "ผิด ไปตาถัดไป")}
                </button>
              </div>
            </>
          )}
          <button type="button" className="btn btn--text" onClick={() => (setPeek(false), setPhase("play"))}>
            {t("Not yet, back", "ยังก่อน กลับไป")}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "board") {
    return (
      <div className="game hg-screen" ref={topRef}>
        <div className="game-card">
          {boardFor === null ? (
            <>
              <p className="turn-banner">{t("Who’s looking?", "ใครจะดู?")}</p>
              <p className="muted">{t("Your own word stays hidden.", "คำบนหัวของตัวเองจะถูกซ่อนไว้")}</p>
              <div className="ha-who">
                {players.map((p, i) => (
                  <button key={i} type="button" className="btn btn--ghost" onClick={() => setBoardFor(i)}>
                    {p}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mono muted">{t(`Words you can see, ${players[boardFor]}`, `คำที่ ${players[boardFor]} ดูได้`)}</p>
              <ul className="ha-board">
                {players.map((p, i) => (
                  <li key={i} className={i === boardFor ? "is-me" : undefined}>
                    <span>{p}</span>
                    <b>{i === boardFor && !isOut(i) ? "🙈 ???" : word(cards[i])}</b>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setBoardFor(null);
              setPhase("play");
            }}
          >
            {t("Hide & back to the game", "ซ่อนแล้วกลับไปเล่น")}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "final") {
    const winner = solved[0];
    const left = players.map((_, i) => i).filter((i) => !isOut(i));
    const loser = s.win === "last" && left.length === 1 ? left[0] : null;
    return (
      <div className="game hg-screen" ref={topRef}>
        <div className="game-card result-card">
          <p className="mono muted">{t("Game over", "จบเกม")}</p>
          {loser !== null ? (
            <p className="result-big">{t(`${players[loser]} loses!`, `${players[loser]} แพ้!`)}</p>
          ) : (
            <p className="result-big ha-win">{t(`${players[winner]} wins!`, `${players[winner]} ชนะ!`)}</p>
          )}
          <ol className="hg-rank">
            {[...solved, ...left].map((i, k) => (
              <li key={i} className={k === 0 ? "is-top" : i === loser ? "is-bottom" : undefined}>
                <span>{k === 0 ? "👑" : i === loser ? "💀" : isOut(i) ? `${k + 1}.` : "·"}</span>
                <b>
                  {players[i]} <small className="muted">· {word(cards[i])}</small>
                </b>
                <span className="mono ha-q">{t(`${asked[i]} asked`, `ถาม ${asked[i]}`)}</span>
              </li>
            ))}
          </ol>
          <div className="game-actions">
            <button type="button" className="btn btn--primary" onClick={start}>
              {t("New words, play again", "สุ่มคำใหม่ เล่นอีกรอบ")}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setPhase("setup")}>
              {t("Change setup", "เปลี่ยนการตั้งค่า")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "play") {
    return (
      <div className="game hg-screen" ref={topRef}>
        {chips}
        <div className="game-card ha-turn">
          <p className="mono muted">{t("Your turn", "ถึงตา")}</p>
          <p className="ha-name">{players[turn]}</p>
          <p className="muted">{t("Ask the others ONE yes/no question about the word on your head.", "ถามเพื่อน 1 คำถามที่ตอบได้แค่ “ใช่/ไม่ใช่” เกี่ยวกับคำบนหัวตัวเอง")}</p>
          <p className="ha-examples">{t("“Am I an animal?” · “Can I fit in a bag?” · “Do I have holes?”", "“ฉันเป็นสัตว์ใช่ไหม?” · “ฉันใส่กระเป๋าได้ไหม?” · “ฉันมีรูใช่ไหม?”")}</p>
          <div className="game-actions">
            <button type="button" className="btn btn--primary" onClick={askedOne}>
              {t("Asked · next player", "ถามแล้ว · คนถัดไป")}
            </button>
            <button type="button" className="btn btn--ghost ha-guess" onClick={() => setPhase("guess")}>
              🎯 {t("I know what I am!", "รู้แล้ว ขอตอบ!")}
            </button>
          </div>
        </div>
        <div className="game-actions">
          <button type="button" className="btn btn--text" onClick={() => setPhase("board")}>
            👀 {t("Forgot someone’s word?", "ลืมคำของเพื่อน?")}
          </button>
          <button type="button" className="btn btn--text" onClick={() => setPhase("setup")}>
            {t("End game", "จบเกม")}
          </button>
        </div>
      </div>
    );
  }

  // setup
  const pool = s.cats.reduce((a, c) => a + (CAT.get(c)?.words.length ?? 0), 0);
  const canStart = s.cats.length > 0 && (s.device === "own" || (n >= 2 && pool >= n));
  return (
    <div className="game hg">
      <div className="hg-hero">
        <span className="hg-hero__phone ha-hero" aria-hidden>
          <i>❓</i>
        </span>
        <div>
          <p className="tile__kicker mono">{t("party · 2–10 players", "ปาร์ตี้ · 2–10 คน")}</p>
          <h2>{t("What am I?", "บนหัวฉันคืออะไร?")}</h2>
          <p className="muted">{t("One word on your head for the whole game. Take turns asking yes/no questions. First to guess wins.", "ทุกคนมีคำบนหัวคนละคำ ผลัดกันถามทีละคำถาม ใช่/ไม่ใช่ ใครทายคำตัวเองได้ก่อนชนะ")}</p>
        </div>
      </div>

      <div className="game-card hg-opts">
        <div className="hg-opt">
          <span className="mono muted">{t("How many phones?", "ใช้มือถือกี่เครื่อง?")}</span>
          <div className="hg-seg" role="radiogroup">
            {(
              [
                ["shared", t("🤝 One phone, pass it around", "🤝 เครื่องเดียว ส่งต่อกัน")],
                ["own", t("📱 Everyone uses their own", "📱 ต่างคนต่างใช้เครื่องตัวเอง")],
              ] as [Device, string][]
            ).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={s.device === v} className={s.device === v ? "is-on" : undefined} onClick={() => setS((x) => ({ ...x, device: v }))}>
                {label}
              </button>
            ))}
          </div>
          <p className="muted ha-note">
            {s.device === "own"
              ? t("Each person opens this page, taps Start and holds their phone on their forehead. The app just shows your word; ask questions out loud.", "ทุกคนเปิดหน้านี้ กดเริ่ม แล้วแปะมือถือบนหน้าผาก แอปจะโชว์คำของคุณให้เพื่อนเห็น ส่วนคำถามก็ถามกันปากเปล่า")
              : t("The app deals a word to each player (everyone else sees it), then keeps track of turns and guesses.", "แอปจะแจกคำให้ทีละคน (คนอื่นเห็น เจ้าตัวไม่เห็น) แล้วช่วยนับตาและตัดสินคำตอบ")}
          </p>
        </div>
        {s.device === "shared" && (
          <div className="hg-opt">
            <span className="mono muted">{t("Game ends when", "จบเกมเมื่อ")}</span>
            <div className="hg-seg" role="radiogroup">
              {(
                [
                  ["first", t("👑 Someone guesses first", "👑 มีคนทายถูกคนแรก")],
                  ["last", t("💀 Only the loser is left", "💀 เหลือคนแพ้คนสุดท้าย")],
                ] as [Win, string][]
              ).map(([v, label]) => (
                <button key={v} type="button" role="radio" aria-checked={s.win === v} className={s.win === v ? "is-on" : undefined} onClick={() => setS((x) => ({ ...x, win: v }))}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {s.device === "shared" && (
        <div className="game-card">
          <div className="hg-head">
            <span className="mono muted">{t(`Players (${n})`, `ผู้เล่น (${n})`)}</span>
          </div>
          <div className="hg-players">
            {s.players.map((p, i) => (
              <div key={i} className="hg-player">
                <span className="hg-player__no mono">{i + 1}</span>
                <input id={`ha-player-${i}`} value={p} maxLength={16} placeholder={t(`Player ${i + 1}`, `ผู้เล่น ${i + 1}`)} onChange={(e) => setPlayer(i, e.target.value)} />
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
      )}

      {(["basic", "silly"] as const).map((g) => (
        <div key={g} className="game-card">
          <div className="hg-head">
            <span className="mono muted">{g === "basic" ? t("Basic categories", "หมวดเบสิก") : t("Silly categories", "หมวดฮาๆ กวนๆ")}</span>
          </div>
          <div className="hg-cats">
            {HEAD_CATEGORIES.filter((c) => c.group === g).map((c) => {
              const on = s.cats.includes(c.id);
              return (
                <button key={c.id} type="button" className={`hg-catbtn${on ? " is-on" : ""}${g === "silly" ? " is-silly" : ""}`} aria-pressed={on} onClick={() => toggleCat(c.id)}>
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

      <div className="game-actions hg-start">
        <button type="button" className="btn btn--primary" disabled={!canStart} onClick={start}>
          {canStart ? (s.device === "own" ? t("Start · show my word", "เริ่ม · โชว์คำของฉัน") : t("Deal the words", "แจกคำ")) : t("Pick at least one category", "เลือกอย่างน้อยหนึ่งหมวด")}
        </button>
        <button type="button" className="btn btn--text" onClick={onExit}>
          {t("Other games", "เกมอื่น")}
        </button>
      </div>
    </div>
  );
}
