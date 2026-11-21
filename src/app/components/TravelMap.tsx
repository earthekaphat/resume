"use client";

import { geoArea, geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

const STORE = "earth-travel-map";
const W = 960;
const H = 500;
const WORLD = 195; // UN member and observer states
// Fixed palette so the on-page map and the downloaded image match.
const C = { sea: "#0E151C", land: "#2A3643", visited: "#3DDC97", edge: "#0E151C", dot: "#3DDC97", text: "#E8EEF5", muted: "#8D9BAB" };

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

type Country = { name: string; d: string; dot: [number, number] | null };

export function TravelMap() {
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("Places I’ve been");
  const [busy, setBusy] = useState(false);
  const [shape, setShape] = useState<"portrait" | "landscape">("portrait");
  const svgRef = useRef<SVGSVGElement>(null);
  const loaded = useRef(false);

  // Load the world shapes once and project them to SVG paths.
  useEffect(() => {
    let alive = true;
    fetch("/countries-50m.json")
      .then((r) => r.json())
      .then((topo: Topology<{ countries: GeometryCollection<{ name: string }> }>) => {
        const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
        const shown = fc.features.filter((f) => !HIDDEN.has(f.properties.name));
        const projection = geoNaturalEarth1().fitExtent(
          [
            [8, 8],
            [W - 8, H - 8],
          ],
          { type: "FeatureCollection", features: shown },
        );
        const path = geoPath(projection);
        const list = shown
          .map((f: Feature<Geometry, { name: string }>) => {
            const name = NICE[f.properties.name] ?? f.properties.name;
            // Tiny countries vanish at world scale; mark them with a dot instead.
            const small = geoArea(f) < 0.00012;
            const c = small ? projection(geoCentroid(f)) : null;
            return { name, d: path(f) ?? "", dot: c ? ([c[0], c[1]] as [number, number]) : null };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        if (alive) setCountries(list);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // Restore the last selection on this device (after first paint).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORE) || "null");
        if (saved && Array.isArray(saved.picked)) setPicked(new Set(saved.picked.map(String)));
        if (saved && typeof saved.title === "string") setTitle(saved.title);
      } catch {}
      loaded.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ picked: [...picked], title }));
    } catch {}
  }, [picked, title]);

  function toggle(name: string) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  }

  const matches = useMemo(() => {
    if (!countries) return [];
    const q = query.trim().toLowerCase();
    return q ? countries.filter((c) => c.name.toLowerCase().includes(q)) : countries;
  }, [countries, query]);

  const count = picked.size;
  const pct = Math.round((count / WORLD) * 100);

  // Draw the map onto a 1920×1080 canvas with a title, then save it as a PNG.
  async function download() {
    const svg = svgRef.current;
    if (!svg) return;
    setBusy(true);
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(W));
      clone.setAttribute("height", String(H));
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("map image failed"));
        img.src = url;
      });
      // Portrait 1080×1350 (Instagram post) lists the countries under the map; landscape is 1920×1080.
      const tall = shape === "portrait";
      const cv = document.createElement("canvas");
      cv.width = tall ? 1080 : 1920;
      cv.height = tall ? 1350 : 1080;
      const ctx = cv.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      const sans = "system-ui, -apple-system, Segoe UI, sans-serif";
      const mono = "ui-monospace, Menlo, monospace";
      const left = tall ? 64 : 80;
      ctx.fillStyle = C.sea;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = C.text;
      ctx.font = `800 ${tall ? 60 : 64}px ${sans}`;
      ctx.fillText(title.trim() || "Places I’ve been", left, tall ? 118 : 120);
      ctx.fillStyle = C.visited;
      ctx.font = `600 ${tall ? 32 : 34}px ${mono}`;
      ctx.fillText(`${count} ${count === 1 ? "country" : "countries"} · ${pct}% of the world`, left, tall ? 172 : 180);
      const mapW = tall ? 1000 : 1560;
      const mapH = (mapW / W) * H;
      const mapY = tall ? 220 : 215;
      ctx.drawImage(img, (cv.width - mapW) / 2, mapY, mapW, mapH);
      if (tall && count > 0) {
        // Country names in three columns below the map, with "+N more" if they run out of room.
        const names = [...picked].sort();
        const top = mapY + mapH + 70;
        const lineH = 42;
        const cols = 3;
        const maxRows = Math.max(1, Math.floor((cv.height - top - 90) / lineH));
        const room = maxRows * cols;
        // Balance the columns instead of filling the first one to the bottom.
        const rows = Math.min(maxRows, Math.max(1, Math.ceil(names.length / cols)));
        const shown = names.length > room ? names.slice(0, room - 1) : names;
        ctx.font = `500 27px ${sans}`;
        const colW = (cv.width - left * 2) / cols;
        shown.forEach((n, i) => {
          const x = left + Math.floor(i / rows) * colW;
          const y = top + (i % rows) * lineH;
          ctx.fillStyle = C.visited;
          ctx.beginPath();
          ctx.arc(x + 7, y - 9, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = C.text;
          let label = n;
          while (ctx.measureText(label).width > colW - 36 && label.length > 4) label = label.slice(0, -2) + "…";
          ctx.fillText(label, x + 24, y);
        });
        if (names.length > shown.length) {
          const i = shown.length;
          ctx.fillStyle = C.muted;
          ctx.fillText(`+${names.length - shown.length} more`, left + Math.floor(i / rows) * colW + 24, top + (i % rows) * lineH);
        }
      }
      ctx.fillStyle = C.muted;
      ctx.font = `500 ${tall ? 22 : 24}px ${mono}`;
      ctx.fillText("resume-dv5u.vercel.app/map", left, cv.height - 36);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));
      if (!blob) throw new Error("no image");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `travel-map-${shape}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tmap">
      <div className="tmap__card">
        <div className="tmap__stats">
          <div>
            <b className="mono">{count}</b>
            <span>{count === 1 ? "country" : "countries"}</span>
          </div>
          <div>
            <b className="mono">{pct}%</b>
            <span>of the world</span>
          </div>
          <div className="tmap__bar" aria-hidden>
            <i style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>

        <div className="tmap__map">
          {!countries && <p className="tmap__loading muted">{failed ? "Couldn’t load the map. Refresh to try again." : "Loading the world…"}</p>}
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`World map with ${count} visited countries highlighted`}>
            <rect width={W} height={H} fill={C.sea} />
            {countries?.map((c) => {
              const on = picked.has(c.name);
              return (
                <path key={c.name} d={c.d} fill={on ? C.visited : C.land} stroke={C.edge} strokeWidth={0.5} onClick={() => toggle(c.name)} className="tmap__country">
                  <title>{c.name}</title>
                </path>
              );
            })}
            {countries?.map((c) =>
              c.dot && picked.has(c.name) ? (
                <circle key={`${c.name}-dot`} cx={c.dot[0]} cy={c.dot[1]} r={4} fill={C.dot} stroke={C.edge} strokeWidth={1.5}>
                  <title>{c.name}</title>
                </circle>
              ) : null,
            )}
          </svg>
        </div>

        <div className="tmap__actions">
          <label className="tmap__title">
            <span className="mono muted">Image title</span>
            <input id="map-title" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="tmap__shape" role="radiogroup" aria-label="Image shape">
            {(["portrait", "landscape"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={shape === k} className={shape === k ? "is-on" : undefined} onClick={() => setShape(k)}>
                <i className={`tmap__shape-icon is-${k}`} aria-hidden />
                {k === "portrait" ? "Portrait" : "Landscape"}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--primary" onClick={download} disabled={!countries || busy}>
            {busy ? "Saving…" : "Download PNG"}
          </button>
        </div>
      </div>

      <div className="tmap__card">
        <label className="tmap__search">
          <span className="sr-only">Search countries</span>
          <input id="country-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a country, or tap it on the map" autoComplete="off" />
        </label>

        {count > 0 && (
          <div className="tmap__picked">
            <div className="tmap__picked-head">
              <span className="mono muted">Visited</span>
              <button type="button" className="btn btn--text" onClick={() => setPicked(new Set())}>
                Clear all
              </button>
            </div>
            <ul>
              {[...picked].sort().map((n) => (
                <li key={n}>
                  <button type="button" onClick={() => toggle(n)} aria-label={`Remove ${n}`}>
                    {n} <span aria-hidden>×</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="tmap__list" aria-label="Countries">
          {matches.map((c) => {
            const on = picked.has(c.name);
            return (
              <li key={c.name}>
                <button
                  type="button"
                  className={on ? "is-on" : undefined}
                  aria-pressed={on}
                  onClick={() => {
                    toggle(c.name);
                    // After picking from a search, clear it so the next country can be typed straight away.
                    if (query) setQuery("");
                  }}
                >
                  <span className="tmap__check" aria-hidden>
                    {on ? "✓" : ""}
                  </span>
                  {c.name}
                </button>
              </li>
            );
          })}
          {countries && matches.length === 0 && <li className="muted tmap__none">No country matches “{query}”.</li>}
        </ul>
      </div>
    </div>
  );
}
