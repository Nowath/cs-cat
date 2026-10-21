import { Vector3 } from "three";
import type { Bounds } from "./bounds";
import { SPAWN } from "./stations";

// ค่าที่เปลี่ยนทุกเฟรมเก็บเป็น object mutable นอก React
// เพื่อไม่ให้ re-render ทั้ง tree ทุกครั้งที่แมวขยับ

export type CatAction = "idle" | "walk" | "sit" | "lick" | "look";

export const input = {
  keys: new Set<string>(),
  // จอยสติ๊ก: x ขวา+, y ลง+ (ตรงกับแกน z ของโลกเพราะกล้องไม่หมุน)
  joy: { x: 0, y: 0 },
  // จุดที่คลิก/แตะบนพื้น ให้แมวเดินไปเอง
  target: null as Vector3 | null,
  targetSetAt: 0,
};

export const cat = {
  position: SPAWN.clone(),
  heading: 0,
  speed: 0,
  action: "idle" as CatAction,
  // จุดที่แมวหันหัวไปมอง (เช่นป้ายสถานีตอนเดินผ่าน) — null = มองตามปกติ
  lookAt: null as Vector3 | null,
};

export const view = {
  // จุดที่กล้องเล็งอยู่ (ตามแมวแบบหน่วง) หญ้าใช้จุดนี้เป็นศูนย์กลาง patch
  focus: SPAWN.clone(),
  // 0 = มุม intro (หน้าแมว) → 1 = มุมเกม · target มาจาก scroll/ปัด ส่วน value หน่วงตามใน CameraRig
  introTarget: 0,
  intro: 0,
};

// ขอบเขตที่แมวเดินได้ (สร้างจากเส้นทางตอนฉากเริ่ม) — null ระหว่างยังไม่สร้าง
export const walkArea = {
  bounds: null as Bounds | null,
};
