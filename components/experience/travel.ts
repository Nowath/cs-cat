import gsap from "gsap";
import { Vector3 } from "three";
import { cat, input, view } from "@/lib/runtime";
import { stationPosition } from "@/lib/stations";
import { useGame } from "@/lib/store";
import { heightAt } from "@/lib/terrain";

// ม่านจางที่ใช้ตอนวาร์ป (div ใน Experience ลงทะเบียนไว้ที่นี่)
export const warpCurtain = { el: null as HTMLDivElement | null };

// ยืนกลางลาน หันหน้าเข้าป้าย (ป้ายอยู่ทาง −z ของสถานี) กล้องจึงเห็นทั้งแมวและป้าย
const FACE_SIGN = Math.PI;

function place(at: Vector3, heading: number) {
  cat.position.set(at.x, heightAt(at.x, at.z), at.z);
  cat.heading = heading;
  cat.speed = 0;
  input.target = null;
  // กล้องไม่ต้องไหลตามจากจุดเดิม ตัดไปที่แมวทันที (หลังม่านปิด)
  view.focus.copy(cat.position);
}

/** วาร์ปแมวไปยืนหน้าป้ายของสถานี: จางม่านปิด → ย้าย → จางเปิด (ลดการเคลื่อนไหว: ตัดไปเลย) */
export function warpToStation(id: string) {
  const at = stationPosition(id);
  const curtain = warpCurtain.el;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!curtain || reduce) {
    place(at, FACE_SIGN);
    return;
  }
  gsap.killTweensOf(curtain);
  gsap
    .timeline()
    .to(curtain, { opacity: 1, duration: 0.2, ease: "power2.in" })
    .add(() => place(at, FACE_SIGN))
    .to(curtain, { opacity: 0, duration: 0.35, ease: "power2.out", delay: 0.05 });
}

/** สถานีถัดจากสถานีล่าสุดที่ไปถึง (วนกลับไปสถานีแรกหลังสถานีสุดท้าย) */
export function nextStationIndex(count: number) {
  return (useGame.getState().lastVisited + 1) % count;
}
