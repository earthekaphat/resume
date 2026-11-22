// Draws the monthly photo dump as a story (1080×1920) or landscape (1920×1080) image,
// in one of several looks. Every theme keeps text and photos out of the top and bottom
// 250px of a story, where Instagram puts its own buttons.

export type ThemeId = "midnight" | "kraft" | "cafe" | "scrapbook" | "film";
export type Shape = "portrait" | "landscape";

export const THEMES: { id: ThemeId; en: string; th: string; icon: string; sw: [string, string] }[] = [
  { id: "midnight", en: "Midnight", th: "มิดไนท์", icon: "🌙", sw: ["#0E151C", "#3DDC97"] },
  { id: "kraft", en: "Kraft paper", th: "กระดาษคราฟท์", icon: "✍️", sw: ["#A8916B", "#FFFFFF"] },
  { id: "cafe", en: "Café", th: "คาเฟ่", icon: "☕", sw: ["#4A2E1C", "#F6ECC4"] },
  { id: "scrapbook", en: "Scrapbook", th: "สแครปบุ๊ก", icon: "🌈", sw: ["#6EC6FF", "#7CC55A"] },
  { id: "film", en: "Film roll", th: "ฟิล์ม", icon: "🎞️", sw: ["#111111", "#FF8A1F"] },
];

export type DumpInput = {
  y: number;
  m: number;
  title: string; // what to print as the title
  custom: boolean; // true when the user typed their own title
  monthName: string; // "November"
  monthYear: string; // "November 2026"
  subtitle: string; // "November 2026 · 6 days"
  photos: Record<number, string>;
  shape: Shape;
  lang: string;
  site: string;
  theme: ThemeId;
};

type Ctx = CanvasRenderingContext2D;
type Rect = { x: number; y: number; w: number; h: number };
type Env = DumpInput & {
  ctx: Ctx;
  W: number;
  H: number;
  tall: boolean;
  days: number;
  imgs: Map<number, HTMLImageElement>;
  rnd: () => number;
  F: { display: string; body: string; mono: string };
};

const SAFE = 250;
const EMOJI = `"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

// Same picture every time for the same month, so the preview doesn't flicker.
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fam(v: string, fallback: string) {
  const f = getComputedStyle(document.body).getPropertyValue(v).trim();
  return f ? `${f}, ${fallback}` : fallback;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function cover(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.min(img.width / w, img.height / h);
  const sw = w * s;
  const sh = h * s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

// Set the largest font (up to maxPx) at which the text fits maxW.
function fit(ctx: Ctx, text: string, font: (px: number) => string, maxW: number, maxPx: number) {
  ctx.font = font(maxPx);
  const w = ctx.measureText(text).width;
  const px = w > maxW ? Math.floor((maxPx * maxW) / w) : maxPx;
  ctx.font = font(px);
  return px;
}

function emoji(ctx: Ctx, ch: string, x: number, y: number, px: number, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `${px}px ${EMOJI}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}

function weekdays(lang: string, monFirst: boolean, style: "narrow" | "short") {
  const f = new Intl.DateTimeFormat(lang, { weekday: style });
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 7 + i + (monFirst ? 1 : 0))));
}

// Place the month's days in a 7-column grid inside a box.
function layout(e: Env, r: Rect, o: { gap: number; head: number; monFirst?: boolean; square?: boolean }) {
  const first = new Date(e.y, e.m, 1).getDay();
  const lead = o.monFirst ? (first + 6) % 7 : first;
  const rows = Math.ceil((lead + e.days) / 7);
  let cw = (r.w - o.gap * 6) / 7;
  let ch = (r.h - o.head - o.gap * (rows - 1)) / rows;
  if (o.square !== false) cw = ch = Math.min(cw, ch);
  else ch = Math.min(ch, cw);
  const gw = cw * 7 + o.gap * 6;
  const gh = ch * rows + o.gap * (rows - 1);
  const x0 = r.x + (r.w - gw) / 2;
  const y0 = r.y + o.head;
  const cells = Array.from({ length: e.days }, (_, i) => {
    const s = lead + i;
    return { d: i + 1, x: x0 + (s % 7) * (cw + o.gap), y: y0 + Math.floor(s / 7) * (ch + o.gap) };
  });
  const colX = (i: number) => x0 + i * (cw + o.gap) + cw / 2;
  return { cells, cw, ch, x0, y0, gw, gh, rows, colX };
}

