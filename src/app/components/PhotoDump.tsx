"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n";
import { deleteMonth, loadMonth, saveMonth, shrinkPhoto } from "../photoStore";
import { ShapePicker } from "./TravelMap";

const SITE_URL = "earthekaphat.vercel.app/map";
const C = { bg: "#0E151C", text: "#E8EEF5", muted: "#8D9BAB", accent: "#3DDC97", cell: "#1A2430", hot: "#FF5A5F" };

const keyOf = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A month calendar where each day can hold a photo instead of its number.
export function PhotoDump() {
  const { t, lang } = useLang();
  const [ym, setYm] = useState<{ y: number; m: number } | null>(null);
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [title, setTitle] = useState("");
  const [shape, setShape] = useState<"portrait" | "landscape">("portrait");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pop, setPop] = useState<number | null>(null);
  const oneRef = useRef<HTMLInputElement>(null);
  const manyRef = useRef<HTMLInputElement>(null);
  const target = useRef<number | null>(null);
  const ready = useRef(false);

  // Start on the current month (after first paint, so the prerendered HTML matches).
  useEffect(() => {
    const id = window.setTimeout(() => {
      const now = new Date();
      setYm({ y: now.getFullYear(), m: now.getMonth() });
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!ym) return;
    let alive = true;
    ready.current = false;
    loadMonth(keyOf(ym.y, ym.m))
      .then((d) => {
        if (!alive) return;
        setPhotos(d?.photos ?? {});
        setTitle(d?.title ?? "");
        ready.current = true;
      })
      .catch(() => {
        ready.current = true;
      });
    return () => {
      alive = false;
    };
  }, [ym]);

  useEffect(() => {
    if (!ym || !ready.current) return;
    const key = keyOf(ym.y, ym.m);
    // Don't keep a record for months that were only paged through.
    const empty = !title && Object.keys(photos).length === 0;
    (empty ? deleteMonth(key) : saveMonth(key, { title, photos })).catch(() => {});
  }, [ym, title, photos]);

  if (!ym) return <div className="tmap__card dump dump--loading" />;

  const { y, m } = ym;
  const days = new Date(y, m + 1, 0).getDate();
  const lead = new Date(y, m, 1).getDay();
  const monthShort = new Intl.DateTimeFormat(lang, { month: "short" }).format(new Date(y, m, 1));
  const monthLong = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(new Date(y, m, 1));
  const defaultTitle = t(`${monthShort} dump`, `${monthShort} dump`);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(lang, { weekday: "narrow" }).format(new Date(2024, 0, 7 + i)));
  const filled = Object.keys(photos).length;

  function shift(n: number) {
    const d = new Date(y, m + n, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  }

  async function putOne(file: File | undefined) {
    const day = target.current;
    if (!file || day == null) return;
    setAdding(true);
    try {
      const src = await shrinkPhoto(file);
      setPhotos((p) => ({ ...p, [day]: src }));
      setPop(day);
    } finally {
      setAdding(false);
    }
  }

  // Many photos at once: use each photo's own date when it falls in this month,
  // otherwise fill the next empty day.
  async function putMany(files: FileList | null) {
    if (!files?.length) return;
    setAdding(true);
    try {
      const next = { ...photos };
      const queue: File[] = [];
      for (const f of Array.from(files)) {
        const d = new Date(f.lastModified);
        if (d.getFullYear() === y && d.getMonth() === m && !next[d.getDate()]) next[d.getDate()] = await shrinkPhoto(f);
        else queue.push(f);
      }
      for (let day = 1; day <= days && queue.length; day++) if (!next[day]) next[day] = await shrinkPhoto(queue.shift() as File);
      setPhotos(next);
    } finally {
      setAdding(false);
    }
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
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, cv.width, cv.height);
      const rows = Math.ceil((lead + days) / 7);
      const gap = tall ? 10 : 10;
      // Portrait: title on top, grid below (inside the story-safe area). Landscape: title left, grid right.
      const cell = tall ? (cv.width - 128 - gap * 6) / 7 : Math.min((cv.height - 150 - gap * (rows - 1)) / rows, 170);
      const gx = tall ? 64 : cv.width - 80 - (cell * 7 + gap * 6);
      const gy = tall ? 560 : 110;
      ctx.fillStyle = C.text;
      ctx.font = `800 ${tall ? 110 : 96}px ${sans}`;
      const tx = tall ? 64 : 80;
      ctx.fillText(title.trim() || defaultTitle, tx, tall ? 380 : 230, tall ? 952 : gx - 120);
      ctx.fillStyle = C.accent;
      ctx.font = `600 ${tall ? 34 : 32}px ${mono}`;
      ctx.fillText(t(`${monthLong} · ${filled} ${filled === 1 ? "day" : "days"}`, `${monthLong} · ${filled} วัน`), tx, tall ? 440 : 290);
      ctx.fillStyle = C.muted;
      ctx.font = `600 ${tall ? 26 : 22}px ${mono}`;
      ctx.textAlign = "center";
      weekdays.forEach((w, i) => ctx.fillText(w, gx + i * (cell + gap) + cell / 2, gy - 18));
      ctx.textAlign = "left";
      const imgs = await Promise.all(Object.entries(photos).map(async ([d, src]) => [Number(d), await loadImg(src)] as const));
      const byDay = new Map(imgs);
      for (let d = 1; d <= days; d++) {
        const slot = lead + d - 1;
        const x = gx + (slot % 7) * (cell + gap);
        const yy = gy + Math.floor(slot / 7) * (cell + gap);
        const img = byDay.get(d);
        ctx.save();
        roundRect(ctx, x, yy, cell, cell, cell * 0.16);
        ctx.clip();
        if (img) ctx.drawImage(img, x, yy, cell, cell);
        else {
          ctx.fillStyle = C.cell;
          ctx.fillRect(x, yy, cell, cell);
        }
        ctx.restore();
        ctx.font = `700 ${Math.round(cell * 0.2)}px ${sans}`;
        ctx.fillStyle = img ? "#FFFFFF" : C.muted;
        ctx.shadowColor = img ? "rgba(0,0,0,.6)" : "transparent";
        ctx.shadowBlur = img ? 6 : 0;
        ctx.fillText(String(d), x + cell * 0.1, yy + cell * 0.27);
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = C.muted;
      ctx.font = `500 ${tall ? 26 : 22}px ${mono}`;
      ctx.fillText(SITE_URL, tall ? 64 : 80, tall ? cv.height - 270 : cv.height - 36);
      const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));
      if (!blob) throw new Error("no image");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${keyOf(y, m)}-dump-${shape}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tcal">
      <div className="tmap__card dump">
        <div className="tcal__head">
          <button type="button" className="tcal__step" onClick={() => shift(-1)} aria-label={t("Previous month", "เดือนก่อน")}>
            ‹
          </button>
          <div className="dump__titles">
            <h2 className="dump__title">{title.trim() || defaultTitle}</h2>
            <span className="mono muted">
              {monthLong} · {t(`${filled}/${days} days`, `${filled}/${days} วัน`)}
            </span>
          </div>
          <button type="button" className="tcal__step" onClick={() => shift(1)} aria-label={t("Next month", "เดือนถัดไป")}>
            ›
          </button>
        </div>

        <div className="dump__grid">
          {weekdays.map((w, i) => (
            <span key={`w${i}`} className="dump__dow">
              {w}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`e${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const d = i + 1;
            const src = photos[d];
            return (
              <div key={d} className={`dump__cell${src ? " has-photo" : ""}${pop === d ? " is-pop" : ""}`} onAnimationEnd={() => setPop(null)}>
                <button
                  type="button"
                  className="dump__slot"
                  onClick={() => {
                    target.current = d;
                    oneRef.current?.click();
                  }}
                  aria-label={src ? t(`Change the photo for day ${d}`, `เปลี่ยนรูปวันที่ ${d}`) : t(`Add a photo for day ${d}`, `เพิ่มรูปวันที่ ${d}`)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local data URLs, nothing for next/image to optimise */}
                  {src && <img src={src} alt="" />}
                  <span className="dump__num">{d}</span>
                  {!src && <span className="dump__plus" aria-hidden>+</span>}
                </button>
                {src && (
                  <button
                    type="button"
                    className="dump__del"
                    onClick={() =>
                      setPhotos((p) => {
                        const n = { ...p };
                        delete n[d];
                        return n;
                      })
                    }
                    aria-label={t(`Remove the photo for day ${d}`, `ลบรูปวันที่ ${d}`)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <input ref={oneRef} id="dump-one" type="file" accept="image/*" hidden onChange={(e) => (putOne(e.target.files?.[0]), (e.target.value = ""))} />
        <input ref={manyRef} id="dump-many" type="file" accept="image/*" multiple hidden onChange={(e) => (putMany(e.target.files), (e.target.value = ""))} />

        <div className="dump__bulk">
          <button type="button" className="btn btn--ghost" onClick={() => manyRef.current?.click()} disabled={adding}>
            {adding ? t("Adding photos…", "กำลังใส่รูป…") : t("＋ Add many photos", "＋ เพิ่มหลายรูปพร้อมกัน")}
          </button>
          {filled > 0 && (
            <button type="button" className="btn btn--text" onClick={() => setPhotos({})}>
              {t("Clear month", "ล้างเดือนนี้")}
            </button>
          )}
        </div>
        <p className="dump__hint muted">{t("Tap a day to add its photo. Photos stay on this device.", "แตะวันที่เพื่อใส่รูป รูปจะเก็บอยู่ในเครื่องนี้เท่านั้น")}</p>

        <div className="tmap__actions">
          <label className="tmap__title">
            <span className="mono muted">{t("Title", "ชื่อบนรูป")}</span>
            <input id="dump-title" value={title} maxLength={30} placeholder={defaultTitle} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <ShapePicker shape={shape} setShape={setShape} />
          <button type="button" className="btn btn--primary" onClick={download} disabled={busy}>
            {busy ? t("Saving…", "กำลังบันทึก…") : t("Download PNG", "ดาวน์โหลดรูป")}
          </button>
        </div>
      </div>
    </div>
  );
}
