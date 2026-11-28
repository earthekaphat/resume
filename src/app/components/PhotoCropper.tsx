"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n";

export type CropJob = { file: File; size: number; label: string; step?: [number, number] };
export type CropResult = { kind: "crop"; src: string } | { kind: "auto" } | { kind: "autoAll" } | { kind: "discard" };

const MAX_ZOOM = 4;

// Square cropper: drag to move, pinch / wheel / slider to zoom.
export function PhotoCropper({ job, onDone }: { job: CropJob; onDone: (r: CropResult) => void }) {
  const { t } = useLang();
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [F, setF] = useState(320);
  const [v, setV] = useState({ x: 0, y: 0, z: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(job.file);
    const id = window.setTimeout(() => setUrl(u), 0);
    return () => {
      clearTimeout(id);
      URL.revokeObjectURL(u);
    };
  }, [job.file]);

  useEffect(() => {
    const measure = () => frameRef.current && setF(frameRef.current.clientWidth);
    const id = window.setTimeout(measure, 0);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const base = nat ? F / Math.min(nat.w, nat.h) : 1;
  const sc = base * v.z;

  // Keep the photo covering the whole frame.
  const clamp = (x: number, y: number, z: number) => {
    if (!nat) return { x, y, z };
    const s = base * z;
    return { x: Math.min(0, Math.max(F - nat.w * s, x)), y: Math.min(0, Math.max(F - nat.h * s, y)), z };
  };

  function onLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const im = e.currentTarget;
    imgRef.current = im;
    const n = { w: im.naturalWidth, h: im.naturalHeight };
    setNat(n);
    const b = F / Math.min(n.w, n.h);
    setV({ x: (F - n.w * b) / 2, y: (F - n.h * b) / 2, z: 1 });
  }

  // Zoom around a point in the frame (default: the centre).
  function zoomTo(z: number, cx = F / 2, cy = F / 2) {
    setV((o) => {
      const nz = Math.min(MAX_ZOOM, Math.max(1, z));
      const k = nz / o.z;
      return clamp(cx - (cx - o.x) * k, cy - (cy - o.y) * k, nz);
    });
  }

  function local(e: React.PointerEvent) {
    const r = frameRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  }

  function down(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: v.z };
    }
  }

  function move(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo((pinch.current.z * d) / pinch.current.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (pointers.current.size === 1) {
      setV((o) => clamp(o.x + p.x - prev.x, o.y + p.y - prev.y, o.z));
    }
  }

  function up(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function wheel(e: React.WheelEvent) {
    const r = frameRef.current?.getBoundingClientRect();
    zoomTo(v.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - (r?.left ?? 0), e.clientY - (r?.top ?? 0));
  }

  function save() {
    const im = imgRef.current;
    if (!im || !nat) return;
    const cv = document.createElement("canvas");
    cv.width = cv.height = job.size;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(im, -v.x / sc, -v.y / sc, F / sc, F / sc, 0, 0, job.size, job.size);
    onDone({ kind: "crop", src: cv.toDataURL("image/jpeg", 0.85) });
  }

  return (
    <div className="crop" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <div className="crop__card">
        <div className="crop__head">
          <p id="crop-title">
            {t("Crop photo", "ครอปรูป")} · <b>{job.label}</b>
          </p>
          {job.step && <span className="mono muted">{`${job.step[0]} / ${job.step[1]}`}</span>}
          <button type="button" className="crop__x" onClick={() => onDone({ kind: "discard" })} aria-label={t("Don’t add this photo", "ไม่ใส่รูปนี้")}>
            ✕
          </button>
        </div>

        <div ref={frameRef} className="crop__frame" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
          {url && (
            // eslint-disable-next-line @next/next/no-img-element -- local file being cropped
            <img src={url} alt="" draggable={false} onLoad={onLoad} style={{ left: v.x, top: v.y, width: nat ? nat.w * sc : undefined, height: nat ? nat.h * sc : undefined, opacity: nat ? 1 : 0 }} />
          )}
          <i className="crop__grid" aria-hidden />
        </div>

        <label className="crop__zoom">
          <span aria-hidden>－</span>
          <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={v.z} onChange={(e) => zoomTo(Number(e.target.value))} aria-label={t("Zoom", "ซูม")} />
          <span aria-hidden>＋</span>
        </label>
        <p className="crop__hint muted">{t("Drag to move · pinch or slide to zoom", "ลากเพื่อเลื่อน · ถ่างนิ้วหรือเลื่อนแถบเพื่อซูม")}</p>

        <div className="crop__actions">
          <button type="button" className="btn btn--primary" onClick={save} disabled={!nat}>
            {t("Use this crop", "ใช้ตามนี้")}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => onDone({ kind: "auto" })}>
            {t("Auto (centre)", "อัตโนมัติ (ตรงกลาง)")}
          </button>
          {job.step && job.step[0] < job.step[1] && (
            <button type="button" className="btn btn--text" onClick={() => onDone({ kind: "autoAll" })}>
              {t("Auto the rest", "ที่เหลืออัตโนมัติ")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