function site(e: Env, color: string, x: number, y: number, align: CanvasTextAlign = "left") {
  const { ctx } = e;
  ctx.fillStyle = color;
  ctx.font = `600 ${e.tall ? 26 : 22}px ${e.F.mono}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(e.site, x, y);
  ctx.textAlign = "left";
}

function lastPhoto(e: Env) {
  const d = Math.max(0, ...e.imgs.keys());
  return e.imgs.get(d);
}

/* ---------- Midnight: the site's own dark look ---------- */
function midnight(e: Env) {
  const { ctx, W, H, tall, F } = e;
  ctx.fillStyle = "#0E151C";
  ctx.fillRect(0, 0, W, H);
  const gx = tall ? W * 0.2 : W * 0.12;
  const gy = tall ? SAFE + 120 : 240;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 760);
  g.addColorStop(0, "rgba(61,220,151,.20)");
  g.addColorStop(1, "rgba(61,220,151,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const tx = tall ? 64 : 80;
  ctx.fillStyle = "#E8EEF5";
  fit(ctx, e.title, (px) => `800 ${px}px ${F.display}`, tall ? 952 : 600, tall ? 120 : 100);
  ctx.fillText(e.title, tx, tall ? 410 : 330);
  ctx.fillStyle = "#3DDC97";
  ctx.font = `600 ${tall ? 34 : 30}px ${F.mono}`;
  ctx.fillText(e.subtitle, tx, tall ? 470 : 390);

  const L = layout(e, tall ? { x: 64, y: 540, w: 952, h: H - SAFE - 80 - 540 } : { x: 740, y: 80, w: 1100, h: H - 160 }, { gap: 10, head: 46 });
  ctx.fillStyle = "#8D9BAB";
  ctx.font = `600 ${tall ? 26 : 22}px ${F.mono}`;
  ctx.textAlign = "center";
  weekdays(e.lang, false, "narrow").forEach((w, i) => ctx.fillText(w, L.colX(i), L.y0 - 16));
  ctx.textAlign = "left";
  for (const c of L.cells) {
    const img = e.imgs.get(c.d);
    ctx.save();
    roundRect(ctx, c.x, c.y, L.cw, L.ch, L.cw * 0.16);
    ctx.clip();
    if (img) cover(ctx, img, c.x, c.y, L.cw, L.ch);
    else {
      ctx.fillStyle = "#1A2430";
      ctx.fillRect(c.x, c.y, L.cw, L.ch);
    }
    ctx.restore();
    ctx.font = `700 ${Math.round(L.cw * 0.2)}px ${F.body}`;
    ctx.fillStyle = img ? "#FFFFFF" : "#8D9BAB";
    ctx.shadowColor = "rgba(0,0,0,.6)";
    ctx.shadowBlur = img ? 6 : 0;
    ctx.fillText(String(c.d), c.x + L.cw * 0.1, c.y + L.cw * 0.27);
    ctx.shadowBlur = 0;
  }
  site(e, "#8D9BAB", tx, tall ? H - SAFE - 20 : H - 60);
}

/* ---------- Kraft paper: hand-drawn circle around a bold title ---------- */
function kraft(e: Env) {
  const { ctx, W, H, tall, F, rnd } = e;
  const BG = "#A8916B";
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rnd() < 0.6 ? `rgba(70,45,20,${0.05 + rnd() * 0.12})` : `rgba(255,250,235,${0.05 + rnd() * 0.1})`;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, 0.6 + rnd() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  const words = e.title.toUpperCase().split(/\s+/).filter(Boolean);
  const lines = e.custom ? (words.length > 1 ? [words.slice(0, -1).join(" "), words[words.length - 1]] : words) : [e.monthName.toUpperCase(), "DUMP"];
  const cx = tall ? W / 2 : 390;
  const cy = tall ? SAFE + 270 : H / 2 - 30;
  const font = (px: number) => `800 ${px}px ${F.display}`;
  const px = Math.min(...lines.map((l) => fit(ctx, l, font, tall ? 720 : 560, tall ? 150 : 130)));
  ctx.font = font(px);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const lh = px * 0.98;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) => {
    const ly = cy + (i - (lines.length - 1) / 2) * lh;
    ctx.fillStyle = "#111";
    ctx.fillText(l, cx, ly);
    // Thin paper-coloured line inside the letters, like the inline poster type.
    ctx.strokeStyle = BG;
    ctx.lineWidth = Math.max(2, px * 0.022);
    ctx.strokeText(l, cx - px * 0.035, ly - px * 0.035);
  });

  // Two loose passes of a hand-drawn ellipse whose ends don't quite meet.
  const rx = widest / 2 + 95;
  const ry = (lh * lines.length) / 2 + 85;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.05);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    const a0 = -Math.PI * 0.62 + pass * 0.35;
    const span = Math.PI * 2 + (pass ? 0.2 : 0.5);
    for (let i = 0; i <= 140; i++) {
      const a = a0 + (i / 140) * span;
      const wob = 1 + 0.025 * Math.sin(a * 3 + pass * 2) + pass * 0.03;
      const x = Math.cos(a) * rx * wob;
      const y = Math.sin(a) * ry * (wob - pass * 0.05);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.lineWidth = pass ? 5 : 9;
    ctx.stroke();
  }
  ctx.restore();

  const L = layout(e, tall ? { x: 60, y: SAFE + 530, w: 960, h: H - SAFE - 80 - (SAFE + 530) } : { x: 790, y: 70, w: 1070, h: H - 150 }, { gap: 0, head: 46 });
  ctx.fillStyle = "#1A1410";
  ctx.font = `600 ${tall ? 24 : 20}px ${F.mono}`;
  weekdays(e.lang, false, "short").forEach((w, i) => ctx.fillText(w.toUpperCase(), L.colX(i), L.y0 - 22));
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const c of L.cells) {
    const img = e.imgs.get(c.d);
    if (img) cover(ctx, img, c.x, c.y, L.cw, L.ch);
    ctx.font = `600 ${Math.round(L.cw * 0.17)}px ${F.mono}`;
    ctx.fillStyle = img ? "#FFFFFF" : "#2A2016";
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = img ? 6 : 0;
    ctx.fillText(String(c.d), c.x + L.cw * 0.09, c.y + L.cw * 0.22);
    ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2.5;
  for (const c of L.cells) ctx.strokeRect(c.x, c.y, L.cw, L.ch);
  site(e, "rgba(26,20,16,.7)", tall ? W / 2 : cx, tall ? H - SAFE - 20 : H - 60, "center");
}

/* ---------- Café: wood table, stacked month, stamp photo, cream calendar ---------- */
function wood(e: Env, r: Rect) {
  const { ctx, rnd } = e;
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.3, r.y + r.h);
  g.addColorStop(0, "#5C3B25");
  g.addColorStop(1, "#3A2415");
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  for (let i = 0; i < 150; i++) {
    const y = r.y + rnd() * r.h;
    const amp = 2 + rnd() * 9;
    const freq = 0.004 + rnd() * 0.01;
    const ph = rnd() * 6;
    ctx.strokeStyle = rnd() < 0.7 ? `rgba(25,12,5,${0.12 + rnd() * 0.2})` : `rgba(255,215,170,${0.04 + rnd() * 0.05})`;
    ctx.lineWidth = 1 + rnd() * 2.5;
    ctx.beginPath();
    for (let x = r.x; x <= r.x + r.w; x += 12) {
      const yy = y + Math.sin(x * freq + ph) * amp;
      if (x === r.x) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// A white postage stamp with punched edges, holding a photo.
function stamp(e: Env, img: HTMLImageElement | undefined, cx: number, cy: number, size: number, rot: number) {
  const { ctx } = e;
  const pad = size * 0.07;
  const s = size + pad * 2;
  const off = document.createElement("canvas");
  off.width = off.height = Math.ceil(s);
  const o = off.getContext("2d") as Ctx;
  o.fillStyle = "#FFFDF7";
  o.fillRect(0, 0, s, s);
  o.globalCompositeOperation = "destination-out";
  const hole = size * 0.022;
  const step = hole * 2.9;
  for (let p = step / 2; p < s; p += step) {
    for (const [x, y] of [
      [p, 0],
      [p, s],
      [0, p],
      [s, p],
    ]) {
      o.beginPath();
      o.arc(x, y, hole, 0, Math.PI * 2);
      o.fill();
    }
  }
  o.globalCompositeOperation = "source-over";
  if (img) cover(o, img, pad, pad, size, size);
  else {
    o.fillStyle = "#EDE3CB";
    o.fillRect(pad, pad, size, size);
    o.font = `${size * 0.3}px ${EMOJI}`;
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.fillText("📷", s / 2, s / 2);
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.shadowColor = "rgba(0,0,0,.4)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.drawImage(off, -s / 2, -s / 2);
  ctx.restore();
}

function pill(e: Env, text: string, x: number, y: number, px: number, bg: string, fg: string, rot = 0) {
  const { ctx, F } = e;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `700 ${px}px ${F.body}`;
  const w = ctx.measureText(text).width + px * 1.2;
  const h = px * 1.7;
  ctx.shadowColor = "rgba(0,0,0,.25)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = bg;
  roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, px * 0.05);
  ctx.restore();
}

function cafe(e: Env) {
  const { ctx, W, H, tall, F } = e;
  const th = e.lang.startsWith("th");
  const woodR = tall ? { x: 0, y: 0, w: W, h: 930 } : { x: 0, y: 0, w: 820, h: H };
  wood(e, woodR);
  ctx.fillStyle = "#F6ECC4";
  if (tall) ctx.fillRect(0, woodR.h, W, H - woodR.h);
  else ctx.fillRect(woodR.w, 0, W - woodR.w, H);

  // Stack the month like "nov / em / ber".
  const name = e.monthName.toLowerCase();
  let lines: string[];
  if (e.custom) {
    const w = e.title.split(/\s+/).filter(Boolean);
    lines = w.length > 3 ? [...w.slice(0, 2), w.slice(2).join(" ")] : w;
  } else if (th || name.length < 6) lines = [name];
  else {
    // "nov / em / ber", "jan / uary", "sep / tem / ber"
    const rest = name.slice(3);
    const half = Math.floor(rest.length / 2);
    lines = rest.length > 4 ? [name.slice(0, 3), rest.slice(0, half), rest.slice(half)] : [name.slice(0, 3), rest];
  }
  const tx = tall ? 70 : 70;
  const font = (px: number) => `800 ${px}px ${F.display}`;
  // Fit the widest line, and keep the whole stack above the calendar / stamp.
  const maxH = tall ? 470 : 360;
  const px = Math.min(...lines.map((l) => fit(ctx, l, font, tall ? 470 : 380, tall ? 200 : 165)), Math.floor(maxH / (0.88 * lines.length)));
  ctx.font = font(px);
  const lh = px * 0.88;
  const top = tall ? SAFE + 120 : 140;
  ctx.fillStyle = "#FFFDF7";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 12;
  lines.forEach((l, i) => ctx.fillText(l, tx, top + px * 0.8 + i * lh));
  ctx.shadowBlur = 0;
  const tagY = top + px * 0.8 + (lines.length - 1) * lh + (tall ? 80 : 70);
  ctx.fillStyle = "#F7D774";
  ctx.font = `italic 600 ${tall ? 34 : 30}px ${F.body}`;
  ctx.fillText(e.custom ? e.subtitle : th ? `ขอบคุณเรื่องเล็กๆ · ${e.subtitle}` : `“grateful for small things” · ${e.subtitle}`, tx, tagY, tall ? 480 : 700);

  const hero = lastPhoto(e);
  if (tall) {
    stamp(e, hero, 790, 600, 360, 0.05);
    pill(e, th ? "ชีวิตช่วง" : "my life in", 640, 410, 30, "#FFFDF7", "#3A2415", -0.08);
    emoji(ctx, "🥐", 90, 860, 90, -0.3);
    emoji(ctx, "☕", 600, 850, 84, 0.1);
    emoji(ctx, "⭐", 560, 330, 50, 0.2);
    emoji(ctx, "⭐", 1000, 860, 44, -0.2);
    emoji(ctx, "🍪", 980, 380, 70, 0.3);
  } else {
    stamp(e, hero, 560, 760, 320, 0.06);
    pill(e, th ? "ชีวิตช่วง" : "my life in", 430, 600, 28, "#FFFDF7", "#3A2415", -0.08);
    emoji(ctx, "🥐", 160, 820, 96, -0.3);
    emoji(ctx, "☕", 740, 560, 76, 0.1);
    emoji(ctx, "⭐", 700, 110, 48, 0.2);
    emoji(ctx, "🍪", 300, 960, 64, 0.3);
  }

  const L = layout(e, tall ? { x: 40, y: 960, w: 1000, h: H - SAFE - 50 - 960 } : { x: 870, y: 60, w: 1000, h: H - 120 }, { gap: 0, head: 58, monFirst: true, square: false });
  ctx.fillStyle = "#6B4A2E";
  ctx.font = `600 ${tall ? 30 : 28}px ${F.body}`;
  ctx.textAlign = "center";
  weekdays(e.lang, true, "short").forEach((w, i) => ctx.fillText(w.toLowerCase().replace(".", ""), L.colX(i), L.y0 - 18));
  ctx.textAlign = "left";
  for (const c of L.cells) {
    const img = e.imgs.get(c.d);
    if (img) cover(ctx, img, c.x, c.y, L.cw, L.ch);
    ctx.font = `700 ${Math.round(L.ch * 0.3)}px ${F.display}`;
    ctx.fillStyle = img ? "#FFFDF7" : "#6B4A2E";
    ctx.shadowColor = "rgba(0,0,0,.6)";
    ctx.shadowBlur = img ? 6 : 0;
    ctx.fillText(String(c.d), c.x + 10, c.y + L.ch * 0.34);
    ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = "#6B4A2E";
  ctx.lineWidth = 3;
  for (let r = 0; r < L.rows; r++) for (let i = 0; i < 7; i++) ctx.strokeRect(L.x0 + i * L.cw, L.y0 + r * L.ch, L.cw, L.ch);
  if (tall) site(e, "rgba(107,74,46,.75)", W / 2, H - SAFE - 12, "center");
  else site(e, "rgba(255,253,247,.6)", 70, H - 50);
}

/* ---------- Scrapbook: sky, clouds, a phone-style calendar and polaroids ---------- */
function cloud(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "rgba(255,255,255,.92)";
  for (const [dx, dy, r] of [
    [0, 0, 1],
    [0.9, -0.35, 1.2],
    [1.9, 0, 0.95],
    [0.95, 0.25, 1],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function polaroid(e: Env, img: HTMLImageElement, cx: number, cy: number, size: number, rot: number, label?: string) {
  const { ctx, F } = e;
  const pad = size * 0.06;
  const w = size + pad * 2;
  const h = size + pad * 2 + size * 0.16;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.shadowColor = "rgba(0,40,80,.28)";
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.03;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  cover(ctx, img, -w / 2 + pad, -h / 2 + pad, size, size);
  if (label) {
    ctx.fillStyle = "#555";
    ctx.font = `600 ${Math.round(size * 0.13)}px ${F.body}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, h / 2 - size * 0.1);
  }
  ctx.restore();
}

