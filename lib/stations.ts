import { Vector3 } from "three";
import { FLAT_CENTER, heightAt } from "./terrain";

// ตำแหน่งสถานีบนแมพ (x, z หน่วยเมตร) — กล้องมองไปทาง −z จึงวางเส้นทางให้ไต่ขึ้นไปทางนั้น
// ลำดับการเดินมาจากลำดับหัวข้อใน content/topics.*.json ส่วนไฟล์นี้กำหนดแค่ "อยู่ตรงไหน"
// เพิ่มหัวข้อใหม่ใน JSON แล้วต้องเพิ่มตำแหน่งที่นี่ด้วย
export const STATION_LAYOUT: Record<string, { x: number; z: number }> = {
  about: { x: 0, z: -5 },
  undergraduate: { x: -8, z: -10 },
  careers: { x: -16, z: -5 },
  graduate: { x: -19, z: -16 },
  research: { x: -9, z: -22 },
  people: { x: 1, z: -16 },
  news: { x: 11, z: -24 },
  admission: { x: 17, z: -13 },
  contact: { x: 10, z: -4 },
};

// จุดเกิดอยู่กลางพื้นที่ราบของเนิน (FLAT_CENTER ใน lib/terrain.ts) ความสูงจึงเป็น 0
export const SPAWN = new Vector3(FLAT_CENTER.x, 0, FLAT_CENTER.z);

// ระยะที่แมวเข้าใกล้แล้วป้าย "ดูรายละเอียด" โผล่
export const NEAR_RADIUS = 2.1;
// ลานโล่ง (หญ้าเตี้ย) รอบสถานี
export const CLEARING_RADIUS = 2.4;
// ป้ายตั้งอยู่หลังจุดยืนเล็กน้อย แมวจะยืนหน้าป้ายพอดีในมุมกล้อง
export const SIGN_OFFSET_Z = -1.1;

export function stationPosition(id: string) {
  const p = STATION_LAYOUT[id];
  if (!p) throw new Error(`ไม่มีตำแหน่งสถานี "${id}" ใน lib/stations.ts`);
  return new Vector3(p.x, heightAt(p.x, p.z), p.z);
}
