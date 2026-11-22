// Draws the world / Thailand "places I've been" map as a story (1080×1920) or
// landscape (1920×1080) image in one of several looks.
import { cloud, emoji, fam, fit, SAFE, seeded, type Shape } from "./dumpThemes";

export type MapThemeId = "midnight" | "vintage" | "pastel" | "neon" | "minimal";

export const MAP_THEMES: { id: MapThemeId; en: string; th: string; icon: string; sw: [string, string] }[] = [
  { id: "midnight", en: "Midnight", th: "มิดไนท์", icon: "🌙", sw: ["#0E151C", "#3DDC97"] },
  { id: "vintage", en: "Vintage", th: "วินเทจ", icon: "🧭", sw: ["#D9C7A0", "#B5523B"] },
  { id: "pastel", en: "Pastel sky", th: "พาสเทล", icon: "✈️", sw: ["#8FD3FF", "#FF5FA2"] },
  { id: "neon", en: "Neon", th: "นีออน", icon: "⚡", sw: ["#07060D", "#FF3DF2"] },
  { id: "minimal", en: "Minimal", th: "มินิมอล", icon: "◻️", sw: ["#F7F5F0", "#111111"] },
];

export type MapRegion = { name: string; d: string; dot: [number, number] | null };
export type MapInput = {
  kind: "world" | "thailand";
  regions: MapRegion[];
  picked: Set<string>;
  W: number; // the map's own coordinate size
  H: number;
  title: string;
  subtitle: string;
  names: string[]; // visited places, already sorted and translated
  more: (n: number) => string; // "+3 more"
  shape: Shape;
  site: string;
  theme: MapThemeId;
};

type Ctx = CanvasRenderingContext2D;
type Rect = { x: number; y: number; w: number; h: number };
type Pal = { land: string; visited: string; edge: string; text: string; accent: string; muted: string };
type Env = MapInput & { ctx: Ctx; CW: number; CH: number; tall: boolean; rnd: () => number; F: { display: string; body: string; mono: string } };
type Theme = {
  pal: Pal;
  bg: (e: Env) => void;
  title: (e: Env, x: number, y: number) => void; // y is the title baseline
  deco?: (e: Env, map: Rect) => void;
  glow?: string;
  edgeW?: number;
};

function plainTitle(e: Env, x: number, y: number, color: string, upper = false) {
  const { ctx, F, tall } = e;
  const text = upper ? e.title.toUpperCase() : e.title;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  fit(ctx, text, (px) => `800 ${px}px ${F.display}`, tall ? 950 : 1100, tall ? 84 : 72);
  ctx.fillText(text, x, y);
}

