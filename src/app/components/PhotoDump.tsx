"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n";
import { deleteMonth, loadMonth, saveMonth, shrinkPhoto } from "../photoStore";
import { renderDump, THEMES, usesCover, type DumpInput, type ThemeId } from "../dumpThemes";
import { PhotoCropper, type CropJob, type CropResult } from "./PhotoCropper";
import { saveCanvas, StylePicker, toPreviewUrl } from "./StylePicker";
import { ShapePicker } from "./TravelMap";

const SITE_URL = "earthekaphat.vercel.app/map";
const THEME_STORE = "earth-dump-theme";

const keyOf = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;

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
  const [theme, setTheme] = useState<ThemeId>("midnight");
  const [preview, setPreview] = useState<string | null>(null);
  const [coverDay, setCoverDay] = useState(0);
  const [coverSrc, setCoverSrc] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const [cropJob, setCropJob] = useState<CropJob | null>(null);
  const cropDone = useRef<((r: CropResult) => void) | null>(null);

  // Open the cropper and wait for the person's choice.
  const askCrop = (job: CropJob) =>
    new Promise<CropResult>((res) => {
      cropDone.current = res;
      setCropJob(job);
    });

  // Start on the current month (after first paint, so the prerendered HTML matches).
  useEffect(() => {
    const id = window.setTimeout(() => {
      const now = new Date();
      setYm({ y: now.getFullYear(), m: now.getMonth() });
      try {
        const saved = localStorage.getItem(THEME_STORE);
        if (THEMES.some((x) => x.id === saved)) setTheme(saved as ThemeId);
      } catch {}
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
        setCoverDay(d?.coverDay ?? 0);
        setCoverSrc(d?.coverSrc ?? "");
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
    const empty = !title && !coverSrc && Object.keys(photos).length === 0;
    (empty ? deleteMonth(key) : saveMonth(key, { title, photos, coverDay, coverSrc })).catch(() => {});
  }, [ym, title, photos, coverDay, coverSrc]);

  // Everything the image needs, or null before the month is known.
  const input: DumpInput | null = ym
    ? (() => {
        const d = new Date(ym.y, ym.m, 1);
        const n = Object.keys(photos).length;
        const monthYear = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(d);
        const short = new Intl.DateTimeFormat(lang, { month: "short" }).format(d);
        return {
          y: ym.y,
          m: ym.m,
          title: title.trim() || `${short} dump`,
          custom: !!title.trim(),
          monthName: new Intl.DateTimeFormat(lang, { month: "long" }).format(d),
          monthYear,
          subtitle: t(`${monthYear} · ${n} ${n === 1 ? "day" : "days"}`, `${monthYear} · ${n} วัน`),
          photos,
          cover: coverSrc || photos[coverDay] || undefined,
          shape,
          lang,
          site: SITE_URL,
          theme,
        };
      })()
    : null;
  const inputKey = input ? JSON.stringify({ ...input, cover: input.cover?.length, photos: Object.keys(photos).map((k) => k + photos[Number(k)].length) }) : "";

  // Redraw the small preview shortly after anything changes.
  useEffect(() => {
    if (!input) return;
    let alive = true;
    let url: string | null = null;
    const id = window.setTimeout(async () => {
      try {
        url = await toPreviewUrl(await renderDump(input));
        if (alive && url) setPreview(url);
      } catch {}
    }, 250);
    return () => {
      alive = false;
      clearTimeout(id);
      if (url) setTimeout(() => URL.revokeObjectURL(url as string), 1000);
    };
    // inputKey stands in for input, which is a new object every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey]);

  if (!ym || !input) return <div className="tmap__card dump dump--loading" />;

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
    const r = await askCrop({ file, size: 480, label: t(`Day ${day}`, `วันที่ ${day}`) });
    if (r.kind === "discard") return;
    setAdding(true);
    try {
      const src = r.kind === "crop" ? r.src : await shrinkPhoto(file);
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
    // Decide each photo's day first, then crop them one by one.
    const plan: [number, File][] = [];
    const taken = new Set(Object.keys(photos).map(Number));
    const queue: File[] = [];
    for (const f of Array.from(files)) {
      const d = new Date(f.lastModified);
      if (d.getFullYear() === y && d.getMonth() === m && !taken.has(d.getDate())) {
        taken.add(d.getDate());
        plan.push([d.getDate(), f]);
      } else queue.push(f);
    }
    for (let day = 1; day <= days && queue.length; day++) if (!taken.has(day)) plan.push([day, queue.shift() as File]);
    plan.sort((a, b) => a[0] - b[0]);

    let auto = false;
    for (let i = 0; i < plan.length; i++) {
      const [day, f] = plan[i];
      const r = auto ? ({ kind: "auto" } as CropResult) : await askCrop({ file: f, size: 480, label: t(`Day ${day}`, `วันที่ ${day}`), step: [i + 1, plan.length] });
      if (r.kind === "discard") continue;
      if (r.kind === "autoAll") auto = true;
      setAdding(true);
      try {
        const src = r.kind === "crop" ? r.src : await shrinkPhoto(f);
        setPhotos((p) => ({ ...p, [day]: src }));
        setPop(day);
      } finally {
        setAdding(false);
      }
    }
  }

  function pickTheme(id: ThemeId) {
    setTheme(id);
    try {
      localStorage.setItem(THEME_STORE, id);
    } catch {}
  }

  async function download() {
    if (!input) return;
    setBusy(true);
    try {
      await saveCanvas(await renderDump(input), `${keyOf(y, m)}-dump-${theme}-${shape}.png`);
    } finally {
      setBusy(false);
    }
  }

  async function putCover(file: File | undefined) {
    if (!file) return;
    const r = await askCrop({ file, size: 720, label: t("Cover", "รูปปก") });
    if (r.kind === "discard") return;
    setAdding(true);
    try {
      setCoverSrc(r.kind === "crop" ? r.src : await shrinkPhoto(file, 720));
    } finally {
      setAdding(false);
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

        <StylePicker themes={THEMES} value={theme} onChange={pickTheme} preview={preview} shape={shape}>
          {usesCover(theme, shape) && (
            <div className="dump__cover">
              <span className="mono muted">{t("Cover photo", "รูปปก")}</span>
              <div className="dump__covers" role="radiogroup" aria-label={t("Cover photo", "รูปปก")}>
                <button type="button" role="radio" aria-checked={!coverSrc && !photos[coverDay]} className={`dump__auto${!coverSrc && !photos[coverDay] ? " is-on" : ""}`} onClick={() => (setCoverSrc(""), setCoverDay(0))}>
                  {t("Auto", "อัตโนมัติ")}
                </button>
                {coverSrc && (
                  <button type="button" role="radio" aria-checked className="is-on" onClick={() => setCoverSrc("")} aria-label={t("Remove the uploaded cover", "เอารูปปกที่อัปโหลดออก")}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                    <img src={coverSrc} alt="" />
                    <span className="dump__cover-x" aria-hidden>
                      ×
                    </span>
                  </button>
                )}
                {Object.keys(photos)
                  .map(Number)
                  .sort((a, b) => a - b)
                  .map((d) => {
                    const on = !coverSrc && coverDay === d;
                    return (
                      <button key={d} type="button" role="radio" aria-checked={on} className={on ? "is-on" : undefined} onClick={() => (setCoverSrc(""), setCoverDay(d))} aria-label={t(`Use day ${d} as the cover`, `ใช้รูปวันที่ ${d} เป็นปก`)}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                        <img src={photos[d]} alt="" />
                        <span className="dump__cover-day">{d}</span>
                      </button>
                    );
                  })}
                <button type="button" className="dump__upload" onClick={() => coverRef.current?.click()} disabled={adding}>
                  {t("＋ Upload", "＋ อัปโหลด")}
                </button>
              </div>
              <input ref={coverRef} id="dump-cover" type="file" accept="image/*" hidden onChange={(e) => (putCover(e.target.files?.[0]), (e.target.value = ""))} />
            </div>
          )}
        </StylePicker>

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
      {cropJob && (
        <PhotoCropper
          key={cropJob.file.name + cropJob.label}
          job={cropJob}
          onDone={(r) => {
            setCropJob(null);
            cropDone.current?.(r);
            cropDone.current = null;
          }}
        />
      )}
    </div>
  );
}
