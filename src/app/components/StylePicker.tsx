"use client";

import { useLang } from "../i18n";

type Opt<T extends string> = { id: T; en: string; th: string; icon: string; sw: [string, string] };

// Row of style chips plus a live preview of the image about to be downloaded.
export function StylePicker<T extends string>({
  themes,
  value,
  onChange,
  preview,
  shape,
  children,
}: {
  themes: Opt<T>[];
  value: T;
  onChange: (id: T) => void;
  preview: string | null;
  shape: "portrait" | "landscape";
  children?: React.ReactNode;
}) {
  const { t } = useLang();
  return (
    <div className="dump__style">
      <span className="mono muted">{t("Pick a style", "เลือกสไตล์")}</span>
      <div className="dump__themes" role="radiogroup" aria-label={t("Style", "สไตล์")}>
        {themes.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={value === x.id} className={value === x.id ? "is-on" : undefined} onClick={() => onChange(x.id)}>
            <i style={{ background: `linear-gradient(135deg, ${x.sw[0]} 50%, ${x.sw[1]} 50%)` }} aria-hidden>
              {x.icon}
            </i>
            {t(x.en, x.th)}
          </button>
        ))}
      </div>
      {children}
      <figure className={`dump__preview is-${shape}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
        {preview ? <img key={preview} src={preview} alt={t("Preview of the image", "ตัวอย่างรูป")} /> : <span className="dump__preview-wait" />}
      </figure>
    </div>
  );
}

// A light JPEG of the canvas for the on-page preview.
export async function toPreviewUrl(cv: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/jpeg", 0.8));
  return blob ? URL.createObjectURL(blob) : null;
}

export async function saveCanvas(cv: HTMLCanvasElement, name: string) {
  const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));
  if (!blob) throw new Error("no image");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
