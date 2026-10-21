"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { CanvasTexture, MathUtils, Vector3, type Group } from "three";
import { cat, input, walkArea, type CatAction } from "@/lib/runtime";
import { ambience } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { heightAt } from "@/lib/terrain";
import { CAT_SCALE, WALK_SPEED } from "@/lib/world";
import { CatModel } from "./CatModel";

const KEYMAP: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

// ระยะที่เริ่มชะลอก่อนถึงจุดที่คลิก ให้แมวค่อย ๆ หยุด ไม่เบรกกึก
const ARRIVE_RADIUS = 0.6;

function dampAngle(from: number, to: number, lambda: number, dt: number) {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + diff * (1 - Math.exp(-lambda * dt));
}

// แมวมีตัวเดียวในฉาก ใช้เวกเตอร์ชั่วคราวระดับโมดูลได้ ไม่ต้องสร้างใหม่ทุกเฟรม
const dir = new Vector3();
const moveDir = new Vector3(0, 0, 1);

// ระยะหน้า-หลังที่ใช้วัดความชันใต้ตัวแมว (≈ ครึ่งความยาวตัว)
const TILT_REACH = 0.35;
// ระยะต่อเสียงฝีเท้าหนึ่งครั้ง (ราวครึ่งช่วงก้าว)
const STEP_DISTANCE = 0.32;

export function Cat() {
  const root = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const stepAcc = useRef(0);
  const idleFor = useRef(0);
  const [shadow] = useState(createBlobTexture);

  useFrame((_, rawDt) => {
    // กันกระตุกตอนสลับแท็บกลับมาแล้ว dt ก้อนใหญ่
    const dt = Math.min(rawDt, 0.05);
    dir.set(0, 0, 0);
    for (const key of input.keys) {
      const v = KEYMAP[key];
      if (v) dir.set(dir.x + v[0], 0, dir.z + v[1]);
    }
    dir.x += input.joy.x;
    dir.z += input.joy.y;

    let mag = Math.min(dir.length(), 1);
    const { phase, openStationId } = useGame.getState();
    // ยังไม่เข้าโหมดสำรวจ หรือเปิดอ่านรายละเอียดอยู่ แมวยืนรอ
    if (phase !== "explore" || openStationId) {
      input.target = null;
      mag = 0;
    } else if (mag > 0.05) {
      // ควบคุมเองเมื่อไหร่ ยกเลิกการเดินไปจุดที่คลิกไว้
      input.target = null;
      dir.normalize();
    } else if (input.target) {
      dir.subVectors(input.target, cat.position).setY(0);
      const d = dir.length();
      if (d < 0.06) {
        input.target = null;
        mag = 0;
      } else {
        dir.divideScalar(d);
        mag = Math.min(1, d / ARRIVE_RADIUS);
      }
    } else {
      mag = 0;
    }

    cat.speed = MathUtils.damp(cat.speed, mag * WALK_SPEED, 5, dt);
    if (mag > 0) {
      moveDir.copy(dir);
      cat.heading = dampAngle(cat.heading, Math.atan2(dir.x, dir.z), 8, dt);
      useGame.getState().markMoved();
    }
    cat.position.addScaledVector(moveDir, cat.speed * dt);
    // เสียงฝีเท้าตามระยะที่เดินจริง (เดินเร็ว = ถี่ขึ้นเอง)
    stepAcc.current += cat.speed * dt;
    if (stepAcc.current > STEP_DISTANCE) {
      stepAcc.current = 0;
      if (cat.speed > 0.3) ambience.step();
    }
    // กำแพงใสสี่เหลี่ยมรอบแมพ (ดู lib/bounds.ts)
    walkArea.bounds?.clamp(cat.position);
    cat.position.y = heightAt(cat.position.x, cat.position.z);
    // ช่วง intro แมวหันมาสบตากล้อง · ยืนนิ่งนาน ๆ แล้วนั่ง และเลียอุ้งเท้าเป็นพัก ๆ
    idleFor.current = cat.speed > 0.15 ? 0 : idleFor.current + dt;
    cat.action = phase !== "explore" ? "look" : cat.speed > 0.15 ? "walk" : idleAction(idleFor.current);

    const g = root.current;
    if (g) {
      g.position.copy(cat.position);
      g.rotation.y = cat.heading;
    }
    // เอียงตัวตามความชันของเนิน: วัดความสูงหน้า-หลังและซ้าย-ขวาตามทิศที่หัน แล้วหน่วงให้นุ่ม
    const t = tilt.current;
    if (t) {
      const fx = Math.sin(cat.heading) * TILT_REACH;
      const fz = Math.cos(cat.heading) * TILT_REACH;
      const { x, z } = cat.position;
      const pitch = Math.atan2(heightAt(x + fx, z + fz) - heightAt(x - fx, z - fz), TILT_REACH * 2);
      const roll = Math.atan2(heightAt(x + fz, z - fx) - heightAt(x - fz, z + fx), TILT_REACH * 2);
      t.rotation.x = MathUtils.damp(t.rotation.x, -pitch, 8, dt);
      t.rotation.z = MathUtils.damp(t.rotation.z, roll, 8, dt);
    }
  });

  return (
    <group ref={root} raycast={() => null}>
      {/* เงา blob อยู่ในกลุ่มที่เอียงตามเนินด้วย จะได้แนบพื้นลาดไม่จมหรือลอย */}
      <group ref={tilt}>
        <group scale={CAT_SCALE}>
          <CatModel />
        </group>
        <mesh rotation-x={-Math.PI / 2} position-y={0.03} raycast={() => null}>
          <planeGeometry args={[0.9 * CAT_SCALE, 1.15 * CAT_SCALE]} />
          <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0.45} color="#0b2a10" />
        </mesh>
      </group>
    </group>
  );
}

// ยืนนิ่งเกิน SIT_AFTER วินาทีจะนั่ง แล้วระหว่างนั่งเลียอุ้งเท้า LICK_FOR วินาที ทุก LICK_EVERY วินาที
const SIT_AFTER = 5;
const LICK_START = 4;
const LICK_EVERY = 9;
const LICK_FOR = 3.2;
function idleAction(seconds: number): CatAction {
  if (seconds < SIT_AFTER) return "idle";
  const sat = seconds - SIT_AFTER - LICK_START;
  return sat > 0 && sat % LICK_EVERY < LICK_FOR ? "lick" : "sit";
}

// เงาแบบ blob: วงกลมไล่จาง วาดครั้งเดียวด้วย canvas
function createBlobTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}
