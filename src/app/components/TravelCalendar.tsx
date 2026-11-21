"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "../i18n";
import { ShapePicker } from "./TravelMap";

type Trip = { id: string; code: string; from: string; to: string };

const STORE = "earth-travel-calendar";
const SITE_URL = "earthekaphat.vercel.app/map";
const C = { bg: "#0E151C", text: "#E8EEF5", muted: "#8D9BAB", accent: "#3DDC97", year: "#FF5A5F", line: "#26323F" };
const EMOJI_FONT = "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
// Region codes Intl knows that are not countries people travel to.
const NOT_COUNTRIES = new Set(["EU", "EZ", "UN", "QO", "XA", "XB", "ZZ", "AC", "CP", "CQ", "DG", "EA", "IC", "TA"]);

const flagOf = (code: string) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const firstDow = (y: number, m: number) => new Date(y, m, 1).getDay(); // 0 = Sunday

// Every country Intl can name, built from the two-letter region codes.
function countryList(lang: "en" | "th") {
  const dn = new Intl.DisplayNames([lang], { type: "region" });
  const out: { code: string; name: string }[] = [];
  for (let a = 65; a <= 90; a++)
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (NOT_COUNTRIES.has(code)) continue;
      let name: string | undefined;
      try {
        name = dn.of(code);
      } catch {}
      if (name && name !== code) out.push({ code, name });
    }
  return out.sort((x, y) => x.name.localeCompare(y.name, lang));
}

