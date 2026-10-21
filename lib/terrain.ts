import { Vector3 } from "three";

/*
 * เนินทุ่งหญ้า: ความสูงของพื้นที่ตำแหน่ง (x, z)
 * ใช้สูตรเดียวกันทั้งฝั่ง JS (แมว สถานี รอยเท้า พื้นที่คลิกได้) และใน shader หญ้า (TERRAIN_GLSL)
 * ถ้าแก้ตัวเลข ต้องแก้ทั้งสองที่ให้ตรงกัน ไม่งั้นหญ้าจะลอยหรือจมจากพื้น
 *
 * ผสมคลื่น sin หลายทิศที่ไม่ขนานกัน ได้เนินลูกคลื่นนุ่ม ๆ สูงต่ำราว ±1.5 ม. ห่างกันราว 25–40 ม.
 * ใช้ sin แทน noise เพราะคำนวณใน JS กับ GLSL ได้ตรงกันเป๊ะ และถูกพอจะคำนวณต่อ vertex ของหญ้า
 */

export const HILL_HEIGHT = 1.4;
// รอบจุดเกิดราบไว้: ฉาก intro กล้องอยู่ต่ำระดับสายตาแมว ถ้าพื้นเนินขึ้นกล้องจะจมดิน
export const FLAT_CENTER = { x: 0, z: 3 };
const FLAT_INNER = 3;
const FLAT_OUTER = 11;

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function heightAt(x: number, z: number) {
  const raw =
    0.55 * Math.sin(0.11 * x + 0.6) * Math.cos(0.09 * z - 0.4) +
    0.35 * Math.sin(0.07 * x - 0.05 * z + 1.3) +
    0.18 * Math.sin(0.23 * x + 0.19 * z + 2.1);
  const flat = smoothstep(FLAT_INNER, FLAT_OUTER, Math.hypot(x - FLAT_CENTER.x, z - FLAT_CENTER.z));
  return raw * HILL_HEIGHT * flat;
}

// normal ของพื้น (จากความชัน) ใช้เอียงรอยเท้า/เงาใต้แมวให้แนบเนิน
const EPS = 0.25;
export function normalAt(x: number, z: number, out = new Vector3()) {
  const dx = heightAt(x + EPS, z) - heightAt(x - EPS, z);
  const dz = heightAt(x, z + EPS) - heightAt(x, z - EPS);
  return out.set(-dx, 2 * EPS, -dz).normalize();
}

export const TERRAIN_GLSL = /* glsl */ `
  float terrainHeight(vec2 p) {
    float raw =
      0.55 * sin(0.11 * p.x + 0.6) * cos(0.09 * p.y - 0.4) +
      0.35 * sin(0.07 * p.x - 0.05 * p.y + 1.3) +
      0.18 * sin(0.23 * p.x + 0.19 * p.y + 2.1);
    // ห้ามตั้งชื่อ flat — เป็นคำสงวนของ GLSL 3.0
    float flatten = smoothstep(${FLAT_INNER.toFixed(1)}, ${FLAT_OUTER.toFixed(1)},
      length(p - vec2(${FLAT_CENTER.x.toFixed(1)}, ${FLAT_CENTER.z.toFixed(1)})));
    return raw * ${HILL_HEIGHT.toFixed(2)} * flatten;
  }
  // แสงตามความชันของเนิน: ด้านที่หันเข้าแดดสว่างขึ้น ด้านหลังเนินมืดลง พื้นราบ = 1 (เท่าเดิม)
  // มุมกล้องมองลงจากสูง ถ้าไม่มีแสงตามความชัน เนินจะแทบมองไม่ออก
  float terrainShade(vec3 n, vec3 sunDir) {
    return clamp(1.0 + 1.1 * (dot(n, sunDir) - sunDir.y), 0.72, 1.3);
  }
`;
