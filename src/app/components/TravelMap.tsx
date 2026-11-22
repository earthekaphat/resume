"use client";

import { geoArea, geoCentroid, geoMercator, geoNaturalEarth1, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useLang } from "../i18n";
import { MAP_THEMES, renderMap, type MapInput, type MapThemeId } from "../mapThemes";
import { saveCanvas, StylePicker, toPreviewUrl } from "./StylePicker";

export type MapKind = "world" | "thailand";

const SITE_URL = "earthekaphat.vercel.app/map";
const THEME_STORE = "earth-map-theme";
// Fixed palette so the on-page map and the downloaded image match.
const C = { sea: "#0E151C", land: "#2A3643", visited: "#3DDC97", edge: "#0E151C", dot: "#3DDC97", text: "#E8EEF5", muted: "#8D9BAB" };

type Unit = { one: string; many: string; th: string };
type Cfg = {
  W: number;
  H: number;
  total: number;
  store: string;
  file: string;
  unit: Unit;
  whole: [string, string];
  title: [string, string];
  search: [string, string];
  loading: [string, string];
};

const CFG: Record<MapKind, Cfg> = {
  world: {
    W: 960,
    H: 500,
    total: 195, // UN member and observer states
    store: "earth-travel-map",
    file: "travel-map",
    unit: { one: "country", many: "countries", th: "ประเทศ" },
    whole: ["of the world", "ของโลก"],
    title: ["Places I’ve been", "ประเทศที่ฉันเคยไป"],
    search: ["Search a country, or tap it on the map", "ค้นหาประเทศ หรือแตะบนแผนที่"],
    loading: ["Loading the world…", "กำลังโหลดแผนที่โลก…"],
  },
  thailand: {
    W: 520,
    H: 900,
    total: 77,
    store: "earth-thai-map",
    file: "thailand-map",
    unit: { one: "province", many: "provinces", th: "จังหวัด" },
    whole: ["of Thailand", "ของประเทศไทย"],
    title: ["Provinces I’ve been to", "จังหวัดที่ฉันเคยไป"],
    search: ["Search a province, or tap it on the map", "ค้นหาจังหวัด หรือแตะบนแผนที่"],
    loading: ["Loading Thailand…", "กำลังโหลดแผนที่ประเทศไทย…"],
  },
};

// Natural Earth uses short names; spell out the ones people search for.
const NICE: Record<string, string> = {
  "United States of America": "United States",
  "Dem. Rep. Congo": "DR Congo",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Central African Rep.": "Central African Republic",
  "Dominican Rep.": "Dominican Republic",
  "Eq. Guinea": "Equatorial Guinea",
  "S. Sudan": "South Sudan",
  Macedonia: "North Macedonia",
  "Antigua and Barb.": "Antigua and Barbuda",
  "St. Vin. and Gren.": "St Vincent and the Grenadines",
  "St. Kitts and Nevis": "St Kitts and Nevis",
  "W. Sahara": "Western Sahara",
  "Solomon Is.": "Solomon Islands",
  "Marshall Is.": "Marshall Islands",
  "Faeroe Is.": "Faroe Islands",
  "Falkland Is.": "Falkland Islands",
  "Cayman Is.": "Cayman Islands",
  "Cook Is.": "Cook Islands",
  "British Virgin Is.": "British Virgin Islands",
  "U.S. Virgin Is.": "US Virgin Islands",
  "N. Mariana Is.": "Northern Mariana Islands",
  "Fr. Polynesia": "French Polynesia",
  "N. Cyprus": "Northern Cyprus",
  eSwatini: "Eswatini",
  "Turks and Caicos Is.": "Turks and Caicos Islands",
  "Pitcairn Is.": "Pitcairn Islands",
  "Wallis and Futuna Is.": "Wallis and Futuna",
  "S. Geo. and the Is.": "South Georgia",
  "St. Pierre and Miquelon": "St Pierre and Miquelon",
  "São Tomé and Principe": "São Tomé and Príncipe",
};
const HIDDEN = new Set(["Antarctica", "Siachen Glacier", "Ashmore and Cartier Is.", "Indian Ocean Ter.", "Heard I. and McDonald Is.", "Fr. S. Antarctic Lands", "Br. Indian Ocean Ter."]);

type Region = { name: string; th: string; d: string; dot: [number, number] | null };

