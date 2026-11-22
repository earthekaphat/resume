"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n";

// SHA-256 of `earth-ekp:DD-MM` for Earth's birthday, so the date isn't sitting in the code as plain text.
// It only keeps casual visitors out: anyone determined can still try all 366 days.
const BIRTHDAY_HASH = "c500e9803e1c7b35c71fe048f6c1d48fe50b772e7a16da372cdc50cfe1fcac56";
const STORE = "earth-friend-gate";
const MAX_TRIES = 3;
const LOCK_MS = 5 * 60 * 1000;

type State = "unknown" | "ok" | "locked";
type Step = "ask" | "birthday" | "welcome" | "denied";

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Wraps the travel tools. The first time someone tries to use them, ask whether they
// know Earth and, if so, his birthday (day and month). Right answer unlocks this device.
export function FriendGate({ children }: { children: React.ReactNode }) {
  const { t, lang } = useLang();
  const [state, setState] = useState<State>("unknown");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("ask");
  const [day, setDay] = useState(0);
  const [month, setMonth] = useState(0);
  const [tries, setTries] = useState(0);
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const [until, setUntil] = useState(0);
  const [left, setLeft] = useState(0);
  const confetti = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const v = localStorage.getItem(STORE);
        if (v === "ok") setState("ok");
        else if (v?.startsWith("locked:") && Number(v.slice(7)) > Date.now()) {
          setState("locked");
          setUntil(Number(v.slice(7)));
        } else if (v) localStorage.removeItem(STORE);
      } catch {}
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function remember(v: "ok") {
    setState(v);
    try {
      localStorage.setItem(STORE, v);
    } catch {}
  }

  // Wrong answers (or "No") lock the tools on this device for a few minutes.
  function lock() {
    const end = Date.now() + LOCK_MS;
    setState("locked");
    setUntil(end);
    setLeft(Math.ceil(LOCK_MS / 1000));
    setStep("denied");
    try {
      localStorage.setItem(STORE, `locked:${end}`);
    } catch {}
  }

  function unlockForRetry() {
    setState("unknown");
    setUntil(0);
    setTries(0);
    setDay(0);
    setMonth(0);
    try {
      localStorage.removeItem(STORE);
    } catch {}
  }

  // Count the lock down every second while the popup is showing it.
  useEffect(() => {
    if (state !== "locked" || !until) return;
    const tick = () => {
      const s = Math.ceil((until - Date.now()) / 1000);
      if (s <= 0) {
        unlockForRetry();
        setStep("ask");
      } else setLeft(s);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state, until]);

  // Stop the first touch on the tools and ask instead.
  function intercept(e: React.SyntheticEvent) {
    if (state === "ok") return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).blur?.();
    if (state === "locked" && until > Date.now()) setStep("denied");
    else {
      if (state === "locked") unlockForRetry();
      setStep("ask");
    }
    setOpen(true);
  }

  async function check() {
    if (!day || !month) return;
    setChecking(true);
    const ok = (await sha256(`earth-ekp:${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`)) === BIRTHDAY_HASH;
    setChecking(false);
    if (ok) {
      remember("ok");
      setStep("welcome");
      burst();
      return;
    }
    const n = tries + 1;
    setTries(n);
    setShake(true);
    if (n >= MAX_TRIES) lock();
  }

  function burst() {
    const c = confetti.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#3DDC97", "#FFB547", "#FF6FA8", "#5AB8FF"];
    const bits = Array.from({ length: 110 }, () => {
      const a = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * 7;
      return { x: c.clientWidth / 2, y: c.clientHeight / 2.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, r: Math.random() * 6, c: colors[(Math.random() * 4) | 0], life: 1 };
    });
    const tick = () => {
      ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);
      let alive = false;
      for (const b of bits) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.2;
        b.r += 0.2;
        b.life -= 0.013;
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

  const months = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(lang, { month: "short" }).format(new Date(2000, i, 1)));
  const maxDay = month ? new Date(2000, month, 0).getDate() : 31;

  return (
    <>
      <div className={`gate-wrap${state === "ok" ? "" : " is-guarded"}`} onClickCapture={intercept} onFocusCapture={intercept} onKeyDownCapture={intercept}>
        {children}
      </div>

      {open && (
        <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title" onClick={(e) => e.target === e.currentTarget && step !== "birthday" && setOpen(false)}>
          <canvas ref={confetti} className="gate__confetti" aria-hidden />
          <div className={`gate__card${shake ? " is-shake" : ""}`} onAnimationEnd={() => setShake(false)}>
            <div className="gate__orb" aria-hidden>
              <span>{step === "denied" ? "🔒" : step === "welcome" ? "🎉" : step === "birthday" ? "🎂" : "🌍"}</span>
            </div>

            {step === "ask" && (
              <>
                <p className="gate__kicker mono">{t("friends only", "เฉพาะเพื่อน")}</p>
                <h2 id="gate-title">{t("Do you know Earth?", "คุณรู้จักเอิร์ธไหม?")}</h2>
                <p className="muted">{t("These tools are for Earth’s friends. Quick check first.", "เครื่องมือนี้ทำไว้ให้เพื่อนของเอิร์ธ ขอเช็กนิดนึงก่อน")}</p>
                <div className="gate__actions">
                  <button type="button" className="btn btn--primary" onClick={() => setStep("birthday")}>
                    {t("Yes, I do", "รู้จักสิ")}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={lock}
                  >
                    {t("No", "ไม่รู้จัก")}
                  </button>
                </div>
              </>
            )}

            {step === "birthday" && (
              <>
                <p className="gate__kicker mono">{t(`try ${tries + 1} of ${MAX_TRIES}`, `ครั้งที่ ${tries + 1} จาก ${MAX_TRIES}`)}</p>
                <h2 id="gate-title">{t("When is Earth’s birthday?", "เอิร์ธเกิดวันที่เท่าไหร่?")}</h2>
                <p className="muted">{t("Just the day and month.", "ใส่แค่วันที่กับเดือน")}</p>
                <div className="gate__pick">
                  <div className="gate__months" role="radiogroup" aria-label={t("Month", "เดือน")}>
                    {months.map((mn, i) => (
                      <button key={mn} type="button" role="radio" aria-checked={month === i + 1} className={month === i + 1 ? "is-on" : undefined} onClick={() => setMonth(i + 1)}>
                        {mn}
                      </button>
                    ))}
                  </div>
                  <div className="gate__days" role="radiogroup" aria-label={t("Day", "วันที่")}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <button key={d} type="button" role="radio" aria-checked={day === d} disabled={d > maxDay} className={day === d ? "is-on" : undefined} onClick={() => setDay(d)}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                {tries > 0 && <p className="gate__wrong">{t(`Not quite. ${MAX_TRIES - tries} ${MAX_TRIES - tries === 1 ? "try" : "tries"} left.`, `ยังไม่ใช่ เหลืออีก ${MAX_TRIES - tries} ครั้ง`)}</p>}
                <div className="gate__actions">
                  <button type="button" className="btn btn--primary" onClick={check} disabled={!day || !month || day > maxDay || checking}>
                    {t("Check", "ตรวจคำตอบ")}
                  </button>
                </div>
              </>
            )}

            {step === "welcome" && (
              <>
                <p className="gate__kicker mono">{t("access granted", "ผ่านแล้ว")}</p>
                <h2 id="gate-title">{t("Welcome, friend!", "ยินดีต้อนรับเพื่อน!")}</h2>
                <p className="muted">{t("Everything is unlocked on this device.", "ปลดล็อกทุกอย่างในเครื่องนี้แล้ว")}</p>
                <div className="gate__actions">
                  <button type="button" className="btn btn--primary" onClick={() => setOpen(false)}>
                    {t("Let’s go", "ไปกันเลย")}
                  </button>
                </div>
              </>
            )}

            {step === "denied" && (
              <>
                <p className="gate__kicker mono">{t("access denied", "ใช้งานไม่ได้")}</p>
                <h2 id="gate-title">{t("Sorry, friends of Earth only", "ขอโทษนะ ใช้ได้เฉพาะเพื่อนของเอิร์ธ")}</h2>
                <div className="gate__timer" role="timer" aria-live="off" style={{ "--p": left / (LOCK_MS / 1000) } as React.CSSProperties}>
                  <span className="mono">
                    {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
                  </span>
                </div>
                <p className="muted">{t("Try again when the timer runs out. You can still look around the rest of the site.", "ลองใหม่ได้เมื่อหมดเวลา ระหว่างนี้ยังดูส่วนอื่นของเว็บได้ตามปกติ")}</p>
                <div className="gate__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setOpen(false)}
                  >
                    {t("Close", "ปิด")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
