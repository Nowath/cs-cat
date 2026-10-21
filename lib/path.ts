import { CanvasTexture, CatmullRomCurve3, LinearFilter, Vector3 } from "three";
import { CLEARING_RADIUS, SPAWN, stationPosition } from "./stations";

// ครอบพื้นที่ ±MASK_HALF เมตร (เผื่อขอบแมพ) ความละเอียด ~8 px ต่อเมตร
export const MASK_HALF = 34;
const MASK_RES = 544;
const TRAIL_WIDTH = 0.9;
// ระยะต่อรอยเท้าหนึ่งรอยตามแนวทาง (≈ ก้าวแมวที่ CAT_SCALE)
export const FOOTPRINT_SPACING = 0.27;

export interface PathData {
  curve: CatmullRomCurve3;
  anchors: Vector3[];
  mask: CanvasTexture;
  /** ตำแหน่งของแต่ละสถานีบนเส้นทาง เป็นสัดส่วนความยาว 0..1 (ลำดับเดียวกับหัวข้อ) */
  stationU: number[];
}

const cache = new Map<string, PathData>();

// ทางผ่านทุกสถานีตามลำดับ แทรกจุดเบี้ยวซ้าย-ขวาระหว่างสถานีให้ทางคดเคี้ยวแบบรอยแมวเดิน
// ใช้ random แบบมี seed ทางจึงเหมือนเดิมทุกครั้งที่โหลด และผูกตายตัวกับแมพ
export function getPathData(stationIds: string[]): PathData {
  const key = stationIds.join(",");
  const hit = cache.get(key);
  if (hit) return hit;

  const rand = mulberry32(7);
  const anchors = [SPAWN.clone(), ...stationIds.map(stationPosition)];
  const points: Vector3[] = [anchors[0]];
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1];
    const b = anchors[i];
    const dir = b.clone().sub(a);
    const len = dir.length();
    const side = new Vector3(-dir.z, 0, dir.x).normalize();
    const wiggles = Math.max(1, Math.round(len / 4));
    for (let k = 1; k <= wiggles; k++) {
      const t = k / (wiggles + 1);
      const sign = k % 2 ? 1 : -1;
      const amount = (0.8 + rand() * 1.4) * sign * Math.min(1, len / 8);
      points.push(a.clone().lerp(b, t).addScaledVector(side, amount));
    }
    points.push(b);
  }
  const curve = new CatmullRomCurve3(points, false, "centripetal");

  // ลานโล่งรวมจุดเกิดด้วย ช่วง intro กล้องอยู่ต่ำ หญ้าหน้ากล้องจะได้ไม่บังแมว
  const data = { curve, anchors, mask: drawMask(curve, anchors), stationU: anchors.slice(1).map((a) => nearestU(curve, a)) };
  cache.set(key, data);
  return data;
}

// mask (ช่อง R): 1 = ทางเดิน/ลานโล่ง หญ้าเตี้ยและเห็นดิน · 0 = ทุ่งปกติ
// วาดเส้นซ้อนหลายชั้นที่กว้างขึ้นและจางลงแทน blur ให้ขอบนุ่ม (ctx.filter ยังไม่รองรับทุกเบราว์เซอร์)
function drawMask(curve: CatmullRomCurve3, stations: Vector3[]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = MASK_RES;
  const ctx = canvas.getContext("2d")!;
  const scale = MASK_RES / (MASK_HALF * 2);
  const px = (v: number) => (v + MASK_HALF) * scale;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, MASK_RES, MASK_RES);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const pts = curve.getSpacedPoints(Math.ceil(curve.getLength() / 0.25));

  const passes = [
    { widen: 2.2, alpha: 0.15 },
    { widen: 1.6, alpha: 0.3 },
    { widen: 1.2, alpha: 0.5 },
    { widen: 1, alpha: 1 },
  ];
  for (const { widen, alpha } of passes) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ctx.fillStyle = "#fff";
    ctx.lineWidth = TRAIL_WIDTH * widen * scale;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(px(p.x), px(p.z)) : ctx.moveTo(px(p.x), px(p.z))));
    ctx.stroke();
    for (const s of stations) {
      ctx.beginPath();
      ctx.arc(px(s.x), px(s.z), CLEARING_RADIUS * (0.6 + 0.4 * widen) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new CanvasTexture(canvas);
  // ไม่กลับแกน: แถวบนสุดของ canvas = z ต่ำสุด ตรงกับสูตร uv ใน shader
  tex.flipY = false;
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

const SAMPLES = 800;

/** หา u (0..1 ตามความยาว) ของจุดบนเส้นทางที่ใกล้ (x, z) ที่สุด — ความละเอียดราว 0.1–0.2 ม. */
export function nearestU(curve: CatmullRomCurve3, p: { x: number; z: number }) {
  let best = Infinity;
  let bestU = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES;
    const q = curve.getPointAt(u, tmp);
    const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
    if (d < best) {
      best = d;
      bestU = u;
    }
  }
  return bestU;
}
const tmp = new Vector3();

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