// Loads the shapes for a map and projects them into SVG paths that fit W×H.
async function loadRegions(kind: MapKind, W: number, H: number): Promise<Region[]> {
  let feats: Feature<Geometry, { name: string; th: string }>[];
  let projection: GeoProjection;
  const box: [[number, number], [number, number]] = [
    [8, 8],
    [W - 8, H - 8],
  ];
  if (kind === "world") {
    const topo: Topology<{ countries: GeometryCollection<{ name: string }> }> = await (await fetch("/countries-50m.json")).json();
    const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
    feats = fc.features
      .filter((f) => !HIDDEN.has(f.properties.name))
      .map((f) => {
        const name = NICE[f.properties.name] ?? f.properties.name;
        return { ...f, properties: { name, th: name } };
      });
    projection = geoNaturalEarth1().fitExtent(box, { type: "FeatureCollection", features: feats });
  } else {
    const fc: FeatureCollection<Geometry, { n: string; th: string }> = await (await fetch("/thailand-provinces.json")).json();
    feats = fc.features.map((f) => ({ ...f, properties: { name: f.properties.n, th: f.properties.th } }));
    projection = geoMercator().fitExtent(box, { type: "FeatureCollection", features: feats });
  }
  const path = geoPath(projection);
  return feats
    .map((f) => {
      // Tiny countries vanish at world scale; mark them with a dot instead.
      const small = kind === "world" && geoArea(f) < 0.00012;
      const c = small ? projection(geoCentroid(f)) : null;
      return { name: f.properties.name, th: f.properties.th, d: path(f) ?? "", dot: c ? ([c[0], c[1]] as [number, number]) : null };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function TravelMap({ kind = "world" }: { kind?: MapKind }) {
  const { t, lang } = useLang();
  const cfg = CFG[kind];
  const { W, H } = cfg;
  const [regions, setRegions] = useState<Region[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [shape, setShape] = useState<"portrait" | "landscape">("portrait");
  const [theme, setTheme] = useState<MapThemeId>("midnight");
  const [preview, setPreview] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;
    loadRegions(kind, W, H)
      .then((list) => alive && setRegions(list))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [kind, W, H]);

  // Restore the last selection on this device (after first paint).
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(cfg.store) || "null");
        if (saved && Array.isArray(saved.picked)) setPicked(new Set(saved.picked.map(String)));
        if (saved && typeof saved.title === "string") setTitle(saved.title);
        const th = localStorage.getItem(THEME_STORE);
        if (MAP_THEMES.some((x) => x.id === th)) setTheme(th as MapThemeId);
      } catch {}
      loaded.current = true;
    }, 0);
    return () => clearTimeout(id);
  }, [cfg.store]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(cfg.store, JSON.stringify({ picked: [...picked], title }));
    } catch {}
  }, [picked, title, cfg.store]);

  function toggle(name: string) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  }

  const labelOf = useMemo(() => {
    const m = new Map<string, string>();
    regions?.forEach((r) => m.set(r.name, lang === "th" ? r.th : r.name));
    return (n: string) => m.get(n) ?? n;
  }, [regions, lang]);

  const matches = useMemo(() => {
    if (!regions) return [];
    const q = query.trim().toLowerCase();
    const list = q ? regions.filter((r) => r.name.toLowerCase().includes(q) || r.th.includes(query.trim())) : regions;
    return lang === "th" && kind === "thailand" ? [...list].sort((a, b) => a.th.localeCompare(b.th, "th")) : list;
  }, [regions, query, lang, kind]);

  const count = picked.size;
  const defaultTitle = t(cfg.title[0], cfg.title[1]);
  const pct = Math.round((count / cfg.total) * 100);
  const unitWord = t(count === 1 ? cfg.unit.one : cfg.unit.many, cfg.unit.th);

  const input: MapInput | null = regions
    ? {
        kind,
        regions,
        picked,
        W,
        H,
        title: title.trim() || defaultTitle,
        subtitle: t(`${count} ${unitWord} · ${pct}% ${cfg.whole[0]}`, `${count} ${cfg.unit.th} · ${pct}% ${cfg.whole[1]}`),
        names: [...picked].map(labelOf).sort((a, b) => a.localeCompare(b, lang)),
        more: (n) => t(`+${n} more`, `+อีก ${n}`),
        shape,
        site: SITE_URL,
        theme,
      }
    : null;
  const inputKey = input ? JSON.stringify([kind, [...picked].sort(), input.title, input.subtitle, lang, shape, theme]) : "";

  // Redraw the preview shortly after anything changes.
  useEffect(() => {
    if (!input) return;
    let alive = true;
    let url: string | null = null;
    const id = window.setTimeout(async () => {
      try {
        url = await toPreviewUrl(await renderMap(input));
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

  function pickTheme(id: MapThemeId) {
    setTheme(id);
    try {
      localStorage.setItem(THEME_STORE, id);
    } catch {}
  }

  // Portrait is a 1080×1920 Instagram story (content kept clear of the top and bottom
  // ~250px the story UI covers); landscape is 1920×1080.
  async function download() {
    if (!input) return;
    setBusy(true);
    try {
      await saveCanvas(await renderMap(input), `${cfg.file}-${theme}-${shape}.png`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`tmap tmap--${kind}`}>
      <div className="tmap__card">
        <div className="tmap__stats">
          <div>
            <b className="mono">{count}</b>
            <span>{unitWord}</span>
          </div>
          <div>
            <b className="mono">{pct}%</b>
            <span>{t(cfg.whole[0], cfg.whole[1])}</span>
          </div>
          <div className="tmap__bar" aria-hidden>
            <i style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>

        <div className="tmap__map">
          {!regions && (
            <p className="tmap__loading muted">{failed ? t("Couldn’t load the map. Refresh to try again.", "โหลดแผนที่ไม่ได้ ลองรีเฟรชอีกครั้ง") : t(cfg.loading[0], cfg.loading[1])}</p>
          )}
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map with ${count} visited ${cfg.unit.many} highlighted`}>
            <rect width={W} height={H} fill={C.sea} />
            {regions?.map((r) => {
              const on = picked.has(r.name);
              return (
                <path key={r.name} d={r.d} fill={on ? C.visited : C.land} stroke={C.edge} strokeWidth={kind === "world" ? 0.5 : 0.8} onClick={() => toggle(r.name)} className="tmap__country">
                  <title>{labelOf(r.name)}</title>
                </path>
              );
            })}
            {regions?.map((r) =>
              r.dot && picked.has(r.name) ? (
                <circle key={`${r.name}-dot`} cx={r.dot[0]} cy={r.dot[1]} r={4} fill={C.dot} stroke={C.edge} strokeWidth={1.5}>
                  <title>{labelOf(r.name)}</title>
                </circle>
              ) : null,
            )}
          </svg>
        </div>

        {regions && <StylePicker themes={MAP_THEMES} value={theme} onChange={pickTheme} preview={preview} shape={shape} />}

        <div className="tmap__actions">
          <label className="tmap__title">
            <span className="mono muted">{t("Image title", "ชื่อบนรูป")}</span>
            <input id={`${kind}-map-title`} value={title} maxLength={40} placeholder={defaultTitle} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <ShapePicker shape={shape} setShape={setShape} />
          <button type="button" className="btn btn--primary" onClick={download} disabled={!regions || busy}>
            {busy ? t("Saving…", "กำลังบันทึก…") : t("Download PNG", "ดาวน์โหลดรูป")}
          </button>
        </div>
      </div>

      <div className="tmap__card">
        <label className="tmap__search">
          <span className="sr-only">{t(cfg.search[0], cfg.search[1])}</span>
          <input id={`${kind}-search`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(cfg.search[0], cfg.search[1])} autoComplete="off" />
        </label>

        {count > 0 && (
          <div className="tmap__picked">
            <div className="tmap__picked-head">
              <span className="mono muted">{t("Visited", "เคยไปแล้ว")}</span>
              <button type="button" className="btn btn--text" onClick={() => setPicked(new Set())}>
                {t("Clear all", "ล้างทั้งหมด")}
              </button>
            </div>
            <ul>
              {[...picked]
                .sort((a, b) => labelOf(a).localeCompare(labelOf(b), lang))
                .map((n) => (
                  <li key={n}>
                    <button type="button" onClick={() => toggle(n)} aria-label={`Remove ${labelOf(n)}`}>
                      {labelOf(n)} <span aria-hidden>×</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <ul className="tmap__list" aria-label={cfg.unit.many}>
          {matches.map((r) => {
            const on = picked.has(r.name);
            return (
              <li key={r.name}>
                <button
                  type="button"
                  className={on ? "is-on" : undefined}
                  aria-pressed={on}
                  onClick={() => {
                    toggle(r.name);
                    // After picking from a search, clear it so the next one can be typed straight away.
                    if (query) setQuery("");
                  }}
                >
                  <span className="tmap__check" aria-hidden>
                    {on ? "✓" : ""}
                  </span>
                  {labelOf(r.name)}
                </button>
              </li>
            );
          })}
          {regions && matches.length === 0 && <li className="muted tmap__none">{t(`Nothing matches “${query}”.`, `ไม่พบที่ตรงกับ “${query}”`)}</li>}
        </ul>
      </div>
    </div>
  );
}

export function ShapePicker({ shape, setShape }: { shape: "portrait" | "landscape"; setShape: (s: "portrait" | "landscape") => void }) {
  const { t } = useLang();
  return (
    <div className="tmap__shape" role="radiogroup" aria-label="Image shape">
      {(["portrait", "landscape"] as const).map((k) => (
        <button key={k} type="button" role="radio" aria-checked={shape === k} className={shape === k ? "is-on" : undefined} onClick={() => setShape(k)}>
          <i className={`tmap__shape-icon is-${k}`} aria-hidden />
          {k === "portrait" ? t("Portrait", "แนวตั้ง") : t("Landscape", "แนวนอน")}
        </button>
      ))}
    </div>
  );
}
