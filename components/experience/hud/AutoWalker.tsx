"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Vector3 } from "three";
import type { PathData } from "@/lib/path";
import { cat, input } from "@/lib/runtime";
import { useGame } from "@/lib/store";
import { heightAt } from "@/lib/terrain";

const SAMPLES = 600;
// เป้าที่แมววิ่งตาม อยู่ข้างหน้าบนเส้นทางระยะนี้ (เมตร) — ทำให้เลี้ยวตามโค้งนุ่ม ไม่ตัดมุม
const LOOK_AHEAD = 1.6;
// ถึงสถานีแล้วยืนรอให้อ่าน/กดดูรายละเอียดก่อนเดินต่อ
const WAIT_MS = 4500;
// ค้นหาจุดใกล้สุดเฉพาะช่วงรอบ ๆ จุดเดิม (ถูกกว่าไล่ทั้งเส้นทุกเฟรม)
const SEARCH_WINDOW = 40;

interface AutoWalkerProps {
  path: PathData;
  positions: Vector3[];
}

// โหมดเดินเอง: แมวเดินตามทางรอยเท้าไปสถานีถัดไป หยุดรอ แล้วไปต่อจนถึงสถานีสุดท้าย
// ผู้ใช้กดเดินเอง/คลิกพื้นเมื่อไหร่ ยกเลิกโหมดนี้ทันที
export function AutoWalker({ path, positions }: AutoWalkerProps) {
  const [pts] = useState(() => path.curve.getSpacedPoints(SAMPLES));
  // เป้าที่โหมดนี้ตั้งเอง — ตอนปิดโหมดล้างเฉพาะเป้านี้ ไม่ไปลบจุดที่ผู้ใช้เพิ่งคลิก
  const [carrot] = useState(() => new Vector3());
  const state = useRef({ active: false, target: -1, index: -1, waitUntil: 0 });

  useFrame(() => {
    const s = state.current;
    const game = useGame.getState();
    if (!game.autoWalk || game.phase !== "explore") {
      if (s.active && input.target === carrot) input.target = null;
      s.active = false;
      return;
    }

    // เพิ่งเปิดโหมด: เลือกสถานีถัดจากที่ไปถึงล่าสุด และหาว่าแมวอยู่ตรงไหนของเส้นทาง
    if (!s.active) {
      s.active = true;
      s.target = Math.min(game.lastVisited + 1, positions.length - 1);
      if (game.lastVisited >= positions.length - 1) s.target = 0;
      s.index = nearestIndex(pts, 0, pts.length - 1);
      s.waitUntil = 0;
    }

    // ผู้ใช้บังคับเอง = ยกเลิก
    if (input.keys.size > 0 || input.joy.x !== 0 || input.joy.y !== 0) {
      game.setAutoWalk(false);
      return;
    }
    // เปิดอ่านรายละเอียดอยู่ หรือกำลังยืนรอที่สถานี
    if (game.openStationId) {
      s.waitUntil = performance.now() + 1500;
      return;
    }
    if (s.waitUntil) {
      if (performance.now() < s.waitUntil) return;
      s.waitUntil = 0;
      if (s.target >= positions.length - 1) {
        game.setAutoWalk(false);
        return;
      }
      s.target += 1;
    }

    const goal = positions[s.target];
    const dGoal = Math.hypot(goal.x - cat.position.x, goal.z - cat.position.z);
    if (dGoal < 0.35) {
      if (input.target === carrot) input.target = null;
      s.waitUntil = performance.now() + WAIT_MS;
      return;
    }

    // เดินตามเส้นทาง: หาตำแหน่งปัจจุบันบนทาง แล้วตั้งเป้าล่วงหน้าไปทางสถานีเป้าหมาย
    s.index = nearestIndex(pts, s.index - SEARCH_WINDOW, s.index + SEARCH_WINDOW);
    const goalIndex = Math.round(path.stationU[s.target] * SAMPLES);
    const step = Math.max(1, Math.round((LOOK_AHEAD / path.curve.getLength()) * SAMPLES));
    const dir = Math.sign(goalIndex - s.index);
    const ahead = dir === 0 ? goalIndex : dir > 0 ? Math.min(s.index + step, goalIndex) : Math.max(s.index - step, goalIndex);
    // ใกล้ปลายทางแล้วเล็งตรงไปที่กลางลานเลย
    const p = Math.abs(goalIndex - s.index) <= step ? goal : pts[ahead];
    input.target = carrot.set(p.x, heightAt(p.x, p.z), p.z);
  });

  return null;
}

function nearestIndex(pts: Vector3[], from: number, to: number) {
  let best = Infinity;
  let index = 0;
  for (let i = Math.max(0, from); i <= Math.min(pts.length - 1, to); i++) {
    const d = (pts[i].x - cat.position.x) ** 2 + (pts[i].z - cat.position.z) ** 2;
    if (d < best) {
      best = d;
      index = i;
    }
  }
  return index;
}
