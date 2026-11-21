"use client";

import { useRef, useState } from "react";
import { useLang } from "../i18n";

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  startYear: number;
  flags?: Map<string, string>; // day → flag emoji already on the calendar
};

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// One month at a time. Tap the first day, then tap (or drag to) the last day.
// The end can never land before the start: picking an earlier day starts over from it.
export function RangePicker({ from, to, onChange, startYear, flags }: Props) {
  const { t, lang } = useLang();
  const [view, setView] = useState(() => {
    const base = from ? new Date(from + "T00:00:00") : new Date(startYear, new Date().getMonth(), 1);
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const drag = useRef<{ anchor: string; moved: boolean } | null>(null);

  const days = new Date(view.y, view.m + 1, 0).getDate();
  const lead = new Date(view.y, view.m, 1).getDay();
  const title = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(new Date(view.y, view.m, 1));
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(lang, { weekday: "narrow" }).format(new Date(2024, 0, 7 + i)));

  function shift(n: number) {
    setView(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const dayAt = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-day]")?.dataset.day;

  function down(day: string) {
    drag.current = { anchor: day, moved: false };
    if (from && !to && day >= from) onChange(from, day);
    else onChange(day, "");
  }

  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    const day = dayAt(e.clientX, e.clientY);
    if (!day || day === drag.current.anchor) return;
    drag.current.moved = true;
    const a = drag.current.anchor;
    onChange(day < a ? day : a, day < a ? a : day);
  }

  const end = to || from;
  return (
    <div className="rpick">
      <div className="rpick__head">
        <button type="button" onClick={() => shift(-1)} aria-label={t("Previous month", "เดือนก่อน")}>
          ‹
        </button>
        <b>{title}</b>
        <button type="button" onClick={() => shift(1)} aria-label={t("Next month", "เดือนถัดไป")}>
          ›
        </button>
      </div>
      <div className="rpick__grid" onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
        {weekdays.map((w, i) => (
          <span key={`w${i}`} className="rpick__dow">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = iso(view.y, view.m, i + 1);
          const inRange = from && day >= from && day <= end;
          const cls = ["rpick__day", inRange ? "is-in" : "", day === from ? "is-start" : "", day === end && from ? "is-end" : ""].filter(Boolean).join(" ");
          return (
            <button
              key={day}
              type="button"
              data-day={day}
              className={cls}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                down(day);
              }}
            >
              {i + 1}
              {flags?.get(day) && <small aria-hidden>{flags.get(day)}</small>}
            </button>
          );
        })}
      </div>
      <p className="rpick__summary mono">
        {from ? (
          <>
            {from}
            {to && to !== from ? ` → ${to}` : ""}
            {!to && <span className="muted"> · {t("now tap the last day", "แตะวันกลับต่อ")}</span>}
          </>
        ) : (
          <span className="muted">{t("Tap the first day, then the last day (or drag across)", "แตะวันไป แล้วแตะวันกลับ (หรือลากนิ้วข้ามวัน)")}</span>
        )}
      </p>
    </div>
  );
}