export function TravelCalendar() {
  const { t, lang } = useLang();
  const [year, setYear] = useState(2026);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [caption, setCaption] = useState("");
  const [code, setCode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [err, setErr] = useState("");
  const [shape, setShape] = useState<"portrait" | "landscape">("portrait");
  const [busy, setBusy] = useState(false);
  const [today, setToday] = useState("");
  const loaded = useRef(false);

  const countries = useMemo(() => countryList(lang), [lang]);
  const nameOf = useMemo(() => {
    const m = new Map(countries.map((c) => [c.code, c.name]));
    return (c: string) => m.get(c) ?? c;
  }, [countries]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const now = new Date();
      setToday(iso(now.getFullYear(), now.getMonth(), now.getDate()));
      try {
        const saved = JSON.parse(localStorage.getItem(STORE) || "null");
        if (saved && Array.isArray(saved.trips)) setTrips(saved.trips);
        if (saved && typeof saved.caption === "string") setCaption(saved.caption);
        setYear(saved && typeof saved.year === "number" ? saved.year : now.getFullYear());
      } catch {
        setYear(now.getFullYear());
      }
      loaded.current = true;
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ year, trips, caption }));
    } catch {}
  }, [year, trips, caption]);

  // Day (YYYY-MM-DD) → country codes on that day; later trips draw on top.
  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const trip of trips) {
      const d = new Date(trip.from + "T00:00:00");
      const end = new Date(trip.to + "T00:00:00");
      for (let i = 0; d <= end && i < 400; i++) {
        const k = iso(d.getFullYear(), d.getMonth(), d.getDate());
        m.set(k, [...(m.get(k) ?? []), trip.code]);
        d.setDate(d.getDate() + 1);
      }
    }
    return m;
  }, [trips]);

  const yearTrips = trips.filter((tr) => tr.from.slice(0, 4) <= String(year) && tr.to.slice(0, 4) >= String(year));
  const daysAway = [...byDay.keys()].filter((k) => k.startsWith(`${year}-`)).length;
  const countriesThisYear = new Set(yearTrips.map((tr) => tr.code)).size;
  const monthName = (m: number) => new Intl.DateTimeFormat(lang, { month: "short" }).format(new Date(2000, m, 1));
  const yearLabel = lang === "th" ? `${year} · พ.ศ. ${year + 543}` : `${year} · ${year + 543} BE`;

  function addTrip() {
    setErr("");
    if (!code) return setErr(t("Pick a country first.", "เลือกประเทศก่อน"));
    if (!from) return setErr(t("Pick the start date.", "เลือกวันที่เริ่ม"));
    const end = to || from;
    if (end < from) return setErr(t("The end date is before the start date.", "วันกลับอยู่ก่อนวันไป"));
    setTrips((ts) => [...ts, { id: `${Date.now()}`, code, from, to: end }]);
    setFrom("");
    setTo("");
  }

  async function download() {
    setBusy(true);
    try {
      const tall = shape === "portrait";
      const cv = document.createElement("canvas");
      cv.width = tall ? 1080 : 1920;
      cv.height = tall ? 1920 : 1080;
      const ctx = cv.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      const sans = "system-ui, -apple-system, Segoe UI, sans-serif";
      const mono = "ui-monospace, Menlo, monospace";
      const left = tall ? 64 : 80;
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = C.year;
      ctx.font = `800 ${tall ? 92 : 76}px ${sans}`;
      ctx.fillText(yearLabel, left, tall ? 350 : 112);
      let y0 = tall ? 400 : 150;
      if (caption.trim()) {
        ctx.fillStyle = C.text;
        ctx.font = `700 ${tall ? 40 : 34}px ${sans}`;
        ctx.fillText(caption.trim(), left, y0 + (tall ? 30 : 24));
        y0 += tall ? 60 : 48;
      }
      ctx.fillStyle = C.accent;
      ctx.font = `600 ${tall ? 30 : 26}px ${mono}`;
      ctx.fillText(t(`${countriesThisYear} ${countriesThisYear === 1 ? "country" : "countries"} · ${daysAway} ${daysAway === 1 ? "day" : "days"} away`, `${countriesThisYear} ประเทศ · เที่ยว ${daysAway} วัน`), left, y0 + (tall ? 44 : 38));
      const gridTop = y0 + (tall ? 100 : 80);
      const cols = tall ? 3 : 6;
      const rows = 12 / cols;
      const gridBottom = tall ? cv.height - 320 : cv.height - 70;
      const blockW = (cv.width - left * 2) / cols;
      const blockH = (gridBottom - gridTop) / rows;
      const cell = (blockW - 16) / 7;
      const rowH = Math.min(cell * 0.95, (blockH - 56) / 6);
      for (let m = 0; m < 12; m++) {
        const bx = left + (m % cols) * blockW;
        const by = gridTop + Math.floor(m / cols) * blockH;
        ctx.fillStyle = C.text;
        ctx.font = `700 ${tall ? 32 : 30}px ${sans}`;
        ctx.fillText(monthName(m), bx, by + 30);
        const start = firstDow(year, m);
        for (let d = 1; d <= daysIn(year, m); d++) {
          const slot = start + d - 1;
          const cx = bx + (slot % 7) * cell + cell / 2;
          const cy = by + 56 + Math.floor(slot / 7) * rowH + rowH / 2;
          const codes = byDay.get(iso(year, m, d));
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (codes) {
            ctx.font = `${Math.round(cell * 0.78)}px ${EMOJI_FONT}`;
            ctx.fillText(flagOf(codes[codes.length - 1]), cx, cy + 1);
          } else {
            ctx.fillStyle = C.muted;
            ctx.font = `500 ${Math.round(cell * 0.46)}px ${sans}`;
            ctx.fillText(String(d), cx, cy);
            ctx.fillStyle = C.text;
          }
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        }
      }
      ctx.fillStyle = C.muted;
      ctx.font = `500 ${tall ? 26 : 22}px ${mono}`;
      ctx.fillText(SITE_URL, left, tall ? cv.height - 270 : cv.height - 30);
      const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));
      if (!blob) throw new Error("no image");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `travel-calendar-${year}-${shape}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tcal">
      <div className="tmap__card">
        <div className="tcal__head">
          <button type="button" className="tcal__step" onClick={() => setYear((y) => y - 1)} aria-label={t("Previous year", "ปีก่อน")}>
            ‹
          </button>
          <h2 className="tcal__year">{yearLabel}</h2>
          <button type="button" className="tcal__step" onClick={() => setYear((y) => y + 1)} aria-label={t("Next year", "ปีถัดไป")}>
            ›
          </button>
        </div>
        {caption.trim() && <p className="tcal__caption">{caption}</p>}
        <div className="tmap__stats">
          <div>
            <b className="mono">{countriesThisYear}</b>
            <span>{t(countriesThisYear === 1 ? "country" : "countries", "ประเทศ")}</span>
          </div>
          <div>
            <b className="mono">{daysAway}</b>
            <span>{t(daysAway === 1 ? "day away" : "days away", "วันที่เที่ยว")}</span>
          </div>
        </div>

        <div className="tcal__grid">
          {Array.from({ length: 12 }, (_, m) => (
            <div key={m} className="tcal__month">
              <b className={today.startsWith(`${year}-${String(m + 1).padStart(2, "0")}`) ? "is-now" : undefined}>{monthName(m)}</b>
              <div className="tcal__days">
                {Array.from({ length: firstDow(year, m) }, (_, i) => (
                  <span key={`e${i}`} />
                ))}
                {Array.from({ length: daysIn(year, m) }, (_, i) => {
                  const k = iso(year, m, i + 1);
                  const codes = byDay.get(k);
                  return (
                    <span key={k} className={`${codes ? "is-trip" : ""}${k === today ? " is-today" : ""}`} title={codes ? codes.map(nameOf).join(", ") : undefined}>
                      {codes ? flagOf(codes[codes.length - 1]) : i + 1}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="tmap__actions">
          <label className="tmap__title">
            <span className="mono muted">{t("Caption", "ข้อความบนรูป")}</span>
            <input id="cal-caption" value={caption} maxLength={40} placeholder={t("I don’t like travel tho…", "ไม่ได้ชอบเที่ยวขนาดนั้น…")} onChange={(e) => setCaption(e.target.value)} />
          </label>
          <ShapePicker shape={shape} setShape={setShape} />
          <button type="button" className="btn btn--primary" onClick={download} disabled={busy}>
            {busy ? t("Saving…", "กำลังบันทึก…") : t("Download PNG", "ดาวน์โหลดรูป")}
          </button>
        </div>
      </div>

      <div className="tmap__card">
        <h3 className="tcal__h3">{t("Add a trip", "เพิ่มทริป")}</h3>
        <div className="tcal__form">
          <label>
            <span className="mono muted">{t("Country", "ประเทศ")}</span>
            <select id="cal-country" value={code} onChange={(e) => setCode(e.target.value)}>
              <option value="">{t("Choose a country", "เลือกประเทศ")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {flagOf(c.code)} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mono muted">{t("From", "วันไป")}</span>
            <input id="cal-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <span className="mono muted">{t("To", "วันกลับ")}</span>
            <input id="cal-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="button" className="btn btn--primary" onClick={addTrip}>
            {t("Add", "เพิ่ม")}
          </button>
        </div>
        {err && <p className="tcal__err">{err}</p>}

        {trips.length > 0 && (
          <ul className="tcal__trips">
            {[...trips]
              .sort((a, b) => a.from.localeCompare(b.from))
              .map((tr) => (
                <li key={tr.id}>
                  <span className="tcal__flag" aria-hidden>
                    {flagOf(tr.code)}
                  </span>
                  <span className="tcal__trip-name">{nameOf(tr.code)}</span>
                  <span className="mono muted tcal__dates">{tr.from === tr.to ? tr.from : `${tr.from} → ${tr.to}`}</span>
                  <button type="button" onClick={() => setTrips((ts) => ts.filter((x) => x.id !== tr.id))} aria-label={t(`Remove ${nameOf(tr.code)}`, `ลบ ${nameOf(tr.code)}`)}>
                    ×
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