function speckle(e: Env, n: number, dark: string, light: string) {
  const { ctx, CW, CH, rnd } = e;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rnd() < 0.6 ? dark.replace("A", String(0.04 + rnd() * 0.1)) : light.replace("A", String(0.04 + rnd() * 0.08));
    ctx.beginPath();
    ctx.arc(rnd() * CW, rnd() * CH, 0.6 + rnd() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

const THEME: Record<MapThemeId, Theme> = {
  midnight: {
    pal: { land: "#2A3643", visited: "#3DDC97", edge: "#0E151C", text: "#E8EEF5", accent: "#3DDC97", muted: "#8D9BAB" },
    bg: ({ ctx, CW, CH, tall }) => {
      ctx.fillStyle = "#0E151C";
      ctx.fillRect(0, 0, CW, CH);
      const g = ctx.createRadialGradient(CW * 0.2, tall ? SAFE + 80 : 120, 0, CW * 0.2, tall ? SAFE + 80 : 120, 800);
      g.addColorStop(0, "rgba(61,220,151,.16)");
      g.addColorStop(1, "rgba(61,220,151,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
    },
    title: (e, x, y) => plainTitle(e, x, y, "#E8EEF5"),
  },
  vintage: {
    pal: { land: "#F1E6CB", visited: "#B5523B", edge: "#7A6243", text: "#2A2016", accent: "#B5523B", muted: "#6B5A40" },
    edgeW: 0.9,
    bg: (e) => {
      const { ctx, CW, CH } = e;
      ctx.fillStyle = "#D9C7A0";
      ctx.fillRect(0, 0, CW, CH);
      speckle(e, 2600, "rgba(80,55,25,A)", "rgba(255,250,235,A)");
      // Burnt edges.
      const g = ctx.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * 0.35, CW / 2, CH / 2, Math.max(CW, CH) * 0.75);
      g.addColorStop(0, "rgba(90,60,25,0)");
      g.addColorStop(1, "rgba(90,60,25,.35)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      ctx.strokeStyle = "rgba(42,32,22,.55)";
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 10]);
      ctx.strokeRect(28, 28, CW - 56, CH - 56);
      ctx.setLineDash([]);
    },
    title: (e, x, y) => {
      plainTitle(e, x, y, "#2A2016", true);
      // Hand-drawn underline.
      const { ctx } = e;
      const w = Math.min(ctx.measureText(e.title.toUpperCase()).width, e.tall ? 950 : 1100);
      ctx.strokeStyle = "#B5523B";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y + 22);
      ctx.bezierCurveTo(x + w * 0.3, y + 12, x + w * 0.7, y + 34, x + w, y + 18);
      ctx.stroke();
    },
    deco: (e, m) => emoji(e.ctx, "🧭", m.x + m.w - 50, m.y + m.h - 40, e.tall ? 90 : 80, -0.2),
  },
  pastel: {
    pal: { land: "#FFFFFF", visited: "#FF5FA2", edge: "#BFE3FF", text: "#1A4A6A", accent: "#FF5FA2", muted: "#4E7A96" },
    edgeW: 0.8,
    bg: (e) => {
      const { ctx, CW, CH, rnd } = e;
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, "#8FD3FF");
      g.addColorStop(1, "#E4F6FF");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      for (let i = 0; i < 6; i++) cloud(ctx, rnd() * CW, rnd() * CH, 36 + rnd() * 40);
    },
    title: (e, x, y) => {
      const { ctx, F, tall } = e;
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      fit(ctx, e.title, (px) => `800 ${px}px ${F.display}`, tall ? 930 : 1080, tall ? 86 : 74);
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 18;
      ctx.shadowColor = "rgba(0,40,80,.2)";
      ctx.shadowBlur = 12;
      ctx.strokeText(e.title, x, y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#FF5FA2";
      ctx.fillText(e.title, x, y);
      ctx.restore();
    },
    deco: (e, m) => {
      const { ctx } = e;
      emoji(ctx, "✈️", e.CW - 110, e.tall ? SAFE + 40 : 80, e.tall ? 80 : 70, 0.3);
      emoji(ctx, "📍", m.x + 40, m.y + m.h - 30, e.tall ? 70 : 60, -0.15);
      emoji(ctx, "✨", m.x + m.w * 0.55, m.y + 10, 50, 0);
    },
  },
  neon: {
    pal: { land: "rgba(255,255,255,.05)", visited: "#FF3DF2", edge: "rgba(150,130,255,.45)", text: "#F5F0FF", accent: "#34F5FF", muted: "#9C94C8" },
    glow: "#FF3DF2",
    edgeW: 0.8,
    bg: ({ ctx, CW, CH }) => {
      ctx.fillStyle = "#07060D";
      ctx.fillRect(0, 0, CW, CH);
      ctx.strokeStyle = "rgba(120,100,255,.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < CW; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CH);
        ctx.stroke();
      }
      for (let y = 0; y < CH; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CW, y);
        ctx.stroke();
      }
    },
    title: (e, x, y) => {
      const { ctx } = e;
      ctx.save();
      ctx.shadowColor = "#34F5FF";
      ctx.shadowBlur = 24;
      plainTitle(e, x, y, "#F5F0FF");
      ctx.restore();
    },
  },
  minimal: {
    pal: { land: "#E2DED6", visited: "#111111", edge: "#F7F5F0", text: "#111111", accent: "#E4572E", muted: "#8A857C" },
    edgeW: 0.7,
    bg: ({ ctx, CW, CH }) => {
      ctx.fillStyle = "#F7F5F0";
      ctx.fillRect(0, 0, CW, CH);
    },
    title: (e, x, y) => {
      plainTitle(e, x, y, "#111111");
      const { ctx } = e;
      ctx.fillStyle = "#E4572E";
      ctx.fillRect(x, y - (e.tall ? 108 : 96), 90, 10);
    },
  },
};

