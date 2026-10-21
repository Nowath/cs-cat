import { create } from "zustand";
import { detectQuality, QUALITY_ORDER, type Quality } from "./quality";

// loading → (circle wipe) → intro (แมวมองกล้อง, scroll เพื่อเริ่ม) → explore (มุมเกม เดินได้)
export type Phase = "loading" | "intro" | "explore";

interface GameState {
  phase: Phase;
  // ความคืบหน้าการโหลดจริงตามขั้น (0..1) หน้า loading จะไล่ตัวเลขตามค่านี้แบบนุ่ม
  loadTarget: number;
  quality: Quality;
  // ลดถึงระดับต่ำสุดแล้ว fps ยังตก → ชวนไปอ่านแบบหน้าเว็บ
  struggling: boolean;
  // ใช้ซ่อนคำแนะนำการควบคุมหลังผู้ใช้เดินครั้งแรก
  hasMoved: boolean;
  // สถานีที่แมวยืนใกล้อยู่ (โชว์ปุ่ม "ดูรายละเอียด")
  nearStationId: string | null;
  // สถานีที่เปิด dialog อยู่ — null = ปิด
  openStationId: string | null;
  // สถานีล่าสุดที่เปิด ไม่ล้างตอนปิด ให้ dialog ยังมีเนื้อหาระหว่าง animation ปิด
  lastStationId: string | null;
  // สถานีล่าสุดที่แมวไปถึง (ลำดับในหัวข้อ) ใช้หาว่า "สถานีถัดไป" ของ Skip/Auto walk คืออันไหน
  lastVisited: number;
  // แมวเดินตามทางเองทีละสถานี
  autoWalk: boolean;
  mapOpen: boolean;
  // เสียงบรรยากาศ เปิดเป็นค่าเริ่มต้น — แต่จะดังจริงหลังผู้ใช้กด/แตะครั้งแรก (ดู Experience.tsx)
  soundOn: boolean;
  // กลับมาจากการสลับภาษา: เปิดม่านแล้วเข้าโหมดสำรวจเลย ไม่ผ่าน intro
  skipIntro: boolean;
  setPhase: (phase: Phase) => void;
  reachLoad: (value: number) => void;
  degrade: () => void;
  dismissStruggling: () => void;
  markMoved: () => void;
  setNear: (id: string | null) => void;
  openStation: (id: string) => void;
  closeStation: () => void;
  markVisited: (index: number) => void;
  setAutoWalk: (on: boolean) => void;
  setMapOpen: (open: boolean) => void;
  setSoundOn: (on: boolean) => void;
  setSkipIntro: (skip: boolean) => void;
}

export const useGame = create<GameState>()((set, get) => ({
  phase: "loading",
  loadTarget: 0,
  quality: detectQuality(),
  struggling: false,
  hasMoved: false,
  nearStationId: null,
  openStationId: null,
  lastStationId: null,
  lastVisited: -1,
  autoWalk: false,
  mapOpen: false,
  soundOn: true,
  skipIntro: false,
  setPhase: (phase) => set({ phase }),
  // ขั้นการโหลดเสร็จไม่เรียงลำดับได้ ใช้ค่ามากสุดเสมอ แถบจะไม่ถอยหลัง
  reachLoad: (value) => {
    if (value > get().loadTarget) set({ loadTarget: value });
  },
  degrade: () => {
    const i = QUALITY_ORDER.indexOf(get().quality);
    if (i > 0) set({ quality: QUALITY_ORDER[i - 1] });
    else set({ struggling: true });
  },
  dismissStruggling: () => set({ struggling: false }),
  markMoved: () => {
    if (!get().hasMoved) set({ hasMoved: true });
  },
  setNear: (id) => {
    if (get().nearStationId !== id) set({ nearStationId: id });
  },
  openStation: (id) => set({ openStationId: id, lastStationId: id }),
  closeStation: () => set({ openStationId: null }),
  markVisited: (index) => {
    if (get().lastVisited !== index) set({ lastVisited: index });
  },
  setAutoWalk: (on) => set({ autoWalk: on }),
  setMapOpen: (open) => set({ mapOpen: open }),
  setSoundOn: (on) => set({ soundOn: on }),
  setSkipIntro: (skip) => set({ skipIntro: skip }),
}));