function scrapbook(e: Env) {
  const { ctx, W, H, tall, F, rnd } = e;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#6EC6FF");
  sky.addColorStop(1, "#DFF4FF");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 7; i++) cloud(ctx, rnd() * W, rnd() * H * 0.8, 40 + rnd() * 50);
  ctx.fillStyle = "#7CC55A";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.84);
  ctx.quadraticCurveTo(W * 0.45, H * 0.74, W, H * 0.86);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  ctx.fillStyle = "#5DAE3E";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.93);
  ctx.quadraticCurveTo(W * 0.6, H * 0.86, W, H * 0.95);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();

  // The title as a sticker: white outline, pink fill.
  const tcx = tall ? W / 2 : 380;
  const tcy = tall ? SAFE + 110 : 230;
  ctx.save();
  ctx.translate(tcx, tcy);
  ctx.rotate(-0.05);
  fit(ctx, e.title, (px) => `800 ${px}px ${F.display}`, tall ? 880 : 580, tall ? 130 : 110);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 22;
  ctx.shadowColor = "rgba(0,40,80,.25)";
  ctx.shadowBlur = 14;
  ctx.strokeText(e.title, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#FF5FA2";
  ctx.fillText(e.title, 0, 0);
  ctx.restore();

  const card = tall ? { x: 60, y: 480, w: 960, h: H - SAFE - 50 - 480 } : { x: 760, y: 60, w: 1100, h: H - 120 };
  ctx.save();
  ctx.shadowColor = "rgba(0,40,80,.2)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, card.x, card.y, card.w, card.h, 44);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#FF3B30";
  ctx.font = `600 ${tall ? 34 : 30}px ${F.body}`;
  ctx.fillText(`‹ ${e.y}`, card.x + 44, card.y + 70);
  ctx.fillStyle = "#111";
  ctx.font = `800 ${tall ? 76 : 68}px ${F.display}`;
  ctx.fillText(e.monthName, card.x + 44, card.y + 150);
  ctx.fillStyle = "#ECECEC";
  ctx.fillRect(card.x + 30, card.y + 185, card.w - 60, 2);
  pill(e, "OMG", card.x + card.w - 120, card.y + 105, tall ? 34 : 30, "#3AA0FF", "#FFFFFF", 0.12);

  const L = layout(e, { x: card.x + 30, y: card.y + 205, w: card.w - 60, h: card.h - 235 }, { gap: 14, head: 46 });
  ctx.fillStyle = "#8E8E93";
  ctx.font = `600 ${tall ? 28 : 24}px ${F.body}`;
  ctx.textAlign = "center";
  weekdays(e.lang, false, "narrow").forEach((w, i) => ctx.fillText(w, L.colX(i), L.y0 - 14));
  ctx.textBaseline = "middle";
  for (const c of L.cells) {
    if (e.imgs.has(c.d)) continue;
    ctx.fillStyle = "#3A3A3C";
    ctx.font = `600 ${Math.round(L.cw * 0.3)}px ${F.body}`;
    ctx.fillText(String(c.d), c.x + L.cw / 2, c.y + L.ch / 2);
  }
  // Polaroids last, so they can overlap their neighbours a little.
  for (const c of L.cells) {
    const img = e.imgs.get(c.d);
    if (img) polaroid(e, img, c.x + L.cw / 2, c.y + L.ch / 2, L.cw * 0.95, (rnd() - 0.5) * 0.3, String(c.d));
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const stickers = ["⭐", "💖", "✨", "🎀", "🍓", "🌈"];
  const spots = tall
    ? [
        [card.x + 20, card.y - 10, 80],
        [card.x + card.w - 20, card.y + card.h * 0.45, 70],
        [card.x - 8, card.y + card.h * 0.7, 60],
        [W - 110, SAFE + 40, 70],
      ]
    : [
        [card.x + 10, card.y + 20, 76],
        [card.x + card.w - 10, card.y + card.h - 40, 80],
        [120, 110, 64],
      ];
  spots.forEach(([x, y, s], i) => emoji(ctx, stickers[i % stickers.length], x, y, s, (rnd() - 0.5) * 0.6));
  if (tall) emoji(ctx, "📷", card.x + card.w - 70, card.y + card.h - 30, 96, 0.15);
  else {
    ctx.fillStyle = "#1A4A6A";
    ctx.font = `600 32px ${F.body}`;
    ctx.textAlign = "center";
    ctx.fillText(e.subtitle, 380, 330, 600);
    ctx.textAlign = "left";
    const hero = lastPhoto(e);
    if (hero) polaroid(e, hero, 380, 640, 360, -0.07);
    else emoji(ctx, "📷", 380, 620, 200, -0.1);
  }
  site(e, tall ? "#1F4D18" : "#FFFFFF", tall ? W / 2 : 380, tall ? H - SAFE - 14 : H - 50, "center");
}

/* ---------- Film roll: dark strip, sprocket holes, orange date stamps ---------- */
function film(e: Env) {
  const { ctx, W, H, tall, F, rnd } = e;
  ctx.fillStyle = "#0D0D0D";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.05})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
  }
  const tx = tall ? 64 : 80;
  ctx.fillStyle = "#FF8A1F";
  ctx.font = `600 ${tall ? 28 : 26}px ${F.mono}`;
  ctx.fillText("● REC   ISO 400   36 EXP", tx, tall ? SAFE + 70 : 200);
  ctx.fillStyle = "#F2E8D5";
  fit(ctx, e.title.toUpperCase(), (px) => `800 ${px}px ${F.display}`, tall ? 950 : 560, tall ? 130 : 110);
  ctx.fillText(e.title.toUpperCase(), tx, tall ? SAFE + 190 : 320);
  ctx.fillStyle = "rgba(242,232,213,.65)";
  ctx.font = `600 ${tall ? 32 : 28}px ${F.mono}`;
  ctx.fillText(e.subtitle, tx, tall ? SAFE + 250 : 380, tall ? 950 : 560);

  const strip = tall ? { x: 40, y: SAFE + 300, w: W - 80, h: H - SAFE - 70 - (SAFE + 300) } : { x: 700, y: 50, w: 1170, h: H - 100 };
  const L = layout(e, { x: strip.x + 66, y: strip.y + 26, w: strip.w - 132, h: strip.h - 52 }, { gap: 8, head: 44 });
  // Shrink the strip to hug the calendar.
  strip.h = L.y0 - strip.y + L.gh + 30;
  ctx.fillStyle = "#1C1A18";
  roundRect(ctx, strip.x, strip.y, strip.w, strip.h, 14);
  ctx.fill();
  ctx.fillStyle = "#0D0D0D";
  for (let y = strip.y + 22; y < strip.y + strip.h - 40; y += 58) {
    for (const x of [strip.x + 16, strip.x + strip.w - 40]) {
      roundRect(ctx, x, y, 24, 34, 6);
      ctx.fill();
    }
  }
  ctx.fillStyle = "#FF8A1F";
  ctx.font = `600 ${tall ? 24 : 22}px ${F.mono}`;
  ctx.textAlign = "center";
  weekdays(e.lang, false, "short").forEach((w, i) => ctx.fillText(w.toUpperCase(), L.colX(i), L.y0 - 14));
  const yy = String(e.y).slice(2);
  const mm = String(e.m + 1).padStart(2, " ");
  for (const c of L.cells) {
    const img = e.imgs.get(c.d);
    ctx.save();
    roundRect(ctx, c.x, c.y, L.cw, L.ch, 6);
    ctx.clip();
    if (img) {
      cover(ctx, img, c.x, c.y, L.cw, L.ch);
      ctx.fillStyle = "rgba(255,140,40,.10)";
      ctx.fillRect(c.x, c.y, L.cw, L.ch);
    } else {
      ctx.fillStyle = "#262422";
      ctx.fillRect(c.x, c.y, L.cw, L.ch);
    }
    ctx.restore();
    if (img) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#FF8A1F";
      ctx.shadowColor = "rgba(255,120,20,.9)";
      ctx.shadowBlur = 8;
      ctx.font = `600 ${Math.round(L.cw * 0.12)}px ${F.mono}`;
      ctx.fillText(`'${yy} ${mm} ${String(c.d).padStart(2, " ")}`, c.x + L.cw - L.cw * 0.07, c.y + L.ch - L.ch * 0.08);
      ctx.shadowBlur = 0;
    } else {
      ctx.textAlign = "center";
      ctx.fillStyle = "#6E6A64";
      ctx.font = `600 ${Math.round(L.cw * 0.22)}px ${F.mono}`;
      ctx.fillText(String(c.d), c.x + L.cw / 2, c.y + L.ch / 2 + L.cw * 0.08);
    }
  }
  ctx.textAlign = "left";
  site(e, "#6E6A64", tx, tall ? H - SAFE - 20 : H - 50);
}

const DRAW: Record<ThemeId, (e: Env) => void> = { midnight, kraft, cafe, scrapbook, film };

export async function renderDump(input: DumpInput): Promise<HTMLCanvasElement> {
  const tall = input.shape === "portrait";
  const cv = document.createElement("canvas");
  cv.width = tall ? 1080 : 1920;
  cv.height = tall ? 1920 : 1080;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  const F = {
    display: fam("--font-display", "system-ui, sans-serif"),
    body: fam("--font-body", "system-ui, sans-serif"),
    mono: fam("--font-mono", "ui-monospace, Menlo, monospace"),
  };
  await document.fonts?.ready;
  const imgs = new Map(await Promise.all(Object.entries(input.photos).map(async ([d, src]) => [Number(d), await loadImg(src)] as const)));
  const env: Env = {
    ...input,
    ctx,
    W: cv.width,
    H: cv.height,
    tall,
    days: new Date(input.y, input.m + 1, 0).getDate(),
    imgs,
    rnd: seeded(input.y * 100 + input.m + input.theme.length * 7919),
    F,
  };
  DRAW[input.theme](env);
  return cv;
}