function drawMap(e: Env, th: Theme, r: Rect) {
  const { ctx } = e;
  const s = r.w / e.W;
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.scale(s, r.h / e.H);
  const paths = e.regions.map((g) => ({ g, p: new Path2D(g.d), on: e.picked.has(g.name) }));
  ctx.lineJoin = "round";
  ctx.lineWidth = (th.edgeW ?? 0.6) * (e.kind === "world" ? 1 : 1.3);
  for (const { p, on } of paths) {
    if (on) continue;
    ctx.fillStyle = th.pal.land;
    ctx.fill(p);
    ctx.strokeStyle = th.pal.edge;
    ctx.stroke(p);
  }
  // Visited ones on top, so a glow isn't covered by neighbours.
  if (th.glow) {
    ctx.shadowColor = th.glow;
    ctx.shadowBlur = 18;
  }
  for (const { g, p, on } of paths) {
    if (!on) continue;
    ctx.fillStyle = th.pal.visited;
    ctx.fill(p);
    ctx.strokeStyle = th.pal.edge;
    ctx.stroke(p);
    if (g.dot) {
      ctx.beginPath();
      ctx.arc(g.dot[0], g.dot[1], 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.lineWidth = (th.edgeW ?? 0.6) * (e.kind === "world" ? 1 : 1.3);
    }
  }
  ctx.restore();
}

// Names in columns, with "+N more" when they run out of room.
function drawNames(e: Env, th: Theme, x0: number, top: number, width: number, bottom: number, cols: number) {
  const { ctx, names, F } = e;
  if (!names.length) return;
  const lineH = 46;
  const maxRows = Math.max(1, Math.floor((bottom - top) / lineH));
  const room = maxRows * cols;
  const rows = Math.min(maxRows, Math.max(1, Math.ceil(names.length / cols)));
  const shown = names.length > room ? names.slice(0, room - 1) : names;
  ctx.font = `500 30px ${F.body}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const colW = width / cols;
  shown.forEach((n, i) => {
    const x = x0 + Math.floor(i / rows) * colW;
    const y = top + (i % rows) * lineH;
    ctx.fillStyle = th.pal.visited;
    if (th.glow) {
      ctx.shadowColor = th.glow;
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.arc(x + 7, y - 9, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = th.pal.text;
    let label = n;
    while (ctx.measureText(label).width > colW - 36 && label.length > 4) label = label.slice(0, -2) + "…";
    ctx.fillText(label, x + 24, y);
  });
  if (names.length > shown.length) {
    const i = shown.length;
    ctx.fillStyle = th.pal.muted;
    ctx.fillText(e.more(names.length - shown.length), x0 + Math.floor(i / rows) * colW + 24, top + (i % rows) * lineH);
  }
}

export async function renderMap(input: MapInput): Promise<HTMLCanvasElement> {
  const tall = input.shape === "portrait";
  const cv = document.createElement("canvas");
  cv.width = tall ? 1080 : 1920;
  cv.height = tall ? 1920 : 1080;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  await document.fonts?.ready;
  const e: Env = {
    ...input,
    ctx,
    CW: cv.width,
    CH: cv.height,
    tall,
    rnd: seeded(input.kind.length * 31 + input.theme.length * 7919),
    F: { display: fam("--font-display", "system-ui, sans-serif"), body: fam("--font-body", "system-ui, sans-serif"), mono: fam("--font-mono", "ui-monospace, Menlo, monospace") },
  };
  const th = THEME[input.theme];
  const { W, H } = input;
  const left = tall ? 64 : 80;
  th.bg(e);
  th.title(e, left, tall ? 350 : 130);
  ctx.fillStyle = th.pal.accent;
  ctx.font = `600 ${tall ? 36 : 34}px ${e.F.mono}`;
  ctx.textAlign = "left";
  ctx.fillText(input.subtitle, left, tall ? 420 : 190);

  let map: Rect;
  if (input.kind === "world") {
    const w = tall ? 1000 : 1560;
    map = { x: (cv.width - w) / 2, y: tall ? 480 : 225, w, h: (w / W) * H };
    drawMap(e, th, map);
    if (tall) drawNames(e, th, left, map.y + map.h + 90, cv.width - left * 2, cv.height - 340, 3);
  } else if (tall) {
    // Thailand is tall: map on the left, province list on the right.
    const h = 1090;
    map = { x: left - 20, y: 480, w: (h / H) * W, h };
    drawMap(e, th, map);
    drawNames(e, th, left + map.w, 510, cv.width - left * 2 - map.w + 20, cv.height - 340, 1);
  } else {
    const h = 810;
    map = { x: left - 20, y: 225, w: (h / H) * W, h };
    drawMap(e, th, map);
    drawNames(e, th, left + map.w + 40, 280, cv.width - left * 2 - map.w - 40, cv.height - 80, 3);
  }
  th.deco?.(e, map);
  ctx.fillStyle = th.pal.muted;
  ctx.font = `600 ${tall ? 26 : 24}px ${e.F.mono}`;
  ctx.textAlign = "left";
  ctx.fillText(input.site, left, tall ? cv.height - SAFE - 20 : cv.height - 40);
  return cv;
}
