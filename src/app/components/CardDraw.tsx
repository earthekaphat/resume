"use client";

import { useEffect, useRef, useState } from "react";

const MAX = 10;
const STORE = "earth-random-items";
const SAMPLE = ["Ramen", "Pad kra pao", "Sushi", "Som tam", "Burger"];

type Phase = "idle" | "shuffling" | "revealed";
type Spot = { x: number; y: number; r: number };

// Unbiased random integer in [0, n) using the Web Crypto API.
function randomIndex(n: number) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

// Grid slots for n face-down cards, centred on the table.
function layout(n: number, w: number): Spot[] {
  const cols = w < 520 ? Math.min(n, 4) : Math.min(n, 5);
  const rows = Math.ceil(n / cols);
  const gapX = Math.min(104, (w - 40) / cols);
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols);
    const inRow = row === rows - 1 ? n - row * cols : cols;
    const col = i % cols;
    return { x: (col - (inRow - 1) / 2) * gapX, y: (row - (rows - 1) / 2) * 138, r: 0 };
  });
}

export function CardDraw() {
  const [items, setItems] = useState<string[]>(SAMPLE);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const timers = useRef<number[]>([]);
  const loaded = useRef(false);

  // Restore the last list on this device.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "null");
      if (Array.isArray(saved) && saved.length) setItems(saved.slice(0, MAX).map(String));
    } catch {}
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(items));
    } catch {}
  }, [items]);

  // Re-lay the table when the item count or width changes.
  useEffect(() => {
    const place = () => {
      const w = tableRef.current?.clientWidth ?? 600;
      setSpots(layout(items.length, w));
      setOrder(items.map((_, i) => i));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [items.length]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function add(raw: string) {
    const parts = raw
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const room = MAX - items.length;
    if (room <= 0) {
      setMsg(`ใส่ได้สูงสุด ${MAX} อัน ลบบางอันออกก่อน`);
      return;
    }
    const next = parts.slice(0, room);
    setItems([...items, ...next]);
    setMsg(parts.length > room ? `เพิ่มได้แค่ ${room} อัน เพราะครบ ${MAX} แล้ว` : "");
    setDraft("");
    reset();
  }

  function remove(i: number) {
    setItems(items.filter((_, j) => j !== i));
    setMsg("");
    reset();
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("idle");
    setWinner(null);
  }

  function draw() {
    if (items.length < 2 || phase === "shuffling") return;
    reset();
    setPhase("shuffling");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const w = tableRef.current?.clientWidth ?? 600;
    const home = layout(items.length, w);
    const rounds = reduce ? 0 : 7;
    for (let k = 0; k < rounds; k++) {
      timers.current.push(
        window.setTimeout(() => {
          const spread = Math.min(w / 2 - 50, 220);
          setSpots(
            items.map(() => ({
              x: (Math.random() * 2 - 1) * spread,
              y: (Math.random() * 2 - 1) * 90,
              r: (Math.random() * 2 - 1) * 28,
            })),
          );
        }, k * 170),
      );
    }
    timers.current.push(
      window.setTimeout(() => {
        // The shuffle is only for show; the pick comes from crypto.
        const shuffled = items.map((_, i) => i);
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = randomIndex(i + 1);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setOrder(shuffled);
        setSpots(home);
        const pick = randomIndex(items.length);
        timers.current.push(
          window.setTimeout(() => {
            setWinner(pick);
            setPhase("revealed");
            setHistory((h) => [items[pick], ...h].slice(0, 6));
            if (!reduce) burst();
          }, reduce ? 0 : 520),
        );
      }, rounds * 170 + 80),
    );
  }

  function removeWinnerAndDraw() {
    if (winner === null) return;
    setItems(items.filter((_, i) => i !== winner));
    reset();
  }

  function burst() {
    const c = confettiRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    const cs = getComputedStyle(document.documentElement);
    const colors = ["--accent", "--amber", "--pink", "--sky"].map((v) => cs.getPropertyValue(v).trim());
    const cx = c.clientWidth / 2,
      cy = c.clientHeight / 2;
    const bits = Array.from({ length: 90 }, () => {
      const a = Math.random() * Math.PI * 2,
        s = 3 + Math.random() * 6;
      return { x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, r: Math.random() * 6, c: colors[(Math.random() * colors.length) | 0], life: 1 };
    });
    const tick = () => {
      ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);
      let alive = false;
      for (const b of bits) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.18;
        b.vx *= 0.99;
        b.r += 0.2;
        b.life -= 0.012;
        if (b.life <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = b.life;
        ctx.translate(b.x, b.y);
        ctx.rotate(b.r);
        ctx.fillStyle = b.c;
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
      if (alive) requestAnimationFrame(tick);
    };
    tick();
  }

  const canDraw = items.length >= 2 && phase !== "shuffling";

  return (
    <div className="draw">
      <div className="draw__panel">
        <form
          className="draw__form"
          onSubmit={(e) => {
            e.preventDefault();
            add(draft);
          }}
        >
          <label htmlFor="choice" className="mono muted">
            ตัวเลือก {items.length}/{MAX}
          </label>
          <div className="draw__row">
            <input
              id="choice"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPaste={(e) => {
                const t = e.clipboardData.getData("text");
                if (/\n|,/.test(t)) {
                  e.preventDefault();
                  add(t);
                }
              }}
              placeholder={items.length >= MAX ? "ครบ 10 อันแล้ว" : "พิมพ์แล้วกด Enter (วางหลายบรรทัดได้)"}
              maxLength={40}
              disabled={items.length >= MAX}
              autoComplete="off"
            />
            <button type="submit" className="btn btn--ghost" disabled={!draft.trim() || items.length >= MAX}>
              เพิ่ม
            </button>
          </div>
        </form>

        <ul className="chips" aria-label="ตัวเลือกทั้งหมด">
          {items.map((it, i) => (
            <li key={`${it}-${i}`} className={winner === i ? "chip chip--win" : "chip"}>
              {it}
              <button type="button" onClick={() => remove(i)} aria-label={`ลบ ${it}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <p className="draw__msg" role="status">
          {msg || (items.length < 2 ? "ใส่อย่างน้อย 2 อันเพื่อสุ่ม" : "")}
        </p>

        <div className="draw__actions">
          <button type="button" className="btn btn--primary" onClick={draw} disabled={!canDraw}>
            {phase === "shuffling" ? "กำลังสับไพ่…" : phase === "revealed" ? "สุ่มอีกครั้ง" : "สับไพ่แล้วสุ่ม"}
          </button>
          {phase === "revealed" && items.length > 2 && (
            <button type="button" className="btn btn--ghost" onClick={removeWinnerAndDraw}>
              ตัดอันนี้ออก
            </button>
          )}
          {items.length > 0 && (
            <button type="button" className="btn btn--text" onClick={() => { setItems([]); reset(); setMsg(""); }}>
              ล้างทั้งหมด
            </button>
          )}
        </div>
      </div>

      <div className="table" ref={tableRef} aria-live="polite">
        <canvas ref={confettiRef} className="table__confetti" aria-hidden />
        {items.map((it, i) => {
          const slot = order.indexOf(i);
          const s = spots[slot] ?? { x: 0, y: 0, r: 0 };
          const isWin = phase === "revealed" && winner === i;
          const dim = phase === "revealed" && winner !== i;
          const style = isWin
            ? { transform: `translate(-50%,-50%) translate(0px,0px) scale(1.35)`, zIndex: 20 }
            : { transform: `translate(-50%,-50%) translate(${s.x}px,${s.y}px) rotate(${s.r}deg)`, zIndex: slot };
          return (
            <div key={`${it}-${i}`} className={`card${isWin ? " card--win" : ""}${dim ? " card--dim" : ""}`} style={style}>
              <div className="card__inner">
                <div className="card__back" aria-hidden>
                  <span className="mono">?</span>
                </div>
                <div className="card__face">
                  <span className="mono muted">result</span>
                  <b>{it}</b>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="table__empty">เพิ่มตัวเลือกด้านซ้ายเพื่อวางไพ่บนโต๊ะ</p>}
        {phase === "revealed" && winner !== null && (
          <p className="sr-only">ผลสุ่มคือ {items[winner]}</p>
        )}
      </div>

      {history.length > 0 && (
        <div className="history">
          <span className="mono muted">ผลล่าสุด</span>
          <ol>
            {history.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
