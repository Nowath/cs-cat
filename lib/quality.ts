export type Quality = "low" | "mid" | "high";

// DPR จำกัดไว้ที่ 1.5: หญ้าใบบางซ้อนกันหนาแน่น ค่าใช้จ่ายโตตามจำนวน pixel โดยตรง
// ที่ DPR 2 แทบมองไม่เห็นความต่างแต่ต้องวาดเพิ่มเกือบเท่าตัว
export const QUALITY: Record<
  Quality,
  { grass: number; dpr: [number, number]; antialias: boolean }
> = {
  low: { grass: 32_000, dpr: [1, 1], antialias: false },
  mid: { grass: 65_000, dpr: [1, 1.25], antialias: true },
  high: { grass: 120_000, dpr: [1, 1.5], antialias: true },
};

export const QUALITY_ORDER: Quality[] = ["low", "mid", "high"];

// เดาจากสเปกเครื่องก่อน แล้วให้ PerformanceMonitor ลดระดับต่อเองถ้า fps ตก
export function detectQuality(): Quality {
  if (typeof window === "undefined") return "mid";
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse) return cores >= 8 ? "mid" : "low";
  return cores >= 8 ? "high" : "mid";
}
